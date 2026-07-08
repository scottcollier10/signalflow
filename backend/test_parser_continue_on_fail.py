"""
Test parser handling of continue-on-fail node errors.

Modern n8n (1.x) only writes a top-level `error` into a run's taskData when
the node fails the whole execution. Nodes configured with onError:
'continueRegularOutput' / 'continueErrorOutput' (or legacy continueOnFail)
instead emit an output item shaped {"json": {"error": <message>}} and the run
reports executionStatus 'success'. Without handling that shape, executions
fetched from n8n can carry at most ONE error event, so multi-error rules
(e.g. repeated timeouts on one node) can never fire on real data.

Verifies:
1. A run whose only output item is {"error": <string>} produces an ERROR
   event with that message.
2. Multiple loop runs of one node produce one ERROR event per errored run,
   alongside FINISHED events for the clean runs.
3. Items that merely CONTAIN an 'error' key among other data keys are NOT
   treated as errors (no false positives on real API payloads).
4. Continue-on-fail errors do not flip the overall execution status: the
   execution still parses as 'success'.
5. Top-level taskData errors still work and are not double-counted.

Run: venv/bin/python test_parser_continue_on_fail.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from normalizer.parser import N8nExecutionParser
from normalizer.models import EventType, EventStatus

BASE_TIME = 1720000000000  # ms epoch


def run_entry(offset_ms, execution_time, items=None, error=None):
    """Build a runData entry in the shape n8n 1.x returns."""
    entry = {
        "startTime": BASE_TIME + offset_ms,
        "executionTime": execution_time,
        "executionStatus": "error" if error else "success",
        "source": [],
    }
    if error is not None:
        entry["error"] = error
    else:
        entry["data"] = {"main": [items if items is not None else [{"json": {"ok": True}}]]}
    return entry


def build_execution(run_data, finished=True):
    return {
        "id": "9001",
        "workflowId": "wf-continue-on-fail",
        "startedAt": "2026-07-08T12:00:00.000Z",
        "stoppedAt": "2026-07-08T12:00:30.000Z",
        "finished": finished,
        "mode": "webhook",
        "data": {"resultData": {"runData": run_data}},
    }


def err_item(msg):
    return {"json": {"error": msg}, "pairedItem": {"item": 0}}


def events_for(normalized, node_id):
    return [e for e in normalized.events if e.node_id == node_id]


def test_single_continue_on_fail_error():
    """One run, output item {'error': msg} -> one ERROR event with the message."""
    print("\n=== Test: single continue-on-fail error becomes ERROR event ===")

    msg = "Request timed out after 30000ms waiting for HubSpot response [line 9]"
    execution = build_execution({
        "Check Sync Timeout": [run_entry(0, 6, items=[err_item(msg)])],
    })

    normalized = N8nExecutionParser(execution).parse()
    errors = [e for e in events_for(normalized, "check_sync_timeout")
              if e.event_type == EventType.ERROR]

    assert len(errors) == 1, f"Expected 1 ERROR event, got {len(errors)}"
    assert errors[0].error_message == msg, errors[0].error_message
    assert errors[0].status == EventStatus.ERROR
    print(f"✅ ERROR event emitted with message: {errors[0].error_message[:50]}...")


def test_loop_runs_produce_error_per_errored_run():
    """5 loop runs, 3 with error items -> 3 ERROR + 2 FINISHED events."""
    print("\n=== Test: loop runs -> one ERROR event per errored run ===")

    runs = [
        run_entry(0, 5, items=[err_item("Connection timed out contacting api.hubapi.com")]),
        run_entry(100, 5),
        run_entry(200, 5, items=[err_item("Sync operation timed out: upstream gateway timeout")]),
        run_entry(300, 5),
        run_entry(400, 5, items=[err_item("ETIMEDOUT: socket timed out after 30s")]),
    ]
    execution = build_execution({"Check Sync Timeout": runs})

    normalized = N8nExecutionParser(execution).parse()
    node_events = events_for(normalized, "check_sync_timeout")
    errors = [e for e in node_events if e.event_type == EventType.ERROR]
    finished = [e for e in node_events if e.event_type == EventType.FINISHED]

    assert len(errors) == 3, f"Expected 3 ERROR events, got {len(errors)}"
    assert len(finished) == 2, f"Expected 2 FINISHED events, got {len(finished)}"
    messages = {e.error_message for e in errors}
    assert all("timed out" in m.lower() for m in messages), messages
    print(f"✅ 3 ERROR + 2 FINISHED events; distinct messages preserved")


def test_no_false_positive_on_data_with_error_key():
    """Items with 'error' among other keys are normal data, not errors."""
    print("\n=== Test: no false positive on payloads containing an 'error' key ===")

    items = [
        {"json": {"error": "none", "id": 42, "status": "ok"}},  # API payload
        {"json": {"error": None}},                               # null error field
    ]
    execution = build_execution({
        "Fetch API Status": [run_entry(0, 120, items=items)],
    })

    normalized = N8nExecutionParser(execution).parse()
    node_events = events_for(normalized, "fetch_api_status")
    errors = [e for e in node_events if e.event_type == EventType.ERROR]

    assert not errors, f"False positive: {[e.error_message for e in errors]}"
    assert any(e.event_type == EventType.FINISHED for e in node_events)
    print("✅ Payloads with incidental 'error' keys stay FINISHED")


def test_execution_status_stays_success():
    """Continue-on-fail errors must not flip execution status to 'error'."""
    print("\n=== Test: execution status remains 'success' ===")

    execution = build_execution({
        "Check Sync Timeout": [run_entry(0, 6, items=[err_item("timed out")])],
        "Rate Limit Delay": [run_entry(100, 500)],
    })

    normalized = N8nExecutionParser(execution).parse()
    assert normalized.status == "success", normalized.status
    print(f"✅ Execution status: {normalized.status}")


def test_top_level_error_not_double_counted():
    """A run with taskData.error yields exactly one ERROR event (no dupes)."""
    print("\n=== Test: top-level taskData error still works, once ===")

    execution = build_execution({
        "HubSpot: Fetch Contacts": [
            run_entry(0, 30000, error={"message": "The service is receiving too many requests from you (429)"}),
        ],
    })

    normalized = N8nExecutionParser(execution).parse()
    errors = [e for e in events_for(normalized, "hubspot:_fetch_contacts")
              if e.event_type == EventType.ERROR]

    assert len(errors) == 1, f"Expected exactly 1 ERROR event, got {len(errors)}"
    assert "429" in errors[0].error_message
    assert normalized.status == "error", normalized.status
    print("✅ Single ERROR event; execution status 'error'")


def main():
    tests = [
        test_single_continue_on_fail_error,
        test_loop_runs_produce_error_per_errored_run,
        test_no_false_positive_on_data_with_error_key,
        test_execution_status_stays_success,
        test_top_level_error_not_double_counted,
    ]

    print("=" * 60)
    print("PARSER CONTINUE-ON-FAIL ERROR TESTS")
    print("=" * 60)

    failed = 0
    for test in tests:
        try:
            test()
        except AssertionError as e:
            failed += 1
            print(f"❌ {test.__name__}: {e}")
        except Exception as e:
            failed += 1
            print(f"❌ {test.__name__} errored: {type(e).__name__}: {e}")

    print("\n" + "=" * 60)
    if failed:
        print(f"❌ {failed}/{len(tests)} tests failed")
    else:
        print(f"✅ All {len(tests)} tests passed")
    print("=" * 60)
    return failed == 0


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
