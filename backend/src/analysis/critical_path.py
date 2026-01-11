"""
Critical Path Algorithm for Workflow Execution Analysis

This module implements the critical path method (CPM) to identify the longest
sequence of nodes through a workflow execution, determining which nodes actually
block overall completion time.

Algorithm Overview:
1. Load workflow structure and execution timing data
2. Build execution graph (filter to only executed nodes)
3. Perform topological sort to validate DAG and get node ordering
4. Calculate longest path using dynamic programming
5. Reconstruct critical path by backtracking from final node

Time Complexity: O(V + E) where V = nodes, E = edges
Space Complexity: O(V + E)
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict, deque


@dataclass
class CriticalPathResult:
    """Result of critical path calculation"""
    path_node_ids: List[str]
    total_duration_ms: int
    node_count: int
    contains_error: bool
    error_node_ids: List[str]
    path_percentage: float
    executed_nodes: int
    total_nodes: int
    skipped_nodes: int
    calculated_at: datetime
    from_cache: bool = False

    def to_dict(self) -> Dict:
        """Convert to dictionary for API response"""
        result = asdict(self)
        result['calculated_at'] = self.calculated_at.isoformat()
        return result


class CriticalPathAnalyzer:
    """Analyzes workflow executions to find the critical path"""

    def __init__(self, supabase_client):
        self.db = supabase_client

    def calculate(self, execution_id: str, workflow_id: str) -> CriticalPathResult:
        """
        Main entry point - orchestrates all phases of critical path calculation

        Args:
            execution_id: UUID of the execution to analyze
            workflow_id: UUID of the workflow

        Returns:
            CriticalPathResult with path data and metadata

        Raises:
            ValueError: If graph contains cycles or is invalid
        """
        # Check cache first
        cached = self._get_cached_result(execution_id)
        if cached:
            cached.from_cache = True
            return cached

        # Phase 1: Data Loading & Graph Construction
        workflow_graph = self._load_workflow_graph(workflow_id)

        if not workflow_graph['nodes']:
            raise ValueError(f"No nodes found for workflow {workflow_id}")

        execution_timing = self._load_execution_timing(execution_id)

        if not execution_timing:
            raise ValueError(f"No execution events found for execution {execution_id}")

        execution_graph = self._build_execution_graph(workflow_graph, execution_timing)

        if not execution_graph['nodes']:
            raise ValueError(f"No executed nodes found - all nodes may have been skipped")

        # Phase 2: Topological Sort (validation)
        topo_order = self._topological_sort(execution_graph)

        # Phase 3: Longest Path Calculation
        path_data = self._calculate_longest_path(execution_graph, topo_order)

        # Phase 4: Path Reconstruction
        path_node_ids = self._reconstruct_path(path_data)

        # Build result
        result = self._build_result(
            path_node_ids=path_node_ids,
            execution_graph=execution_graph,
            path_data=path_data,
            workflow_graph=workflow_graph,
            execution_id=execution_id,
            workflow_id=workflow_id
        )

        # Store in cache
        self._store_result(execution_id, workflow_id, result)

        return result

    def _load_workflow_graph(self, workflow_id: str) -> Dict:
        """
        Phase 1.1: Load workflow structure from database

        Returns:
        {
            'nodes': {
                'node_id_1': {'name': 'Webhook', 'type': 'webhook'},
                ...
            },
            'edges': [
                ('source_id', 'target_id'),
                ...
            ]
        }
        """
        # Load workflow with raw_json
        workflow_response = self.db.table('workflows').select('raw_json').eq('id', workflow_id).execute()

        if not workflow_response.data:
            raise ValueError(f"Workflow {workflow_id} not found")

        raw_json = workflow_response.data[0].get('raw_json', {})

        # Extract nodes from raw JSON
        nodes = {}
        for node in raw_json.get('nodes', []):
            node_id = node.get('id', '')
            node_type = node.get('type', 'unknown')

            # Remove n8n-nodes-base. prefix if present
            if node_type.startswith('n8n-nodes-base.'):
                node_type = node_type.replace('n8n-nodes-base.', '')

            nodes[node_id] = {
                'name': node.get('name', 'Unknown'),
                'type': node_type
            }

        # Extract edges from connections
        edges_set = set()  # Use set to avoid duplicates
        connections = raw_json.get('connections', {})

        # Create name -> id mapping (n8n uses names in connections)
        name_to_id = {node.get('name'): node.get('id') for node in raw_json.get('nodes', [])}

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
                        target_name = connection.get('node')
                        target_id = name_to_id.get(target_name)

                        if target_id and source_id != target_id:  # Avoid self-loops
                            edges_set.add((source_id, target_id))

        return {
            'nodes': nodes,
            'edges': list(edges_set)  # Convert back to list
        }

    def _load_execution_timing(self, execution_id: str) -> Dict:
        """
        Phase 1.2: Load execution timing data from events

        Returns:
        {
            'node_uuid_1': {
                'start_time': datetime,
                'finish_time': datetime,
                'duration_ms': int,
                'status': 'success' | 'error',
                'name': str,
                'type': str
            },
            ...
        }

        Note: Events store node_id as normalized names (lowercase, spaces->underscores)
        but we need to map them to workflow node UUIDs
        """
        # Load all events for this execution
        events_response = self.db.table('execution_events').select('*').eq('execution_id', execution_id).order('timestamp').execute()

        # Group events by node_id (normalized name)
        node_events = defaultdict(list)
        for event in events_response.data:
            node_events[event['node_id']].append(event)

        # Build timing data using normalized names as keys
        # We'll map to UUIDs in _build_execution_graph
        timing = {}
        for normalized_name, events in node_events.items():
            # Find STARTED event (lowercase in DB)
            start_event = next((e for e in events if e['event_type'] == 'started'), None)
            # Find completion event (FINISHED or ERROR)
            finish_event = next((e for e in events if e['event_type'] in ('finished', 'error')), None)

            if start_event and finish_event:
                timing[normalized_name] = {
                    'start_time': datetime.fromisoformat(start_event['timestamp'].replace('Z', '+00:00')),
                    'finish_time': datetime.fromisoformat(finish_event['timestamp'].replace('Z', '+00:00')),
                    'duration_ms': finish_event.get('duration_ms', 0),
                    'status': 'error' if finish_event['event_type'] == 'error' else 'success',
                    'name': normalized_name,
                    'type': finish_event.get('node_type', '')
                }

        return timing

    def _build_execution_graph(self, workflow_graph: Dict, execution_timing: Dict) -> Dict:
        """
        Phase 1.3: Build execution graph by filtering to only executed nodes

        For workflows with loops, we build edges based on temporal ordering
        (which node finished before another started) rather than static workflow structure.

        Returns:
        {
            'nodes': {node_uuid: timing_data},
            'adjacency_list': {node_uuid: [child_uuids]},
            'reverse_adjacency_list': {node_uuid: [parent_uuids]}
        }
        """
        # Build mapping from normalized name to UUID
        name_to_uuid = {}
        for uuid, node_data in workflow_graph['nodes'].items():
            normalized_name = self._normalize_node_name(node_data['name'])
            name_to_uuid[normalized_name] = uuid

        # Map execution timing from normalized names to UUIDs
        executed_nodes = {}
        unmapped_nodes = []
        for normalized_name, timing_data in execution_timing.items():
            uuid = name_to_uuid.get(normalized_name)
            if uuid:
                # Update timing data with node info from workflow
                timing_data['name'] = workflow_graph['nodes'][uuid]['name']
                timing_data['type'] = workflow_graph['nodes'][uuid]['type']
                executed_nodes[uuid] = timing_data
            else:
                unmapped_nodes.append(normalized_name)

        if unmapped_nodes:
            print(f"Warning: Could not map {len(unmapped_nodes)} execution nodes to workflow UUIDs: {unmapped_nodes[:10]}")

        # Build edges based on temporal ordering to create a DAG even if workflow has loops
        # For each node, find its immediate predecessor (the node that finished most recently before this one started)
        adjacency_list = defaultdict(list)
        reverse_adjacency_list = defaultdict(list)

        # Sort nodes by start time
        nodes_by_start = sorted(
            executed_nodes.items(),
            key=lambda x: x[1]['start_time']
        )

        for i, (node_id, node_data) in enumerate(nodes_by_start):
            node_start = node_data['start_time']

            # Find all nodes that finished before this one started
            potential_parents = []
            for prev_id, prev_data in nodes_by_start[:i]:
                if prev_data['finish_time'] <= node_start:
                    potential_parents.append((prev_id, prev_data['finish_time']))

            # If there are potential parents, connect to the one that finished most recently
            if potential_parents:
                # Sort by finish time and take the most recent
                potential_parents.sort(key=lambda x: x[1], reverse=True)
                parent_id = potential_parents[0][0]

                adjacency_list[parent_id].append(node_id)
                reverse_adjacency_list[node_id].append(parent_id)

        # Ensure all executed nodes are in the adjacency lists (even if no edges)
        for node_id in executed_nodes:
            if node_id not in adjacency_list:
                adjacency_list[node_id] = []
            if node_id not in reverse_adjacency_list:
                reverse_adjacency_list[node_id] = []

        return {
            'nodes': executed_nodes,
            'adjacency_list': dict(adjacency_list),
            'reverse_adjacency_list': dict(reverse_adjacency_list)
        }

    def _normalize_node_name(self, node_name: str) -> str:
        """
        Normalize node name to match the format used in execution events.
        Same logic as N8nExecutionParser._normalize_node_id()
        """
        return node_name.lower().replace(" ", "_")

    def _topological_sort(self, execution_graph: Dict) -> List[str]:
        """
        Phase 2: Perform topological sort using Kahn's algorithm

        Returns: Ordered list of node_ids (dependencies before dependents)
        Raises: ValueError if cycle detected
        """
        # Calculate in-degree for each node
        in_degree = {node: 0 for node in execution_graph['nodes']}
        for parent, children in execution_graph['adjacency_list'].items():
            for child in children:
                in_degree[child] += 1

        # Start with nodes that have no dependencies
        queue = deque([node for node, degree in in_degree.items() if degree == 0])
        result = []

        # Process nodes in dependency order
        while queue:
            node = queue.popleft()
            result.append(node)

            # Remove this node's edges, decrease children's in-degree
            for child in execution_graph['adjacency_list'].get(node, []):
                in_degree[child] -= 1
                if in_degree[child] == 0:
                    queue.append(child)

        # If we didn't process all nodes, there's a cycle
        if len(result) != len(execution_graph['nodes']):
            # Debug: Find nodes that weren't processed
            unprocessed = set(execution_graph['nodes'].keys()) - set(result)
            node_names = {node_id: execution_graph['nodes'][node_id]['name'] for node_id in unprocessed}
            raise ValueError(f"Cycle detected in workflow execution graph. Unprocessed nodes: {node_names}")

        return result

    def _calculate_longest_path(self, execution_graph: Dict, topo_order: List[str]) -> Dict:
        """
        Phase 3: Calculate longest path using dynamic programming

        For each node in topological order:
        1. Earliest Start Time = MAX(all parent finish times)
        2. Finish Time = Earliest Start Time + Node Duration
        3. Track which parent contributed the max (for path reconstruction)

        Returns:
        {
            'earliest_start': {node_id: timestamp},
            'finish_time': {node_id: timestamp},
            'predecessor': {node_id: parent_node_id},
            'cumulative_duration': {node_id: milliseconds}
        }
        """
        timing = execution_graph['nodes']
        parents = execution_graph['reverse_adjacency_list']

        earliest_start = {}
        finish_time = {}
        predecessor = {}
        cumulative_duration = {}

        for node in topo_order:
            parent_nodes = parents.get(node, [])

            if not parent_nodes:
                # Start node (no parents)
                earliest_start[node] = timing[node]['start_time']
                cumulative_duration[node] = 0
                predecessor[node] = None
            else:
                # Find parent with latest finish time
                latest_parent = max(
                    parent_nodes,
                    key=lambda p: finish_time[p]
                )
                earliest_start[node] = finish_time[latest_parent]
                predecessor[node] = latest_parent
                cumulative_duration[node] = (
                    cumulative_duration[latest_parent] +
                    timing[node]['duration_ms']
                )

            # Calculate this node's finish time
            finish_time[node] = (
                earliest_start[node] +
                timedelta(milliseconds=timing[node]['duration_ms'])
            )

        return {
            'earliest_start': earliest_start,
            'finish_time': finish_time,
            'predecessor': predecessor,
            'cumulative_duration': cumulative_duration
        }

    def _reconstruct_path(self, path_data: Dict) -> List[str]:
        """
        Phase 4: Reconstruct critical path by backtracking from final node

        Returns: [node_id_1, node_id_2, ..., node_id_N] in start -> finish order
        """
        # Find the final node (latest finish time)
        finish_times = path_data['finish_time']

        if not finish_times:
            raise ValueError("No finish times calculated - execution graph may be empty")

        final_node = max(
            finish_times.keys(),
            key=lambda n: finish_times[n]
        )

        # Backtrack using predecessor links
        path = []
        current = final_node

        while current is not None:
            path.append(current)
            current = path_data['predecessor'][current]

        # Reverse to get start → finish order
        return list(reversed(path))

    def _build_result(
        self,
        path_node_ids: List[str],
        execution_graph: Dict,
        path_data: Dict,
        workflow_graph: Dict,
        execution_id: str,
        workflow_id: str
    ) -> CriticalPathResult:
        """Build CriticalPathResult from calculated data"""

        nodes = execution_graph['nodes']

        # Calculate total duration (last node's cumulative duration)
        total_duration_ms = path_data['cumulative_duration'][path_node_ids[-1]]

        # Find error nodes in path
        error_node_ids = [
            node_id for node_id in path_node_ids
            if nodes[node_id]['status'] == 'error'
        ]

        # Calculate statistics
        executed_nodes = len(execution_graph['nodes'])
        total_nodes = len(workflow_graph['nodes'])
        skipped_nodes = total_nodes - executed_nodes
        path_percentage = (len(path_node_ids) / executed_nodes * 100) if executed_nodes > 0 else 0

        return CriticalPathResult(
            path_node_ids=path_node_ids,
            total_duration_ms=total_duration_ms,
            node_count=len(path_node_ids),
            contains_error=len(error_node_ids) > 0,
            error_node_ids=error_node_ids,
            path_percentage=round(path_percentage, 2),
            executed_nodes=executed_nodes,
            total_nodes=total_nodes,
            skipped_nodes=skipped_nodes,
            calculated_at=datetime.utcnow(),
            from_cache=False
        )

    def _store_result(self, execution_id: str, workflow_id: str, result: CriticalPathResult):
        """Store critical path result in database cache"""
        try:
            self.db.table('critical_paths').insert({
                'execution_id': execution_id,
                'path_nodes': result.path_node_ids,
                'total_duration_ms': result.total_duration_ms,
                'computed_at': result.calculated_at.isoformat()
            }).execute()
        except Exception as e:
            # Don't fail the request if caching fails
            print(f"Warning: Failed to cache critical path result: {e}")

    def _get_cached_result(self, execution_id: str) -> Optional[CriticalPathResult]:
        """Retrieve cached critical path result from database"""
        try:
            response = self.db.table('critical_paths').select('*').eq('execution_id', execution_id).execute()

            if response.data and len(response.data) > 0:
                cached = response.data[0]

                # Need to get additional context for full result
                # Get execution context
                exec_response = self.db.table('executions').select('workflow_id').eq('id', execution_id).execute()
                workflow_id = exec_response.data[0]['workflow_id'] if exec_response.data else None

                if workflow_id:
                    workflow_graph = self._load_workflow_graph(workflow_id)
                    execution_timing = self._load_execution_timing(execution_id)
                    execution_graph = self._build_execution_graph(workflow_graph, execution_timing)

                    path_node_ids = cached['path_nodes']
                    total_nodes = len(workflow_graph['nodes'])
                    executed_nodes = len(execution_timing)
                    skipped_nodes = total_nodes - executed_nodes

                    # Calculate error nodes
                    error_node_ids = [
                        node_id for node_id in path_node_ids
                        if execution_graph['nodes'][node_id]['status'] == 'error'
                    ]

                    path_percentage = (len(path_node_ids) / executed_nodes * 100) if executed_nodes > 0 else 0

                    return CriticalPathResult(
                        path_node_ids=path_node_ids,
                        total_duration_ms=cached['total_duration_ms'],
                        node_count=len(path_node_ids),
                        contains_error=len(error_node_ids) > 0,
                        error_node_ids=error_node_ids,
                        path_percentage=round(path_percentage, 2),
                        executed_nodes=executed_nodes,
                        total_nodes=total_nodes,
                        skipped_nodes=skipped_nodes,
                        calculated_at=datetime.fromisoformat(cached['computed_at'].replace('Z', '+00:00')),
                        from_cache=True
                    )
        except Exception as e:
            # If cache lookup fails, just recalculate
            print(f"Warning: Failed to retrieve cached result: {e}")

        return None

    def get_critical_path_with_details(self, execution_id: str, workflow_id: str) -> Dict:
        """
        Get critical path with detailed node information for API response

        Returns formatted response with node details, summary, and context
        """
        result = self.calculate(execution_id, workflow_id)

        # Get detailed node information
        execution_timing = self._load_execution_timing(execution_id)
        workflow_graph = self._load_workflow_graph(workflow_id)
        execution_graph = self._build_execution_graph(workflow_graph, execution_timing)

        # Calculate cumulative durations for path nodes
        path_nodes_detailed = []
        cumulative = 0

        for node_id in result.path_node_ids:
            timing = execution_graph['nodes'][node_id]
            duration_ms = timing['duration_ms']
            cumulative += duration_ms

            path_nodes_detailed.append({
                'node_id': node_id,
                'node_name': timing['name'],
                'node_type': timing['type'],
                'duration_ms': duration_ms,
                'cumulative_duration_ms': cumulative,
                'is_bottleneck': duration_ms > 2000,  # > 2s is considered bottleneck
                'status': timing['status']
            })

        return {
            'success': True,
            'data': {
                'critical_path': path_nodes_detailed,
                'summary': {
                    'total_duration_ms': result.total_duration_ms,
                    'node_count': result.node_count,
                    'path_percentage': result.path_percentage,
                    'contains_error': result.contains_error
                },
                'execution_context': {
                    'executed_nodes': result.executed_nodes,
                    'total_nodes': result.total_nodes,
                    'skipped_nodes': result.skipped_nodes
                },
                'calculated_at': result.calculated_at.isoformat(),
                'from_cache': result.from_cache
            }
        }
