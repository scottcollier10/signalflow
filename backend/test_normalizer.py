"""
Test the n8n execution normalizer (parser).

Parses the committed fixture at fixtures/n8n_execution_sample.json (a 7-node
n8n export: Webhook, Supabase, HTTP, Code, IF, Claude, Response) and asserts
the normalized output. The old fixture (test_execution.json at repo root) was
deleted in the repo cleanup and its name is .gitignore'd, so this uses a
committed fixture instead.

Run: venv/bin/python test_normalizer.py
"""

import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from normalizer.parser import N8nExecutionParser
from normalizer.models import EventType

FIXTURE = Path(__file__).parent / "fixtures" / "n8n_execution_sample.json"

EXPECTED_NODES = 7  # Webhook, Supabase, HTTP, Code, IF, Claude, Response
EXPECTED_EVENTS = EXPECTED_NODES * 2  # Each node has STARTED and FINISHED


def test_parser():
    """Test the parser with the sample execution fixture."""

    with open(FIXTURE, 'r') as f:
        execution_json = json.load(f)

    print("=" * 60)
    print("Testing N8n Execution Parser")
    print("=" * 60)

    parser = N8nExecutionParser(execution_json)
    normalized = parser.parse()

    assert normalized.n8n_execution_id == "1042", normalized.n8n_execution_id
    assert normalized.n8n_workflow_id == "wf-lead-enrichment", normalized.n8n_workflow_id
    assert normalized.status == "success", normalized.status
    assert normalized.duration_ms == 3500, normalized.duration_ms
    assert normalized.trigger_mode == "webhook", normalized.trigger_mode

    print(f"\n✓ n8n Execution ID: {normalized.n8n_execution_id}")
    print(f"✓ n8n Workflow ID: {normalized.n8n_workflow_id}")
    print(f"✓ Status: {normalized.status}")
    print(f"✓ Duration: {normalized.duration_ms}ms")
    print(f"✓ Trigger mode: {normalized.trigger_mode}")
    print(f"✓ Event count: {len(normalized.events)}")

    print("\n" + "=" * 60)
    print("Event Stream (in order)")
    print("=" * 60)

    for event in normalized.events:
        status_emoji = "✓" if event.event_type == EventType.FINISHED else "▶"
        duration = f"{event.duration_ms}ms" if event.duration_ms else "N/A"

        print(f"{status_emoji} {event.sequence_order:2d} | {event.timestamp.strftime('%H:%M:%S.%f')[:-3]} | "
              f"{event.event_type.value:8s} | {event.node_id:25s} | {duration:8s}")

    print("\n" + "=" * 60)
    print("Validation")
    print("=" * 60)

    actual_events = len(normalized.events)
    assert actual_events == EXPECTED_EVENTS, (
        f"Event count mismatch: expected {EXPECTED_EVENTS}, got {actual_events}"
    )
    print(f"✓ Event count matches: {actual_events} events")

    # Sequence ordering is contiguous starting at 0
    bad_sequence = [
        (i, normalized.events[i].sequence_order)
        for i in range(len(normalized.events))
        if normalized.events[i].sequence_order != i
    ]
    assert not bad_sequence, f"Sequence ordering has gaps or duplicates: {bad_sequence}"
    print("✓ Sequence ordering is correct")

    # Timestamps are chronological
    out_of_order = [
        i for i in range(len(normalized.events) - 1)
        if normalized.events[i].timestamp > normalized.events[i + 1].timestamp
    ]
    assert not out_of_order, f"Timestamps out of order at indices: {out_of_order}"
    print("✓ Timestamps are in chronological order")

    # Node names normalized to lowercase underscore ids
    node_ids = {e.node_id for e in normalized.events}
    expected_ids = {
        "webhook", "supabase_get_config", "http_request", "code",
        "if", "claude_ai_generate", "respond_to_webhook",
    }
    assert node_ids == expected_ids, f"Unexpected node ids: {node_ids ^ expected_ids}"
    print("✓ Node ids normalized correctly")

    print("\n" + "=" * 60)
    print("SUCCESS - Parser works correctly!")
    print("=" * 60)

    return normalized


if __name__ == "__main__":
    try:
        normalized = test_parser()

        # Print JSON structure for inspection
        print("\n\nSample event JSON structure:")
        print("-" * 60)
        print(json.dumps(normalized.events[0].dict(), indent=2, default=str))

    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
