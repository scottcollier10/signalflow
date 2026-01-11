"""
Workflow service for graph visualization.
Transforms n8n workflow and execution data into React Flow format.
"""

from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from ..config import settings


class WorkflowService:
    """Handle workflow and execution graph data."""

    def __init__(self):
        self.supabase: Client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    async def get_workflows(self) -> List[Dict[str, Any]]:
        """
        Get list of all workflows with basic metadata.

        Returns:
            List of workflows with id, name, n8n_workflow_id, node_count, edge_count
        """
        response = self.supabase.table("workflows")\
            .select("id, name, n8n_workflow_id, node_count, edge_count, created_at, updated_at")\
            .order("created_at", desc=True)\
            .execute()

        return response.data if response.data else []

    async def get_workflow_graph(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get workflow and transform to React Flow format.

        Args:
            workflow_id: UUID of the workflow

        Returns:
            Dict with nodes and edges in React Flow format
        """
        # Get workflow with raw_json
        response = self.supabase.table("workflows")\
            .select("id, name, n8n_workflow_id, raw_json")\
            .eq("id", workflow_id)\
            .limit(1)\
            .execute()

        if not response.data or len(response.data) == 0:
            return None

        workflow = response.data[0]
        raw_json = workflow.get("raw_json", {})

        # Transform to React Flow format
        nodes = self._extract_nodes(raw_json)
        edges = self._extract_edges(raw_json)

        return {
            "workflow_id": workflow["id"],
            "name": workflow["name"],
            "n8n_workflow_id": workflow.get("n8n_workflow_id"),
            "nodes": nodes,
            "edges": edges,
            "node_count": len(nodes),
            "edge_count": len(edges)
        }

    async def get_execution_graph(
        self,
        workflow_id: str,
        execution_id: str
    ) -> Dict[str, Any]:
        """
        Get execution with events and transform to React Flow format.

        Args:
            workflow_id: UUID of the workflow
            execution_id: UUID of the execution

        Returns:
            Dict with nodes, edges, and execution events in React Flow format
        """
        # Get execution with raw_json
        exec_response = self.supabase.table("executions")\
            .select("id, workflow_id, n8n_execution_id, started_at, finished_at, status, duration_ms, raw_json")\
            .eq("id", execution_id)\
            .eq("workflow_id", workflow_id)\
            .limit(1)\
            .execute()

        if not exec_response.data or len(exec_response.data) == 0:
            return None

        execution = exec_response.data[0]

        # Get workflow for graph structure
        workflow_response = self.supabase.table("workflows")\
            .select("raw_json")\
            .eq("id", workflow_id)\
            .limit(1)\
            .execute()

        if not workflow_response.data or len(workflow_response.data) == 0:
            return None

        workflow_json = workflow_response.data[0].get("raw_json", {})

        # Get execution events
        events_response = self.supabase.table("execution_events")\
            .select("*")\
            .eq("execution_id", execution_id)\
            .order("sequence_order")\
            .execute()

        events = events_response.data if events_response.data else []

        # Transform to React Flow format
        nodes = self._extract_nodes(workflow_json)
        edges = self._extract_edges(workflow_json)

        # Enhance nodes with execution data
        nodes = self._enhance_nodes_with_events(nodes, events)

        return {
            "execution_id": execution["id"],
            "workflow_id": execution["workflow_id"],
            "n8n_execution_id": execution.get("n8n_execution_id"),
            "started_at": execution["started_at"],
            "finished_at": execution.get("finished_at"),
            "status": execution["status"],
            "duration_ms": execution.get("duration_ms"),
            "nodes": nodes,
            "edges": edges,
            "events": events,
            "node_count": len(nodes),
            "edge_count": len(edges),
            "event_count": len(events)
        }

    def _extract_nodes(self, workflow_json: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract nodes from n8n workflow JSON and convert to React Flow format.

        n8n format:
        {
          "nodes": [
            {
              "id": "node_id",
              "name": "Node Name",
              "type": "n8n-nodes-base.httpRequest",
              "position": [x, y],
              "parameters": {...}
            }
          ]
        }

        React Flow format:
        {
          "id": "node_id",
          "type": "custom",
          "position": {"x": 0, "y": 0},
          "data": {
            "label": "Node Name",
            "nodeType": "httpRequest",
            ...
          }
        }
        """
        nodes = []
        n8n_nodes = workflow_json.get("nodes", [])

        for node in n8n_nodes:
            # Extract node type (remove n8n-nodes-base. prefix)
            node_type = node.get("type", "unknown")
            if node_type.startswith("n8n-nodes-base."):
                node_type = node_type.replace("n8n-nodes-base.", "")

            # Get position (n8n uses array [x, y])
            position = node.get("position", [0, 0])
            if isinstance(position, list) and len(position) >= 2:
                pos_x, pos_y = position[0], position[1]
            else:
                pos_x, pos_y = 0, 0

            react_flow_node = {
                "id": node.get("id", ""),
                "type": "custom",  # We'll use custom nodes in React Flow
                "position": {
                    "x": pos_x,
                    "y": pos_y
                },
                "data": {
                    "label": node.get("name", "Unknown"),
                    "nodeType": node_type,
                    "parameters": node.get("parameters", {}),
                    "disabled": node.get("disabled", False),
                    "notesInFlow": node.get("notesInFlow", False),
                    "notes": node.get("notes", "")
                }
            }

            nodes.append(react_flow_node)

        return nodes

    def _extract_edges(self, workflow_json: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract edges from n8n workflow JSON and convert to React Flow format.

        n8n format:
        {
          "connections": {
            "source_node_name": {
              "main": [
                [
                  {
                    "node": "target_node_name",
                    "type": "main",
                    "index": 0
                  }
                ]
              ]
            }
          }
        }

        React Flow format:
        {
          "id": "edge_id",
          "source": "source_node_id",
          "target": "target_node_id",
          "type": "default",
          "sourceHandle": "main-0",
          "targetHandle": "main-0"
        }
        """
        edges = []
        connections = workflow_json.get("connections", {})
        nodes = workflow_json.get("nodes", [])

        # Create name -> id mapping (n8n uses names in connections)
        name_to_id = {node.get("name"): node.get("id") for node in nodes}

        edge_counter = 0

        for source_name, outputs in connections.items():
            source_id = name_to_id.get(source_name)
            if not source_id:
                continue

            # Handle different output types (main, ai_languageModel, etc.)
            for output_type, output_arrays in outputs.items():
                if not isinstance(output_arrays, list):
                    continue

                # Each output can have multiple parallel branches
                for output_index, connections_list in enumerate(output_arrays):
                    if not isinstance(connections_list, list):
                        continue

                    for connection in connections_list:
                        target_name = connection.get("node")
                        target_id = name_to_id.get(target_name)

                        if not target_id:
                            continue

                        target_index = connection.get("index", 0)

                        edge = {
                            "id": f"e{edge_counter}",
                            "source": source_id,
                            "target": target_id,
                            "type": "default",
                            "sourceHandle": f"{output_type}-{output_index}",
                            "targetHandle": f"input-{target_index}",
                            "data": {
                                "connectionType": output_type
                            }
                        }

                        edges.append(edge)
                        edge_counter += 1

        return edges

    def _enhance_nodes_with_events(
        self,
        nodes: List[Dict[str, Any]],
        events: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Enhance nodes with execution event data.

        Adds execution metadata to each node:
        - execution_status: success, error, skipped
        - duration_ms: total duration
        - error_message: if any
        - started_at: timestamp
        - finished_at: timestamp
        - items_processed: count
        """
        # Create mapping from normalized node name to node ID (UUID)
        # Events use normalized names (lowercase, spaces->underscores)
        # Nodes use UUIDs as IDs
        name_to_node = {}
        for node in nodes:
            node_name = node.get("data", {}).get("label", "")
            normalized_name = self._normalize_node_name(node_name)
            name_to_node[normalized_name] = node["id"]

        # Group events by node_id
        events_by_node_uuid = {}
        for event in events:
            event_node_id = event.get("node_id")  # This is the normalized name
            # Map to UUID
            node_uuid = name_to_node.get(event_node_id, event_node_id)
            if node_uuid not in events_by_node_uuid:
                events_by_node_uuid[node_uuid] = []
            events_by_node_uuid[node_uuid].append(event)

        # Enhance each node
        enhanced_nodes = []
        for node in nodes:
            node_id = node["id"]
            node_events = events_by_node_uuid.get(node_id, [])

            # Calculate node execution data
            execution_data = self._calculate_node_execution_data(node_events)

            # Add execution data to node
            enhanced_node = {**node}
            enhanced_node["data"] = {
                **node.get("data", {}),
                "execution": execution_data
            }

            enhanced_nodes.append(enhanced_node)

        return enhanced_nodes

    def _normalize_node_name(self, node_name: str) -> str:
        """
        Normalize node name to match the format used in execution events.
        Same logic as N8nExecutionParser._normalize_node_id()
        """
        return node_name.lower().replace(" ", "_")

    def _calculate_node_execution_data(
        self,
        events: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate execution metadata from events.

        Returns:
            Dict with execution status, duration, timestamps, etc.
        """
        if not events:
            return {
                "executed": False
            }

        # Sort events by sequence order
        sorted_events = sorted(events, key=lambda e: e.get("sequence_order", 0))

        # Find started and finished events
        started_event = None
        finished_event = None
        error_event = None

        for event in sorted_events:
            event_type = event.get("event_type")
            if event_type == "started" and not started_event:
                started_event = event
            elif event_type == "finished":
                finished_event = event
            elif event_type == "error":
                error_event = event

        # Determine status
        if error_event:
            status = "error"
        elif finished_event:
            status = finished_event.get("status", "success")
        else:
            status = "running"

        execution_data = {
            "executed": True,
            "status": status,
            "started_at": started_event.get("timestamp") if started_event else None,
            "finished_at": finished_event.get("timestamp") if finished_event else None,
            "duration_ms": finished_event.get("duration_ms") if finished_event else None,
            "items_processed": finished_event.get("items_processed", 0) if finished_event else 0,
            "error_message": error_event.get("error_message") if error_event else None,
            "retry_attempt": max([e.get("retry_attempt", 0) for e in events]),
            "event_count": len(events)
        }

        return execution_data
