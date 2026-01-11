"""
Store normalized execution events in Supabase.
"""

from typing import List, Optional
from supabase import create_client, Client
from .models import NormalizedExecution, ExecutionEvent
from ..config import settings
import uuid


class ExecutionStorage:
    """Handle storage of normalized executions."""

    def __init__(self):
        self.supabase: Client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    async def _get_or_create_workflow(self, normalized: NormalizedExecution) -> str:
        """
        Get workflow UUID by n8n_workflow_id, or create a new workflow record.

        Returns:
            UUID of the workflow
        """
        # Try to find existing workflow by n8n_workflow_id
        if normalized.n8n_workflow_id:
            response = self.supabase.table("workflows")\
                .select("id")\
                .eq("n8n_workflow_id", normalized.n8n_workflow_id)\
                .limit(1)\
                .execute()

            if response.data and len(response.data) > 0:
                return response.data[0]["id"]

        # Create new workflow if not found
        workflow_data = normalized.raw_json.get("workflowData", {})
        workflow_insert = {
            "name": workflow_data.get("name", f"Workflow {normalized.n8n_workflow_id}"),
            "n8n_workflow_id": normalized.n8n_workflow_id,
            "raw_json": workflow_data,
            "node_count": len(workflow_data.get("nodes", [])),
            "edge_count": len(workflow_data.get("connections", {}))
        }

        response = self.supabase.table("workflows")\
            .insert(workflow_insert)\
            .execute()

        if response.data and len(response.data) > 0:
            return response.data[0]["id"]

        # Fallback: generate a UUID
        return str(uuid.uuid4())

    async def store_execution(self, normalized: NormalizedExecution) -> Optional[str]:
        """
        Store normalized execution and all events in database.

        Returns:
            UUID of the stored execution, or None if failed
        """
        try:
            # Get or create workflow
            workflow_id = await self._get_or_create_workflow(normalized)

            # Store execution record (database generates UUID)
            exec_data = {
                "workflow_id": workflow_id,
                "n8n_execution_id": normalized.n8n_execution_id,
                "started_at": normalized.started_at.isoformat(),
                "finished_at": normalized.finished_at.isoformat() if normalized.finished_at else None,
                "status": normalized.status,
                "duration_ms": normalized.duration_ms,
                "trigger_mode": normalized.trigger_mode,
                "raw_json": normalized.raw_json
            }

            exec_response = self.supabase.table("executions")\
                .insert(exec_data)\
                .execute()

            if not exec_response.data or len(exec_response.data) == 0:
                print("Error: No execution record returned from database")
                return None

            # Get the generated UUID
            execution_uuid = exec_response.data[0]["id"]

            # Store events with the execution UUID
            event_records = []
            for event in normalized.events:
                event_data = {
                    "execution_id": execution_uuid,
                    "node_id": event.node_id,
                    "event_type": event.event_type.value,
                    "timestamp": event.timestamp.isoformat(),
                    "duration_ms": event.duration_ms,
                    "status": event.status.value if event.status else None,
                    "error_message": event.error_message,
                    "retry_attempt": event.retry_attempt,
                    "items_processed": event.items_processed,
                    "sequence_order": event.sequence_order,
                    "metadata": event.metadata
                }
                event_records.append(event_data)

            # Batch insert events
            if event_records:
                self.supabase.table("execution_events")\
                    .insert(event_records)\
                    .execute()

            return execution_uuid

        except Exception as e:
            print(f"Error storing execution: {e}")
            import traceback
            traceback.print_exc()
            return None

    async def get_execution_events(
        self,
        execution_id: str
    ) -> List[ExecutionEvent]:
        """Retrieve all events for an execution (by UUID)."""

        response = self.supabase.table("execution_events")\
            .select("*")\
            .eq("execution_id", execution_id)\
            .order("sequence_order")\
            .execute()

        events = []
        for row in response.data:
            # Convert string values back to enums
            row['event_type'] = row['event_type']
            if row.get('status'):
                row['status'] = row['status']

            events.append(ExecutionEvent(**row))

        return events
