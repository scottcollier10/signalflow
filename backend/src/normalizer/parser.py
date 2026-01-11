"""
Parse n8n execution JSON and convert to normalized event stream.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .models import (
    NormalizedExecution,
    ExecutionEvent,
    EventType,
    EventStatus
)


class N8nExecutionParser:
    """Parse n8n execution JSON into normalized events."""

    def __init__(self, execution_json: Dict[str, Any]):
        self.execution_json = execution_json
        self.workflow_data = execution_json.get("workflowData", {})
        self.run_data = execution_json.get("data", {}).get("resultData", {}).get("runData", {})

    def parse(self) -> NormalizedExecution:
        """Parse execution and return normalized format."""

        # Extract n8n IDs (not UUIDs)
        n8n_execution_id = str(self.execution_json.get("id", "unknown"))
        n8n_workflow_id = str(self.workflow_data.get("id", "unknown"))

        # Extract timing
        started_at = self._parse_timestamp(self.execution_json.get("startedAt"))
        finished_at = self._parse_timestamp(self.execution_json.get("stoppedAt"))

        # Determine status
        status = self._determine_status()

        # Calculate duration
        duration_ms = None
        if started_at and finished_at:
            duration_ms = int((finished_at - started_at).total_seconds() * 1000)

        # Extract trigger mode
        trigger_mode = self.execution_json.get("mode", "unknown")

        # Parse events from run data (execution_id will be set after storage)
        events = self._parse_events(execution_id=None)

        return NormalizedExecution(
            execution_id=None,  # Will be set by database
            n8n_execution_id=n8n_execution_id,
            workflow_id=None,  # Will be set during storage (after workflow lookup/creation)
            n8n_workflow_id=n8n_workflow_id,
            started_at=started_at,
            finished_at=finished_at,
            status=status,
            duration_ms=duration_ms,
            trigger_mode=trigger_mode,
            raw_json=self.execution_json,  # Store original JSON
            events=events
        )

    def _parse_events(self, execution_id: Optional[str]) -> List[ExecutionEvent]:
        """Parse run data into event stream."""
        events = []
        sequence = 0

        for node_name, node_runs in self.run_data.items():
            # node_runs is a list (can have multiple runs for retries)
            for run_idx, run in enumerate(node_runs):
                # Started event
                start_time = self._parse_timestamp(run.get("startTime"))
                if start_time:
                    events.append(ExecutionEvent(
                        execution_id=execution_id,  # Will be None initially, set during storage
                        node_id=self._normalize_node_id(node_name),
                        event_type=EventType.STARTED,
                        timestamp=start_time,
                        sequence_order=sequence,
                        retry_attempt=run_idx
                    ))
                    sequence += 1

                # Finished/Error event
                execution_time = run.get("executionTime", 0)
                error = run.get("error")

                # Calculate end timestamp
                if start_time and execution_time:
                    end_time = start_time + timedelta(milliseconds=execution_time)
                else:
                    end_time = start_time or datetime.now()

                if error:
                    # Error event
                    events.append(ExecutionEvent(
                        execution_id=execution_id,
                        node_id=self._normalize_node_id(node_name),
                        event_type=EventType.ERROR,
                        timestamp=end_time,
                        duration_ms=execution_time,
                        status=EventStatus.ERROR,
                        error_message=error.get("message", "Unknown error"),
                        sequence_order=sequence,
                        retry_attempt=run_idx
                    ))
                else:
                    # Success event
                    events.append(ExecutionEvent(
                        execution_id=execution_id,
                        node_id=self._normalize_node_id(node_name),
                        event_type=EventType.FINISHED,
                        timestamp=end_time,
                        duration_ms=execution_time,
                        status=EventStatus.SUCCESS,
                        sequence_order=sequence,
                        retry_attempt=run_idx
                    ))

                sequence += 1

        # Sort by timestamp to maintain order
        events.sort(key=lambda e: (e.timestamp, e.sequence_order))

        # Reassign sequence numbers after sorting
        for idx, event in enumerate(events):
            event.sequence_order = idx

        return events

    def _parse_timestamp(self, ts: Any) -> Optional[datetime]:
        """Parse timestamp from various formats."""
        if not ts:
            return None

        if isinstance(ts, (int, float)):
            # Unix timestamp (ms)
            return datetime.fromtimestamp(ts / 1000)
        elif isinstance(ts, str):
            # ISO format
            try:
                return datetime.fromisoformat(ts.replace('Z', '+00:00'))
            except ValueError:
                # Try without timezone info
                try:
                    return datetime.fromisoformat(ts.replace('Z', ''))
                except ValueError:
                    return None

        return None

    def _determine_status(self) -> str:
        """Determine execution status."""
        if not self.execution_json.get("finished"):
            return "cancelled"

        # Check for errors in run data
        for node_runs in self.run_data.values():
            for run in node_runs:
                if run.get("error"):
                    return "error"

        return "success"

    def _normalize_node_id(self, node_name: str) -> str:
        """Convert node name to consistent ID format."""
        return node_name.lower().replace(" ", "_")
