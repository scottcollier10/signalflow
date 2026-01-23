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
        print(f"[storage] Looking for workflow with n8n_workflow_id: {normalized.n8n_workflow_id}")

        # Try to find existing workflow by n8n_workflow_id
        if normalized.n8n_workflow_id and normalized.n8n_workflow_id != "unknown":
            response = self.supabase.table("workflows")\
                .select("id")\
                .eq("n8n_workflow_id", normalized.n8n_workflow_id)\
                .limit(1)\
                .execute()

            if response.data and len(response.data) > 0:
                print(f"[storage] Found existing workflow: {response.data[0]['id']}")
                return response.data[0]["id"]

        print("[storage] Creating new workflow...")

        # Create new workflow if not found
        workflow_data = normalized.raw_json.get("workflowData", {})
        workflow_name = (
            workflow_data.get("name") or
            normalized.raw_json.get("workflowName") or
            f"Workflow {normalized.n8n_workflow_id}"
        )

        workflow_insert = {
            "name": workflow_name,
            "n8n_workflow_id": normalized.n8n_workflow_id,
            "raw_json": workflow_data if workflow_data else None,
            "node_count": len(workflow_data.get("nodes", [])) if workflow_data else 0,
            "edge_count": len(workflow_data.get("connections", {})) if workflow_data else 0
        }

        print(f"[storage] Inserting workflow: {workflow_insert['name']}")

        response = self.supabase.table("workflows")\
            .insert(workflow_insert)\
            .execute()

        if response.data and len(response.data) > 0:
            print(f"[storage] Created workflow: {response.data[0]['id']}")
            return response.data[0]["id"]

        # Fallback: generate a UUID
        print("[storage] Warning: Workflow insert returned no data, using generated UUID")
        return str(uuid.uuid4())

    async def store_execution(self, normalized: NormalizedExecution) -> Optional[str]:
        """
        Store normalized execution and all events in database.

        Returns:
            UUID of the stored execution, or None if failed
        """
        try:
            print(f"[storage] Starting storage for n8n_execution_id: {normalized.n8n_execution_id}")
            print(f"[storage] n8n_workflow_id: {normalized.n8n_workflow_id}")

            # Get or create workflow
            workflow_id = await self._get_or_create_workflow(normalized)
            print(f"[storage] Got/created workflow_id: {workflow_id}")

            # Store execution record (database generates UUID)
            exec_data = {
                "workflow_id": workflow_id,
                "n8n_execution_id": normalized.n8n_execution_id,
                "started_at": normalized.started_at.isoformat() if normalized.started_at else None,
                "finished_at": normalized.finished_at.isoformat() if normalized.finished_at else None,
                "status": normalized.status,
                "duration_ms": normalized.duration_ms,
                "trigger_mode": normalized.trigger_mode,
                "raw_json": normalized.raw_json
            }
            print(f"[storage] Inserting execution with status: {normalized.status}")

            exec_response = self.supabase.table("executions")\
                .insert(exec_data)\
                .execute()

            print(f"[storage] Execution insert response: {exec_response.data}")

            if not exec_response.data or len(exec_response.data) == 0:
                print("[storage] Error: No execution record returned from database")
                return None

            # Get the generated UUID
            execution_uuid = exec_response.data[0]["id"]
            print(f"[storage] Generated execution UUID: {execution_uuid}")

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

            print(f"[storage] Prepared {len(event_records)} event records")

            # Batch insert events
            if event_records:
                events_response = self.supabase.table("execution_events")\
                    .insert(event_records)\
                    .execute()
                print(f"[storage] Inserted {len(events_response.data) if events_response.data else 0} events")
            else:
                print("[storage] Warning: No events to insert!")

            print(f"[storage] Storage complete. Returning UUID: {execution_uuid}")
            return execution_uuid

        except Exception as e:
            print(f"[storage] Error storing execution: {e}")
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
