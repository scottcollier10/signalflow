"""Optimize SignalFlow Demo #3 in place (V2), applying its own recommendations.

Baseline executions (13781/13782/13784) are already imported into SignalFlow,
and the original definition is preserved in build_wf3.py, so updating the
same n8n workflow keeps Compare Versions working within the workflow group.

Recommendations applied (from execution 456c9ee4, 31 recommendations):
- Rule 31/18 (expensive AI in loop): 6 sequential 'Claude: Enrich Section'
  calls -> ONE batched call generating all 6 sections
- Rule 7 (hardcoded delay): 'Rate Limit Wait' 5s -> removed
- Rule 5 (sync waits / polling): poll loop (Poll + Check + If + Wait 2s x3)
  -> single synchronous render call
- Rule 2/17 ('Legacy Export API' 10s dominates critical path): -> v2
  endpoint with caching (delay/1)
- Rule 1 (sequential API calls): 'Fetch Source Articles' + 'Fetch Trend
  Data' -> one batched research request
"""
import os

WF_NAME = "SignalFlow Demo 3 — Content Pipeline"
WEBHOOK_PATH = "sf-demo-content-pipeline"
CLAUDE_HEADERS = {"parameters": [
    {"name": "anthropic-version", "value": "2023-06-01"},
    {"name": "Content-Type", "value": "application/json"},
]}


def _anthropic_cred():
    return {"httpHeaderAuth": {
        "id": os.environ.get("N8N_ANTHROPIC_CRED_ID", "YOUR_CREDENTIAL_ID"),
        "name": os.environ.get("N8N_ANTHROPIC_CRED_NAME", "anthropic-api-key"),
    }}


def node(name, ntype, tv, params, pos, **extra):
    return {"name": name, "type": ntype, "typeVersion": tv,
            "parameters": params, "position": pos, **extra}


def http(name, url, pos, method="GET", body=None, cred=None, headers=None):
    p = {"url": url, "options": {}}
    if method != "GET":
        p["method"] = method
    if body is not None:
        p.update({"sendBody": True, "specifyBody": "json", "jsonBody": body})
    if headers is not None:
        p.update({"sendHeaders": True, "headerParameters": headers})
    if cred:
        p.update({"authentication": "genericCredentialType",
                  "genericAuthType": "httpHeaderAuth"})
        p["options"] = {"timeout": 60000}
    n = node(name, "n8n-nodes-base.httpRequest", 4.2, p, pos)
    if cred:
        n["credentials"] = cred
    return n


BATCH_PROMPT = """\
const sections = $input.all().map(i => i.json.section);
return [{ json: {
  model: 'claude-sonnet-4-5',
  max_tokens: 350,
  messages: [{
    role: 'user',
    content: `Write exactly one short sentence of marketing copy for EACH section of a product page about an n8n workflow profiler. Return exactly ${sections.length} lines, each formatted as "section-name: sentence" with no other text. Sections in order: ${sections.join(', ')}.`,
  }],
} }];"""

SPLIT_CODE = """\
const text = $json.content?.[0]?.text ?? '';
return text.split('\\n')
  .filter(l => l.includes(':'))
  .map(l => {
    const idx = l.indexOf(':');
    return { json: { section: l.slice(0, idx).trim(), copy: l.slice(idx + 1).trim() } };
  });"""

SEO_PROMPT = """\
return [{ json: {
  model: 'claude-sonnet-4-5',
  max_tokens: 80,
  messages: [{
    role: 'user',
    content: 'Write a 150-character SEO meta description for a tool that profiles n8n workflow executions and finds bottlenecks. Return only the description.',
  }],
} }];"""


def _build_nodes():
    cred = _anthropic_cred()
    return [
        node("Pipeline Webhook", "n8n-nodes-base.webhook", 2,
             {"httpMethod": "POST", "path": WEBHOOK_PATH, "responseMode": "onReceived"},
             [0, 0]),
        node("Load Pipeline Config", "n8n-nodes-base.set", 3.4,
             {"assignments": {"assignments": [
                 {"id": "p1", "name": "pipeline", "type": "string", "value": "product-page"},
                 {"id": "p2", "name": "requested_at", "type": "string", "value": "={{ $now.toISO() }}"},
             ]}},
             [200, 0]),
        # --- branch A: research (was 2 sequential fetches -> 1 batched request) ---
        http("Fetch Research Bundle", "https://httpbin.org/delay/1", [400, -300]),
        node("Parse Research Notes", "n8n-nodes-base.code", 2,
             {"jsCode": "return [{ json: { research: 'parsed', sources: 2 } }];"},
             [600, -300]),
        # --- branch B: assets (unchanged) ---
        http("Fetch Brand Assets", "https://httpbin.org/delay/1", [400, 0]),
        node("Resize Hero Image", "n8n-nodes-base.code", 2,
             {"jsCode": (
                 "const start = Date.now();\n"
                 "let acc = 0;\n"
                 "while (Date.now() - start < 300) { acc += Math.sqrt(acc + 1); }\n"
                 "return [{ json: { asset: 'hero.png', width: 1200, checksum: Math.round(acc) } }];"
             )},
             [600, 0]),
        # --- branch C: export (was delay/10 + 5s wait + polling loop) ---
        http("Legacy Export API v2 (Cached)", "https://httpbin.org/delay/1", [400, 300]),
        node("Transform Legacy Payload", "n8n-nodes-base.code", 2,
             {"jsCode": (
                 "const start = Date.now();\n"
                 "let acc = 0;\n"
                 "while (Date.now() - start < 400) { acc += Math.sqrt(acc + 1); }\n"
                 "return [{ json: { legacy: 'transformed', rows: 1842 } }];"
             )},
             [600, 300]),
        http("Submit Render Job (Sync)", "https://httpbin.org/post", [800, 300],
             method="POST",
             body='={{ JSON.stringify({job: "render", rows: $json.rows, sync: true}) }}'),
        # --- merge ---
        node("Merge Pipeline Inputs", "n8n-nodes-base.merge", 3,
             {"numberInputs": 3},
             [1100, 0]),
        node("Plan Content Sections", "n8n-nodes-base.code", 2,
             {"jsCode": (
                 "const sections = ['intro','background','features','case-study','pricing','conclusion'];\n"
                 "return sections.map(s => ({ json: { section: s } }));"
             )},
             [1300, 0]),
        # --- batched Claude (was a 6-iteration loop of separate calls) ---
        node("Build Batched Claude Request", "n8n-nodes-base.code", 2,
             {"jsCode": BATCH_PROMPT},
             [1500, 0]),
        http("Claude: Enrich All Sections", "https://api.anthropic.com/v1/messages", [1700, 0],
             method="POST", body="={{ JSON.stringify($json) }}",
             cred=cred, headers=CLAUDE_HEADERS),
        node("Split Section Copy", "n8n-nodes-base.code", 2,
             {"jsCode": SPLIT_CODE},
             [1900, 0]),
        # --- assembly (unchanged) ---
        node("Assemble Draft Document", "n8n-nodes-base.code", 2,
             {"jsCode": (
                 "const parts = $input.all().map(i => `## ${i.json.section}\\n${i.json.copy}`);\n"
                 "return [{ json: { draft: parts.join('\\n\\n'), sections: parts.length } }];"
             )},
             [2100, 0]),
        node("Build SEO Request", "n8n-nodes-base.code", 2,
             {"jsCode": SEO_PROMPT},
             [2300, 0]),
        http("Claude: Generate SEO Meta", "https://api.anthropic.com/v1/messages", [2500, 0],
             method="POST", body="={{ JSON.stringify($json) }}",
             cred=cred, headers=CLAUDE_HEADERS),
        node("Format Publish Payload", "n8n-nodes-base.set", 3.4,
             {"assignments": {"assignments": [
                 {"id": "f1", "name": "meta_description", "type": "string",
                  "value": "={{ $json.content?.[0]?.text ?? '' }}"},
                 {"id": "f2", "name": "draft", "type": "string",
                  "value": "={{ $('Assemble Draft Document').item.json.draft }}"},
                 {"id": "f3", "name": "status", "type": "string", "value": "ready_for_review"},
             ]}},
             [2700, 0]),
        http("Publish To CMS", "https://httpbin.org/post", [2900, 0],
             method="POST", body="={{ JSON.stringify($json) }}"),
        http("Archive Pipeline Log", "https://httpbin.org/post", [3100, 0],
             method="POST",
             body='={{ JSON.stringify({pipeline: "product-page", published: true}) }}'),
        node("Notify Editorial Team", "n8n-nodes-base.noOp", 1, {}, [3300, 0]),
    ]


conn = lambda *targets: {"main": [
    [{"node": t, "type": "main", "index": 0}] for t in targets
]}

connections = {
    "Pipeline Webhook": conn("Load Pipeline Config"),
    "Load Pipeline Config": {"main": [[
        {"node": "Fetch Research Bundle", "type": "main", "index": 0},
        {"node": "Fetch Brand Assets", "type": "main", "index": 0},
        {"node": "Legacy Export API v2 (Cached)", "type": "main", "index": 0},
    ]]},
    "Fetch Research Bundle": conn("Parse Research Notes"),
    "Parse Research Notes": {"main": [[{"node": "Merge Pipeline Inputs", "type": "main", "index": 0}]]},
    "Fetch Brand Assets": conn("Resize Hero Image"),
    "Resize Hero Image": {"main": [[{"node": "Merge Pipeline Inputs", "type": "main", "index": 1}]]},
    "Legacy Export API v2 (Cached)": conn("Transform Legacy Payload"),
    "Transform Legacy Payload": conn("Submit Render Job (Sync)"),
    "Submit Render Job (Sync)": {"main": [[{"node": "Merge Pipeline Inputs", "type": "main", "index": 2}]]},
    "Merge Pipeline Inputs": conn("Plan Content Sections"),
    "Plan Content Sections": conn("Build Batched Claude Request"),
    "Build Batched Claude Request": conn("Claude: Enrich All Sections"),
    "Claude: Enrich All Sections": conn("Split Section Copy"),
    "Split Section Copy": conn("Assemble Draft Document"),
    "Assemble Draft Document": conn("Build SEO Request"),
    "Build SEO Request": conn("Claude: Generate SEO Meta"),
    "Claude: Generate SEO Meta": conn("Format Publish Payload"),
    "Format Publish Payload": conn("Publish To CMS"),
    "Publish To CMS": conn("Archive Pipeline Log"),
    "Archive Pipeline Log": conn("Notify Editorial Team"),
}


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Demo 3 V2: Optimized Content Pipeline")
    parser.add_argument("--apply", action="store_true", help="Update the workflow on n8n")
    parser.add_argument("--activate", action="store_true", help="Activate after update (requires --apply)")
    args = parser.parse_args()

    if args.activate and not args.apply:
        parser.error("--activate requires --apply")

    wf_id = os.environ.get("N8N_WF3_ID", "")
    wf_id_hint = f" (update {wf_id})" if wf_id else ""
    print(f"Workflow: {WF_NAME}{wf_id_hint}")
    print(f"  Nodes: 21")
    print(f"  Webhook path: /webhook/{WEBHOOK_PATH}")

    if not args.apply:
        print("\nDry run. Pass --apply to update, --activate to also activate.")
        if not wf_id:
            print("Note: Set N8N_WF3_ID before --apply (workflow ID from build_wf3.py output).")
        return

    if not wf_id:
        raise SystemExit("Set N8N_WF3_ID to the workflow ID to update (from build_wf3.py output).")

    from n8n_api import call
    built_nodes = _build_nodes()
    payload = {
        "name": WF_NAME,
        "nodes": built_nodes,
        "connections": connections,
        "settings": {"executionOrder": "v1", "saveDataSuccessExecution": "all",
                     "saveDataErrorExecution": "all"},
    }
    wf = call("PUT", f"/workflows/{wf_id}", payload)
    print(f"Updated: {wf['id']}  ({wf['name']}, {len(wf['nodes'])} nodes)")

    if args.activate:
        call("POST", f"/workflows/{wf['id']}/activate")
        print(f"Activated. Webhook path: /webhook/{WEBHOOK_PATH}")

    return wf


if __name__ == "__main__":
    main()
