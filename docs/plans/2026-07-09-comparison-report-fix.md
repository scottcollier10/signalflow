# Comparison Report Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the execution comparison report honest — timing jitter can no longer flip the verdict to a warning, improvements rank by time saved instead of percentage, removed nodes are labeled as removals, and the recommendations count (31 → 9, the strongest demo stat) actually appears.

**Architecture:** All classification logic lives in `backend/src/analysis/comparison.py` (`ComparisonAnalyzer`), which is pure-ish Python over a Supabase client — ideal for the repo's standalone-script TDD pattern with a `FakeSupabase` that encodes the real schema. The `/api/compare` endpoint in `backend/src/main.py` gains recommendation counts (generated on the fly, since recommendations are never persisted — the `recommendations` table has no `execution_id` column, which is why the current count is a silent 0). `frontend/app/comparison/page.tsx` gets rendering fixes that consume the new fields.

**Tech Stack:** Python (FastAPI backend), standalone test scripts with real exit codes (repo convention — see `backend/test_bottleneck_node_metadata.py` for the FakeSupabase pattern), Next.js/TypeScript frontend verified via `tsc --noEmit` + lint.

**Branch:** Work directly on `main` (established project convention, single-user portfolio repo). Backend server is Scott's `uvicorn --reload` on port 8001 — it hot-reloads, don't restart it.

**Design decisions (agreed in audit):**

1. **Noise gate:** a node only counts as *worsened* if it is both >10% slower AND at least `max(250ms, 1% of the before-execution's total duration)` slower in absolute terms. Below that it's run-to-run jitter.
2. **Persisting floor:** a node only counts as a *persisting issue* if its after-duration is ≥ 500ms. Marginal nodes (e.g. 408ms → 406ms) go to a new quiet `unchanged` bucket.
3. **Ranking:** improvements sort by absolute `time_saved_ms`, not percentage. Removed nodes get `removed: true` and time_saved = their full before-duration.
4. **Verdict:** with the noise gate in place the existing tree mostly self-corrects; add one early rule — ≥50% overall improvement with zero (gated) worsened nodes and zero SEVERE after → `excellent`.
5. **Recommendations count:** endpoint generates recommendations for both executions and passes counts into `compare()`. On failure the count is `None` (frontend hides the row) — never a silent 0. The broken `recommendations`-table query is deleted.
6. **Frontend:** improvement stat is green when positive (decoupled from verdict color), no down-arrow emoji on the improvement number, removed nodes labeled "Node removed — reclaimed Xs", Top/Minor split by ≥500ms saved, data-driven icons on the before/after cards, "Nodes" relabeled "Nodes Executed", muted collapsible "Unchanged" section.

---

### Task 1: Backend test file — noise gate, persisting floor, unchanged bucket (RED)

**Files:**
- Create: `backend/test_comparison_logic.py`

**Step 1: Write the failing tests**

Create `backend/test_comparison_logic.py`. The FakeTable here MUST filter on `eq()` (unlike the one in `test_bottleneck_node_metadata.py`) because the analyzer loads two different executions from the same tables.

```python
"""
Test ComparisonAnalyzer classification logic.

The comparison report was misleading: two nodes of timing jitter
(+78ms, +32ms on a run that saved 30s) flipped the verdict to
"investigate trade-offs"; improvements ranked by percentage so all
removed nodes tied at 100% and a 272ms node outranked a 13.7s win;
sub-500ms nodes showed as "Persisting Issues"; and the recommendation
count silently read 0 because the recommendations table has no
execution_id column.

Verifies:
1. Noise gate: a node >10% slower but below max(250ms, 1% of total)
   absolute delta is NOT worsened — it lands in the new 'unchanged'
   bucket, and the verdict is not dragged to "concerns".
2. Persisting floor: a still-slow node (>=500ms after) persists; a
   marginal node (408ms -> 406ms) is 'unchanged', not a persisting issue.
3. Ranking: top_improvements sorts by absolute time_saved_ms, so a
   removed 13.7s node outranks a removed 272ms node.
4. Removed nodes carry removed=True and time_saved_ms = before duration.
5. A material regression (+3s, -150%) IS worsened and the verdict
   flags concerns.
6. Recommendation counts are passed through (rec_count_a/b), defaulting
   to None — never a fabricated 0.
7. Verdict is 'excellent' when >=50% faster, no worsened, no SEVERE after.

Run: venv/bin/python test_comparison_logic.py
"""

import sys
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).parent))

from src.analysis.comparison import ComparisonAnalyzer

EXEC_A = "exec-a"
EXEC_B = "exec-b"
WORKFLOW_ID = "wf-1"


class FakeTable:
    """Filters on eq(), unlike simpler fakes — comparison loads 2 executions."""

    def __init__(self, rows):
        self._rows = rows
        self._filters = []

    def select(self, *args):
        return self

    def eq(self, column, value):
        self._filters.append((column, value))
        return self

    def execute(self):
        rows = [
            r for r in self._rows
            if all(r.get(col) == val for col, val in self._filters)
        ]
        self._filters = []
        return Mock(data=rows)


class FakeSupabase:
    def __init__(self, tables):
        self._tables = tables

    def table(self, name):
        return FakeTable(self._tables.get(name, []))


def node_stat(execution_id, node_id, name, score, duration, on_cp=False):
    return {
        "execution_id": execution_id,
        "node_id": node_id,
        "node_name": name,
        "node_type": "httpRequest",
        "bottleneck_score": score,
        "total_duration_ms": duration,
        "is_on_critical_path": on_cp,
    }


def build_db(after_stats):
    """Before execution is fixed; after varies per test."""
    before_stats = [
        # The real WF3 shape: two huge wins, one marginal node that gets
        # removed, two jitter-level nodes, one genuinely persisting node.
        node_stat(EXEC_A, "legacy", "Legacy Export API", 90, 10000, True),
        node_stat(EXEC_A, "claude", "Claude: Enrich Section", 82, 13700, True),
        node_stat(EXEC_A, "submit", "Submit Render Job", 50, 272),
        node_stat(EXEC_A, "publish", "Publish To CMS", 55, 349),
        node_stat(EXEC_A, "transform", "Transform Legacy Payload", 52, 408),
        node_stat(EXEC_A, "brand", "Fetch Brand Assets", 60, 1300),
    ]
    return FakeSupabase({
        "executions": [
            {"id": EXEC_A, "workflow_id": WORKFLOW_ID, "n8n_execution_id": "13781",
             "started_at": "2026-07-08T10:00:00Z", "duration_ms": 40000, "status": "success"},
            {"id": EXEC_B, "workflow_id": WORKFLOW_ID, "n8n_execution_id": "13793",
             "started_at": "2026-07-08T11:00:00Z", "duration_ms": 13000, "status": "success"},
        ],
        "node_stats": before_stats + after_stats,
        "critical_paths": [
            {"execution_id": EXEC_A, "path_nodes": ["legacy", "claude"], "total_duration_ms": 40000},
            {"execution_id": EXEC_B, "path_nodes": ["publish"], "total_duration_ms": 13000},
        ],
    })


def optimized_after_stats():
    """legacy/claude/submit removed; publish +78ms jitter; transform -2ms;
    brand unchanged at 1.3s."""
    return [
        node_stat(EXEC_B, "publish", "Publish To CMS", 40, 427),
        node_stat(EXEC_B, "transform", "Transform Legacy Payload", 50, 406),
        node_stat(EXEC_B, "brand", "Fetch Brand Assets", 60, 1300),
    ]


def test_noise_gate_and_unchanged_bucket():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))
    result = analyzer.compare(EXEC_A, EXEC_B)

    worsened_ids = [i["node_id"] for i in result["worsened"]["items"]]
    assert worsened_ids == [], f"jitter nodes must not be worsened, got {worsened_ids}"

    unchanged_ids = sorted(i["node_id"] for i in result["unchanged"]["items"])
    assert "publish" in unchanged_ids, f"publish (+78ms) should be unchanged, got {unchanged_ids}"
    assert "transform" in unchanged_ids, f"transform (-2ms) should be unchanged, got {unchanged_ids}"

    assert result["delta"]["bottlenecks_worsened"] == 0
    print("PASS: noise gate + unchanged bucket")


def test_persisting_floor():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))
    result = analyzer.compare(EXEC_A, EXEC_B)

    persisting_ids = [i["node_id"] for i in result["persisting"]["items"]]
    assert persisting_ids == ["brand"], (
        f"only brand (1.3s) should persist, got {persisting_ids}"
    )
    print("PASS: persisting floor")


def test_ranking_by_time_saved():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))
    result = analyzer.compare(EXEC_A, EXEC_B)

    top = result["top_improvements"]
    top_ids = [i["node_id"] for i in top]
    assert top_ids[0] == "claude", f"claude saved 13.7s, must rank #1, got {top_ids}"
    assert top_ids[1] == "legacy", f"legacy saved 10s, must rank #2, got {top_ids}"
    assert top_ids.index("submit") > top_ids.index("legacy"), (
        f"submit saved only 272ms, must rank below legacy: {top_ids}"
    )
    for item in top:
        assert "time_saved_ms" in item, f"missing time_saved_ms: {item}"
    print("PASS: ranking by time saved")


def test_removed_nodes_labeled():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))
    result = analyzer.compare(EXEC_A, EXEC_B)

    removed = {i["node_id"]: i for i in result["resolved"]["items"] if i.get("removed")}
    assert set(removed) == {"legacy", "claude", "submit"}, f"got {set(removed)}"
    assert removed["claude"]["time_saved_ms"] == 13700
    print("PASS: removed nodes labeled")


def test_material_regression_still_flags():
    after = optimized_after_stats() + [
        node_stat(EXEC_B, "cms2", "New CMS Sync", 70, 5000),
    ]
    # give cms2 a slow before-state so it's a before-bottleneck that worsened
    db = build_db(after)
    db._tables["node_stats"].append(
        node_stat(EXEC_A, "cms2", "New CMS Sync", 60, 2000)
    )
    analyzer = ComparisonAnalyzer(db)
    result = analyzer.compare(EXEC_A, EXEC_B)

    worsened_ids = [i["node_id"] for i in result["worsened"]["items"]]
    assert worsened_ids == ["cms2"], f"+3s regression must be worsened, got {worsened_ids}"
    assert "concern" in result["delta"]["verdict"] or "mixed" in result["delta"]["verdict"] or \
        "regression" in result["delta"]["verdict"], (
        f"verdict must flag the regression, got {result['delta']['verdict']}"
    )
    print("PASS: material regression still flags")


def test_recommendation_counts_passed_through():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))

    result = analyzer.compare(EXEC_A, EXEC_B, rec_count_a=31, rec_count_b=9)
    assert result["before"]["recommendations"] == 31
    assert result["after"]["recommendations"] == 9

    result_default = analyzer.compare(EXEC_A, EXEC_B)
    assert result_default["before"]["recommendations"] is None, (
        "unknown rec count must be None, never a fabricated 0"
    )
    print("PASS: recommendation counts passed through")


def test_verdict_excellent_for_big_clean_win():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))
    result = analyzer.compare(EXEC_A, EXEC_B)

    # 27s saved on 40s = 67.5% faster, zero worsened, zero SEVERE after
    assert result["delta"]["verdict"] == "excellent", (
        f"expected excellent, got {result['delta']['verdict']}: "
        f"{result['delta']['verdict_message']}"
    )
    print("PASS: verdict excellent for big clean win")


if __name__ == "__main__":
    failures = 0
    for test in [
        test_noise_gate_and_unchanged_bucket,
        test_persisting_floor,
        test_ranking_by_time_saved,
        test_removed_nodes_labeled,
        test_material_regression_still_flags,
        test_recommendation_counts_passed_through,
        test_verdict_excellent_for_big_clean_win,
    ]:
        try:
            test()
        except AssertionError as e:
            failures += 1
            print(f"FAIL: {test.__name__}: {e}")
        except Exception as e:
            failures += 1
            print(f"ERROR: {test.__name__}: {type(e).__name__}: {e}")
    sys.exit(1 if failures else 0)
```

**Step 2: Run to verify it fails**

Run: `cd backend && venv/bin/python test_comparison_logic.py`

Expected: FAILs/ERRORs — `unchanged` key missing (KeyError), worsened contains publish, top ranked by pct, `rec_count_a` unexpected kwarg (TypeError), verdict is `good_improvement_with_concerns`. All 7 should fail. If any test PASSES here, stop — it isn't testing the change.

**Step 3: Commit the red tests** (repo convention: tests land with the fix; keep the red file staged but commit together with Task 2's implementation instead — do NOT commit here, just proceed.)

---

### Task 2: Implement classification changes in comparison.py (GREEN)

**Files:**
- Modify: `backend/src/analysis/comparison.py`

**Step 1: Add module constants and noise-floor helper** (below `get_severity_with_absolute_threshold`, ~line 70):

```python
# A node-level slowdown below this absolute delta is run-to-run jitter,
# never a regression. Scaled with execution size: max(250ms, 1% of total).
NOISE_FLOOR_MS = 250

# A node must still take at least this long to count as a persisting issue.
PERSISTING_FLOOR_MS = 500


def get_noise_floor_ms(total_duration_ms: int) -> float:
    return max(NOISE_FLOOR_MS, total_duration_ms * 0.01)
```

**Step 2: Rework the classification loop** in `compare()` (lines ~103-197). Add `unchanged = []` alongside the other buckets, compute the floor once, and replace the loop body:

```python
        resolved = []
        improved = []
        persisting = []
        worsened = []
        unchanged = []
        new_bottlenecks = []

        noise_floor = get_noise_floor_ms(exec_a.duration_ms)
```

Removed-node branch gains the two new fields:

```python
            if after_node is None:
                # Node removed entirely
                resolved.append({
                    "node_id": node_id,
                    "node_name": before_node['name'],
                    "reason": "Node removed from workflow",
                    "before_duration": before_node['duration_ms'],
                    "after_duration": 0,
                    "before_score": before_node['score'],
                    "after_score": 0,
                    "improvement_pct": 100.0,
                    "time_saved_ms": before_node['duration_ms'],
                    "removed": True,
                    "impact": "Node removed"
                })
                continue
```

Classification thresholds block becomes:

```python
            before_dur = before_node['duration_ms']
            after_dur = after_node['duration_ms']
            time_saved = before_dur - after_dur

            improvement_pct = ((before_dur - after_dur) / before_dur * 100) if before_dur > 0 else 0

            # Classification:
            # - RESOLVED: >=50% improvement OR now <100ms absolute
            # - IMPROVED: 25-49% improvement
            # - WORSENED: >10% slower AND slower by at least the noise floor
            # - PERSISTING: still >=500ms after (a real remaining issue)
            # - UNCHANGED: everything else (jitter-level movement)

            now_fast = after_dur < 100
            is_resolved = improvement_pct >= 50 or now_fast
            is_improved = 25 <= improvement_pct < 50
            is_worsened = improvement_pct < -10 and (after_dur - before_dur) >= noise_floor
```

`resolved` and `improved` appends each gain `"time_saved_ms": time_saved`. The final `else` becomes:

```python
            else:
                entry = {
                    "node_id": node_id,
                    "node_name": before_node['name'],
                    "before_duration": before_dur,
                    "after_duration": after_dur,
                    "before_score": before_node['score'],
                    "after_score": after_node['score'],
                    "improvement_pct": round(improvement_pct, 2),
                }
                if after_dur >= PERSISTING_FLOOR_MS:
                    entry["note"] = self._get_persisting_note(before_node, after_node)
                    persisting.append(entry)
                else:
                    entry["note"] = "Within run-to-run variance"
                    unchanged.append(entry)
```

**Step 3: Rank top_improvements by time saved** (~line 237):

```python
        all_improvements = resolved + improved
        top_improvements = sorted(
            all_improvements,
            key=lambda x: x.get('time_saved_ms', 0),
            reverse=True
        )[:5]
```

**Step 4: Recommendation count pass-through.** Change the signature:

```python
    def compare(self, execution_id_a: str, execution_id_b: str,
                rec_count_a: Optional[int] = None,
                rec_count_b: Optional[int] = None) -> Dict[str, Any]:
```

In the return dict use `"recommendations": rec_count_a` (before) and `rec_count_b` (after). **Delete** the broken rec-count query in `_load_execution_analysis` (lines ~402-410, the `rec_count = 0 / try / except Exception: pass` block) and the `recommendation_count=rec_count` snapshot field usage — remove `recommendation_count` from `ExecutionSnapshot` entirely (nothing else reads it).

**Step 5: Add `unchanged` to the response** (next to `persisting`):

```python
            "unchanged": {
                "count": len(unchanged),
                "items": unchanged
            },
```

**Step 6: Verdict — add the early excellent rule** in `_generate_verdict`, immediately after the `has_concerns` block (~line 544):

```python
        # Big clean win: majority of runtime eliminated with no material
        # regressions and nothing severe left.
        if overall_pct_improvement >= 50 and worsened_count == 0 and after["SEVERE"] == 0:
            return {
                "status": "excellent",
                "message": (
                    f"{overall_pct_improvement:.1f}% faster overall — "
                    f"{resolved_count} bottleneck(s) resolved"
                )
            }
```

**Step 7: Run tests**

Run: `cd backend && venv/bin/python test_comparison_logic.py`
Expected: all 7 PASS, exit 0.

**Step 8: Regression check** — run the existing suite headline scripts that import shared modules:

Run: `cd backend && venv/bin/python test_recommendations.py && venv/bin/python test_bottleneck_node_metadata.py`
Expected: PASS (they don't touch comparison, but cheap insurance).

**Step 9: Commit**

```bash
git add backend/test_comparison_logic.py backend/src/analysis/comparison.py
git commit -m "fix: Comparison verdict no longer hijacked by timing jitter

Noise gate for worsened (>10% AND max(250ms, 1% of total) absolute),
500ms persisting floor with new 'unchanged' bucket, improvements ranked
by absolute time saved, removed nodes labeled, rec counts passed through
instead of a silently-failing query against a nonexistent column."
```

---

### Task 3: Wire recommendation counts into /api/compare (endpoint)

**Files:**
- Modify: `backend/src/main.py:1233-1237` (the `/api/compare` handler body)

**Step 1: Add a count helper + wire it in.** Replace the two-line analyzer call:

```python
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_key)

        async def _rec_count(execution_id: str):
            """Recommendations are generated, never persisted — compute live.
            Returns None on failure so the UI hides the stat instead of lying with 0."""
            try:
                row = supabase.table('executions').select('workflow_id').eq(
                    'id', execution_id).execute()
                if not row.data:
                    return None
                engine = RecommendationEngine(supabase)
                result = await engine.generate_recommendations(
                    execution_id, row.data[0]['workflow_id'])
                return len(result.get('data', {}).get('recommendations', []))
            except Exception:
                logger.exception("Failed to count recommendations for %s", execution_id)
                return None

        rec_a = await _rec_count(exec_a)
        rec_b = await _rec_count(exec_b)

        analyzer = ComparisonAnalyzer(supabase)
        comparison = analyzer.compare(exec_a, exec_b, rec_count_a=rec_a, rec_count_b=rec_b)
```

(`RecommendationEngine` is already imported at main.py:11; instantiation mirrors main.py:390.)

**Step 2: Verify against the live backend** (Scott's uvicorn hot-reloads):

Run: `curl -s "http://localhost:8001/api/compare?exec_a=9840e068-21e6-4d9f-a8ec-c4dffe32965a&exec_b=2d1dee93-7758-4208-a05a-29ae5b9d65f5" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']['comparison']; print('before recs:', d['before']['recommendations']); print('after recs:', d['after']['recommendations']); print('verdict:', d['delta']['verdict'], '-', d['delta']['verdict_message']); print('worsened:', d['delta']['bottlenecks_worsened']); print('unchanged:', d['unchanged']['count']); print('top:', [(i['node_name'], i.get('time_saved_ms')) for i in d['top_improvements']])"`

Expected: before recs 31, after recs 9, verdict `excellent`, worsened 0, unchanged ≥ 2, top led by Claude: Enrich Section (~13700ms).

**Step 3: Commit**

```bash
git add backend/src/main.py
git commit -m "feat: /api/compare returns live recommendation counts for both executions"
```

---

### Task 4: Frontend rendering fixes

**Files:**
- Modify: `frontend/app/comparison/page.tsx`

No frontend test framework exists in this repo — verification is `tsc --noEmit`, lint, and a visual check.

**Step 1: Types.** In `ImprovementItem` add:

```typescript
  time_saved_ms?: number;
  removed?: boolean;
  note?: string;
```

In `ExecutionSnapshot` change `recommendations: number;` → `recommendations: number | null;`. In `ComparisonData` add `unchanged: { count: number; items: ImprovementItem[] };`.

**Step 2: Sort/split by time saved** (replace lines ~306-311):

```typescript
  const savedMs = (i: ImprovementItem) =>
    i.time_saved_ms ?? (i.before_duration - i.after_duration);
  const allImprovements = [...(resolved?.items || []), ...(improved?.items || [])].sort(
    (a, b) => savedMs(b) - savedMs(a)
  );
  const topImprovements = allImprovements.filter((i) => savedMs(i) >= 500).slice(0, 5);
  const minorImprovements = allImprovements.filter((i) => !topImprovements.includes(i));
```

Destructure `unchanged` from `data` alongside `persisting` (line ~298).

**Step 3: Delta card — green positive stat, no down-arrow** (lines ~470-476). The improvement number gets its own color, decoupled from verdict; drop the `⬇️/⬆️` emoji:

```typescript
              <p className={`text-6xl font-display font-bold ${delta.pct_improvement >= 0 ? 'text-neu-green' : 'text-neu-coral'}`}>
                {formatPct(delta.pct_improvement)}
              </p>
```

(Label line below stays: "Improvement"/"Regression". The verdict badge at line ~509 keeps `verdictStyle`.) Also change the other three delta stats (`Time Saved`, `Resolved`, `Improved`) from `${verdictStyle.text}` to a neutral `text-neu-text` so an orange verdict doesn't repaint good numbers.

**Step 4: Top Improvements rows — honest removal labeling** (lines ~539-564). Replace the right-side stat and add saved time:

```typescript
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-neu-text">{node.node_name}</span>
                      <span className="text-neu-green font-bold text-lg">
                        {node.removed
                          ? `Removed — reclaimed ${formatDuration(node.time_saved_ms ?? node.before_duration)}`
                          : `${formatDuration(node.time_saved_ms ?? (node.before_duration - node.after_duration))} saved (${formatPct(node.improvement_pct)})`}
                      </span>
                    </div>
```

In the before/after row, when `node.removed` render `AFTER —` (em dash, muted) instead of `0ms ✅`.

**Step 5: Minor Improvements rows** (line ~599): replace `-{formatPct(node.improvement_pct)}` with `{formatDuration(savedMs(node))} saved`, and show `Removed` (muted text) instead of `0ms` for removed nodes.

**Step 6: Unchanged section.** After the Persisting section (~line 641), add a muted collapsible mirroring Persisting's structure — heading `➖ Unchanged ({unchanged.count}) — within run-to-run variance`, rows showing `name  before → after` in `text-neu-text-muted`, no warning styling. Render only when `unchanged && unchanged.count > 0`.

**Step 7: Before/After cards — data-driven icons + null-safe recommendations** (lines ~396-458):

- Recommendations rows: render only when `before.recommendations !== null` / `after.recommendations !== null`.
- Icons: replace hardcoded 🔴/⚠️/✅ with value-driven — bottlenecks/recommendations show ✅ when `0`, otherwise no icon on the Before card and no ✅ on the After card unless the value is lower than Before (use a small inline ternary; keep coral text for before, green for after only when `after.x <= before.x`).
- Both cards: label `Nodes` → `Nodes Executed`.

**Step 8: Typecheck + lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: clean (pre-existing warnings unrelated to this file are acceptable if already on main).

**Step 9: Visual check** — load `http://localhost:3001/comparison?exec_a=9840e068-21e6-4d9f-a8ec-c4dffe32965a&exec_b=2d1dee93-7758-4208-a05a-29ae5b9d65f5` (frontend may be on 3000 or 3001 — check which is running). Confirm: green verdict card, "Claude: Enrich Section — Removed — reclaimed 13.7s" is the #1 improvement, Recommendations 31 → 9 on the cards, no Worsened section, Unchanged (2) collapsed and muted.

**Step 10: Commit**

```bash
git add frontend/app/comparison/page.tsx
git commit -m "fix: Comparison UI — rank by time saved, honest removal labels, green positive verdict, live rec counts"
```

---

### Task 5: Wrap-up

**Step 1:** Full backend suite sanity: run the 11 existing `test_*.py` scripts plus `test_comparison_logic.py`; all must exit 0. (pgvector suites need local Supabase running — it is.)

**Step 2:** Update `README.md` Testing section test list to include `test_comparison_logic.py` (12 suites) and bump the tests badge from `11_suites` to `12_suites`.

**Step 3:** Commit docs, report before/after to Scott, ask before pushing.
