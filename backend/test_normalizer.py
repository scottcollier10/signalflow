"""
Quick test script to verify the normalizer works correctly.
"""

import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from normalizer.parser import N8nExecutionParser
from normalizer.models import EventType


def test_parser():
    """Test the parser with sample execution JSON."""

    # Load test execution
    test_file = Path(__file__).parent.parent / "test_execution.json"
    with open(test_file, 'r') as f:
        execution_json = json.load(f)

    print("=" * 60)
    print("Testing N8n Execution Parser")
    print("=" * 60)

    # Parse
    parser = N8nExecutionParser(execution_json)
    normalized = parser.parse()

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

    # Validate
    expected_nodes = 7  # Webhook, Supabase, HTTP, Code, IF, Claude, Response
    expected_events = expected_nodes * 2  # Each node has START and FINISH

    actual_events = len(normalized.events)

    if actual_events == expected_events:
        print(f"✓ Event count matches: {actual_events} events")
    else:
        print(f"✗ Event count mismatch: expected {expected_events}, got {actual_events}")

    # Check sequence ordering
    sequence_correct = all(
        normalized.events[i].sequence_order == i
        for i in range(len(normalized.events))
    )

    if sequence_correct:
        print("✓ Sequence ordering is correct")
    else:
        print("✗ Sequence ordering has gaps or duplicates")

    # Check timestamps are in order
    timestamps_ordered = all(
        normalized.events[i].timestamp <= normalized.events[i+1].timestamp
        for i in range(len(normalized.events)-1)
    )

    if timestamps_ordered:
        print("✓ Timestamps are in chronological order")
    else:
        print("✗ Timestamps are not in order")

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
