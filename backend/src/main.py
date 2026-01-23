from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.config import settings
from src.normalizer.parser import N8nExecutionParser
from src.normalizer.storage import ExecutionStorage
from src.services.workflow_service import WorkflowService
from src.analysis.critical_path import CriticalPathAnalyzer
from src.analysis.bottlenecks import BottleneckAnalyzer
from src.analysis.error_clustering import ErrorClusteringAnalyzer
from src.analysis.recommendations import RecommendationEngine
from supabase import create_client
from datetime import datetime
import json
import httpx


class N8nFetchRequest(BaseModel):
    """Request body for fetching execution from n8n API."""
    n8n_url: str
    execution_id: str
    api_key: str

app = FastAPI(
    title="SignalFlow API",
    description="Workflow intelligence backend",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "SignalFlow API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/parse-execution")
async def parse_execution(file: UploadFile = File(...)):
    """
    Upload n8n execution JSON and parse it (no database storage).
    Use this to test the parser without needing database connectivity.
    """
    try:
        # Read uploaded file
        content = await file.read()
        execution_json = json.loads(content)

        # Parse and normalize
        parser = N8nExecutionParser(execution_json)
        normalized = parser.parse()

        return {
            "n8n_execution_id": normalized.n8n_execution_id,
            "n8n_workflow_id": normalized.n8n_workflow_id,
            "status": normalized.status,
            "event_count": len(normalized.events),
            "duration_ms": normalized.duration_ms,
            "trigger_mode": normalized.trigger_mode,
            "events": [e.model_dump() for e in normalized.events]
        }

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/normalize-execution")
async def normalize_execution(file: UploadFile = File(...)):
    """
    Upload n8n execution JSON and normalize it.
    Stores normalized events in database.
    """
    try:
        # Read uploaded file
        content = await file.read()
        execution_json = json.loads(content)

        # Parse and normalize
        parser = N8nExecutionParser(execution_json)
        normalized = parser.parse()

        # Store in database
        storage = ExecutionStorage()
        execution_uuid = await storage.store_execution(normalized)

        if not execution_uuid:
            raise HTTPException(status_code=500, detail="Failed to store execution")

        return {
            "execution_id": execution_uuid,  # UUID from database
            "n8n_execution_id": normalized.n8n_execution_id,  # Original n8n ID
            "status": normalized.status,
            "event_count": len(normalized.events),
            "duration_ms": normalized.duration_ms
        }

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/executions/{execution_id}/events")
async def get_execution_events(execution_id: str):
    """Get all normalized events for an execution."""
    try:
        storage = ExecutionStorage()
        events = await storage.get_execution_events(execution_id)

        return {
            "execution_id": execution_id,
            "event_count": len(events),
            "events": [e.model_dump() for e in events]
        }

    except Exception as e:
        raise HTTPException(status_code=404, detail="Execution not found")


@app.get("/api/workflows")
async def get_workflows():
    """
    Get list of all workflows.
    Returns workflow metadata without full graph data.
    """
    try:
        service = WorkflowService()
        workflows = await service.get_workflows()

        return {
            "count": len(workflows),
            "workflows": workflows
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/{workflow_id}")
async def get_workflow_graph(workflow_id: str):
    """
    Get workflow graph in React Flow format.
    Transforms n8n workflow JSON into nodes and edges.
    """
    try:
        service = WorkflowService()
        graph = await service.get_workflow_graph(workflow_id)

        if not graph:
            raise HTTPException(status_code=404, detail="Workflow not found")

        return graph

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/{workflow_id}/executions/{execution_id}")
async def get_execution_graph(workflow_id: str, execution_id: str):
    """
    Get execution graph in React Flow format with event data.
    Includes workflow structure enhanced with execution events.

    Expected for test data (workflow: 8ce95407-8381-4766-85aa-c5c2a2051384):
    - 74 nodes
    - 64 edges
    - 474 events
    """
    try:
        service = WorkflowService()
        graph = await service.get_execution_graph(workflow_id, execution_id)

        if not graph:
            raise HTTPException(
                status_code=404,
                detail="Execution not found or doesn't belong to this workflow"
            )

        return graph

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/{workflow_id}/executions/{execution_id}/critical-path")
async def get_critical_path(workflow_id: str, execution_id: str):
    """
    Get critical path for a workflow execution.

    The critical path is the longest sequence of nodes through the execution,
    determining which nodes actually block overall completion time.

    Expected for test data:
    - Workflow: 8ce95407-8381-4756-85aa-c5c2a0251384
    - Execution: 15720484-8e33-464b-84b8-0936ecfa7096
    - Path length: 10-15 nodes
    - Should include claude_ai_generate node
    """
    try:
        # Create Supabase client
        supabase = create_client(settings.supabase_url, settings.supabase_key)

        # Create analyzer and calculate critical path
        analyzer = CriticalPathAnalyzer(supabase)
        result = analyzer.get_critical_path_with_details(execution_id, workflow_id)

        return result

    except ValueError as e:
        # Graph validation errors (e.g., cycles detected)
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_GRAPH",
                "message": str(e)
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/{workflow_id}/executions/{execution_id}/bottlenecks")
async def get_bottlenecks(
    workflow_id: str,
    execution_id: str,
    limit: int = 10,
    severity: str = None,
    min_score: int = None
):
    """
    Get bottleneck analysis for a workflow execution.

    Scores each node by its impact on overall workflow performance using:
    - Duration Factor (40%): Percentile-based duration ranking
    - Position Factor (30%): Critical path location
    - Frequency Factor (20%): Execution count multiplier
    - Variance Factor (10%): Performance consistency

    Expected for test data:
    - Workflow: 8ce95407-8381-4756-85aa-c5c2a0251384
    - Execution: 15720484-8e33-464b-84b8-0936ecfa7096
    - Top bottleneck: "Claude: Generate Variant" with score 65-75
    - Second: "Rate Limit Delay" with score 65-70
    - API response < 150ms

    Query Parameters:
    - limit: Number of top bottlenecks to return (default: 10)
    - severity: Filter by severity level (low, medium, high, severe)
    - min_score: Only return nodes with score >= threshold
    """
    try:
        # Create Supabase client
        supabase = create_client(settings.supabase_url, settings.supabase_key)

        # Create analyzer
        analyzer = BottleneckAnalyzer(supabase)

        # Analyze bottlenecks
        bottlenecks = analyzer.analyze(execution_id, workflow_id, limit=100)  # Get all first

        # Apply filters
        if severity:
            bottlenecks = [b for b in bottlenecks if b.severity == severity]
        if min_score is not None:
            bottlenecks = [b for b in bottlenecks if b.score >= min_score]

        # Apply limit after filters
        bottlenecks = bottlenecks[:limit]

        # Get all bottlenecks for summary (before limit)
        all_bottlenecks = analyzer.analyze(execution_id, workflow_id, limit=1000)
        summary = analyzer.get_summary(all_bottlenecks, len(all_bottlenecks))

        # Get total execution duration for context
        critical_path_data = analyzer._load_critical_path(execution_id)
        total_duration_ms = critical_path_data.get('total_duration_ms', 0) if critical_path_data else 0

        # Calculate critical path percentage
        path_percentage = 0
        if critical_path_data:
            path_nodes_count = len(critical_path_data['path_nodes'])
            total_nodes = len(all_bottlenecks)
            path_percentage = (path_nodes_count / total_nodes * 100) if total_nodes > 0 else 0

        return {
            "success": True,
            "data": {
                "bottlenecks": [b.to_dict() for b in bottlenecks],
                "summary": {
                    **summary,
                    "total_execution_duration_ms": total_duration_ms
                },
                "analysis_context": {
                    "execution_id": execution_id,
                    "analysis_type": "single_execution",
                    "critical_path_percentage": round(path_percentage, 2),
                    "calculated_at": datetime.utcnow().isoformat() + "Z",
                    "from_cache": False
                }
            }
        }

    except ValueError as e:
        # Critical path not found or invalid data
        error_message = str(e)
        if "Critical path must be calculated" in error_message:
            return {
                "success": False,
                "error": {
                    "code": "CRITICAL_PATH_REQUIRED",
                    "message": error_message,
                    "details": "Run GET /critical-path endpoint first"
                }
            }
        else:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "ANALYSIS_ERROR",
                    "message": error_message
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/{workflow_id}/executions/{execution_id}/error-analysis")
async def get_error_analysis(
    workflow_id: str,
    execution_id: str,
    include_historical: bool = True,
    similarity_threshold: float = 0.75,
    execution_window: int = 100
):
    """
    Analyze errors in an execution and cluster with historical patterns.

    This endpoint:
    1. Extracts errors from the current execution
    2. Generates semantic embeddings for each error
    3. Clusters similar errors using DBSCAN algorithm
    4. Detects error patterns (timeout, auth, rate limit, etc.)
    5. Calculates severity based on frequency and type
    6. Provides evidence-backed insights with historical context

    Expected for test data:
    - Workflow: 8ce95407-8381-4756-85aa-c5c2a0251384
    - Execution: 15720484-8e33-464b-84b8-0936ecfa7096
    - API response < 500ms

    Query Parameters:
    - include_historical: Whether to cluster with past errors (default: True)
    - similarity_threshold: Minimum similarity for clustering 0-1 (default: 0.75)
    - execution_window: Number of past executions to include (default: 100)

    Returns:
    {
        "execution_errors": [list of errors in this execution],
        "clusters": [list of error clusters with patterns],
        "summary": {statistics about errors and clusters},
        "analysis_context": {metadata about the analysis}
    }
    """
    try:
        # Validate query parameters
        if not 0 <= similarity_threshold <= 1:
            raise HTTPException(
                status_code=400,
                detail="similarity_threshold must be between 0 and 1"
            )

        if not 1 <= execution_window <= 1000:
            raise HTTPException(
                status_code=400,
                detail="execution_window must be between 1 and 1000"
            )

        # Create Supabase client
        supabase = create_client(settings.supabase_url, settings.supabase_key)

        # Create analyzer
        analyzer = ErrorClusteringAnalyzer(supabase)

        # Analyze errors
        result = await analyzer.analyze_execution(
            execution_id=execution_id,
            workflow_id=workflow_id,
            include_historical=include_historical,
            similarity_threshold=similarity_threshold,
            execution_window=execution_window
        )

        return {
            "success": True,
            "data": result.to_dict()
        }

    except ValueError as e:
        # Validation errors or missing data
        raise HTTPException(
            status_code=400,
            detail={
                "code": "VALIDATION_ERROR",
                "message": str(e)
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in error analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/{workflow_id}/executions/{execution_id}/recommendations")
async def get_recommendations(workflow_id: str, execution_id: str):
    """
    Generate evidence-backed optimization recommendations for a workflow execution.

    This endpoint applies 15 detection rules to identify optimization opportunities:

    Performance Rules (1-7):
    1. Sequential API Calls → Parallelize
    2. Long Node Duration → Optimize Algorithm
    3. High Loop Iteration → Batch Processing
    4. Duplicate HTTP Requests → Add Caching
    5. Synchronous Waits → Use Webhooks
    6. Large Data Transfers → Compress/Stream
    7. Hardcoded Delays → Remove/Justify

    Reliability Rules (8-15):
    8. Repeated Timeouts → Increase Timeout
    9. Auth Failures → Fix Credentials
    10. Rate Limits → Add Backoff/Queuing
    11. Network Errors → Add Retry Logic
    12. Validation Errors → Add Input Checks
    13. Resource Errors → Scale Infrastructure
    14. High Error Rate on Node → Investigate Root Cause
    15. Error Cluster Across Nodes → Systemic Issue

    Each recommendation includes:
    - Evidence with clickable links to proof
    - Impact score (time saved or errors prevented)
    - Effort estimate (LOW/MEDIUM/HIGH)
    - Priority score (0-100)
    - Code examples where applicable

    Expected for test data:
    - Workflow: 8ce95407-8381-4756-85aa-c5c2a0251384
    - Execution: 15720484-8e33-464b-84b8-0936ecfa7096
    - Expected: 6-8 recommendations
    - API response < 600ms

    Returns:
    {
        "success": true,
        "data": {
            "recommendations": [list of recommendations sorted by priority],
            "summary": {
                "total_recommendations": 8,
                "by_category": {"performance": 5, "reliability": 3},
                "by_impact": {"CRITICAL": 1, "HIGH": 3, "MEDIUM": 4},
                "top_priority": {recommendation with highest score}
            }
        }
    }
    """
    try:
        # Create Supabase client
        supabase = create_client(settings.supabase_url, settings.supabase_key)

        # Create recommendation engine
        engine = RecommendationEngine(supabase)

        # Generate recommendations
        result = await engine.generate_recommendations(execution_id, workflow_id)

        return result

    except ValueError as e:
        # Missing required analysis data
        error_message = str(e)
        raise HTTPException(
            status_code=400,
            detail={
                "code": "ANALYSIS_REQUIRED",
                "message": error_message,
                "details": "Ensure critical path, bottleneck, and error analysis have been run first"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Data Retrieval Endpoints
# =============================================================================

@app.get("/api/executions")
async def list_executions(limit: int = 100, status: str = None):
    """
    List all executions with optional filtering.

    Args:
        limit: Maximum number of executions to return (default 100)
        status: Filter by status (success, error)

    Returns:
        List of execution records with workflow info
    """
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_key)

        # Build query
        query = supabase.table("executions")\
            .select("id, workflow_id, n8n_execution_id, status, started_at, finished_at, duration_ms")\
            .order("started_at", desc=True)\
            .limit(limit)

        if status:
            query = query.eq("status", status)

        result = query.execute()

        executions = result.data or []

        # Fetch workflow names for each unique workflow_id
        workflow_ids = list(set(e["workflow_id"] for e in executions if e.get("workflow_id")))
        workflow_map = {}

        if workflow_ids:
            workflows_result = supabase.table("workflows")\
                .select("id, name")\
                .in_("id", workflow_ids)\
                .execute()

            for w in (workflows_result.data or []):
                workflow_map[w["id"]] = w

        # Enrich executions with workflow info and counts
        enriched = []
        for exec in executions:
            workflow = workflow_map.get(exec.get("workflow_id"), {})

            # Count nodes from execution_events
            events_result = supabase.table("execution_events")\
                .select("node_id, status")\
                .eq("execution_id", exec["id"])\
                .execute()

            events = events_result.data or []
            unique_nodes = set(e["node_id"] for e in events)
            error_count = sum(1 for e in events if e.get("status") == "error")

            enriched.append({
                **exec,
                "workflow": workflow,
                "node_count": len(unique_nodes),
                "error_count": error_count,
            })

        return enriched

    except Exception as e:
        print(f"Error listing executions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/executions/{execution_id}")
async def delete_execution(execution_id: str):
    """
    Delete an execution and all related data.

    Deletes: execution_events, error_embeddings, node_stats, critical_paths, and the execution itself.
    """
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_key)

        # Delete related data first (foreign key constraints)
        supabase.table("execution_events").delete().eq("execution_id", execution_id).execute()
        supabase.table("error_embeddings").delete().eq("execution_id", execution_id).execute()
        supabase.table("node_stats").delete().eq("execution_id", execution_id).execute()
        supabase.table("critical_paths").delete().eq("execution_id", execution_id).execute()

        # Delete the execution
        result = supabase.table("executions").delete().eq("id", execution_id).execute()

        return {"success": True, "message": f"Execution {execution_id} deleted"}

    except Exception as e:
        print(f"Error deleting execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/executions/{execution_id}")
async def get_execution(execution_id: str):
    """
    Get execution metadata by ID.

    Returns execution record with workflow_id, status, duration, etc.
    """
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_key)
        result = supabase.table("executions")\
            .select("*")\
            .eq("id", execution_id)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Execution not found")

        execution = result.data[0]

        # Also fetch workflow info
        workflow_result = supabase.table("workflows")\
            .select("id, name, n8n_workflow_id")\
            .eq("id", execution["workflow_id"])\
            .execute()

        workflow = workflow_result.data[0] if workflow_result.data else None

        return {
            "id": execution["id"],
            "workflow_id": execution["workflow_id"],
            "n8n_execution_id": execution.get("n8n_execution_id"),
            "status": execution.get("status"),
            "started_at": execution.get("started_at"),
            "finished_at": execution.get("finished_at"),
            "duration_ms": execution.get("duration_ms"),
            "trigger_mode": execution.get("trigger_mode"),
            "workflow": workflow
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/executions/{execution_id}/full")
async def get_execution_full(execution_id: str):
    """
    Get full execution data including raw JSON.

    Use this for detailed inspection of the execution.
    """
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_key)
        result = supabase.table("executions")\
            .select("*")\
            .eq("id", execution_id)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Execution not found")

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/{workflow_id}/info")
async def get_workflow_info(workflow_id: str):
    """
    Get workflow metadata by ID.

    Returns workflow record with name, node count, etc.
    Note: /api/workflows/{workflow_id} already exists for graph data,
    so this uses /info suffix for metadata only.
    """
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_key)
        result = supabase.table("workflows")\
            .select("id, name, n8n_workflow_id, node_count, edge_count, created_at")\
            .eq("id", workflow_id)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Workflow not found")

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/{workflow_id}/executions")
async def get_workflow_executions(workflow_id: str, limit: int = 50):
    """
    List all executions for a workflow.

    Returns array of execution summaries, ordered by most recent first.
    """
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_key)

        # Verify workflow exists
        workflow_result = supabase.table("workflows")\
            .select("id, name")\
            .eq("id", workflow_id)\
            .execute()

        if not workflow_result.data:
            raise HTTPException(status_code=404, detail="Workflow not found")

        # Get executions
        result = supabase.table("executions")\
            .select("id, n8n_execution_id, status, started_at, finished_at, duration_ms, trigger_mode")\
            .eq("workflow_id", workflow_id)\
            .order("started_at", desc=True)\
            .limit(limit)\
            .execute()

        return {
            "workflow": workflow_result.data[0],
            "executions": result.data or [],
            "count": len(result.data) if result.data else 0
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/by-execution/{execution_id}")
async def get_workflow_by_execution(execution_id: str):
    """
    Get workflow info for a given execution.

    Useful when you only have the execution ID and need the workflow context.
    """
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_key)

        # Get execution with workflow_id
        exec_result = supabase.table("executions")\
            .select("id, workflow_id, n8n_execution_id, status, duration_ms")\
            .eq("id", execution_id)\
            .execute()

        if not exec_result.data:
            raise HTTPException(status_code=404, detail="Execution not found")

        execution = exec_result.data[0]

        # Get workflow
        workflow_result = supabase.table("workflows")\
            .select("*")\
            .eq("id", execution["workflow_id"])\
            .execute()

        if not workflow_result.data:
            raise HTTPException(status_code=404, detail="Workflow not found")

        workflow = workflow_result.data[0]

        return {
            "execution": execution,
            "workflow": {
                "id": workflow["id"],
                "name": workflow["name"],
                "n8n_workflow_id": workflow.get("n8n_workflow_id"),
                "node_count": workflow.get("node_count"),
                "edge_count": workflow.get("edge_count")
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/n8n/fetch-execution")
async def fetch_n8n_execution(request: N8nFetchRequest):
    """
    Proxy endpoint to fetch execution from n8n API and import it.

    This avoids CORS issues when the frontend tries to call n8n directly.

    Request body:
    {
        "n8n_url": "https://your-n8n-instance.com",
        "execution_id": "12345",
        "api_key": "n8n_api_xxx"
    }

    Returns:
    {
        "success": true,
        "execution_id": "uuid-from-database",
        "workflow_id": "uuid-from-database",
        "analysis_url": "/execution/{id}/analysis"
    }
    """
    try:
        # Normalize the URL
        base_url = request.n8n_url.rstrip('/')
        if not base_url.startswith(('http://', 'https://')):
            base_url = f'https://{base_url}'

        # Build the n8n API URL with includeData=true to get full execution data
        n8n_api_url = f"{base_url}/api/v1/executions/{request.execution_id}?includeData=true"

        # Fetch from n8n API
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                n8n_api_url,
                headers={
                    "X-N8N-API-KEY": request.api_key,
                    "Accept": "application/json"
                }
            )

        # Handle n8n API errors
        if response.status_code == 401:
            raise HTTPException(
                status_code=401,
                detail="Invalid n8n API key. Check your credentials."
            )
        elif response.status_code == 403:
            raise HTTPException(
                status_code=403,
                detail="API key doesn't have permission to access this execution."
            )
        elif response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"Execution {request.execution_id} not found in n8n."
            )
        elif response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"n8n API error: {response.text}"
            )

        # Parse the n8n response
        execution_json = response.json()

        # Debug: log the response structure
        print(f"[n8n-fetch] Response keys: {list(execution_json.keys())}")
        print(f"[n8n-fetch] Has 'data' key: {'data' in execution_json}")
        print(f"[n8n-fetch] Has 'workflowId': {execution_json.get('workflowId')}")
        print(f"[n8n-fetch] Has 'workflowData': {'workflowData' in execution_json}")

        # The n8n API v1 returns the execution object directly
        # Some responses might be wrapped in { "data": execution }
        if "data" in execution_json and isinstance(execution_json["data"], dict):
            # Check if this is a wrapper or the actual execution data
            if "resultData" in execution_json["data"]:
                # This is the actual execution data (data.resultData.runData)
                execution_data = execution_json
            else:
                # This is a wrapper, unwrap it
                execution_data = execution_json["data"]
        else:
            execution_data = execution_json

        print(f"[n8n-fetch] Execution data keys: {list(execution_data.keys())}")
        print(f"[n8n-fetch] Workflow ID: {execution_data.get('workflowId')}")

        # Parse and normalize using our existing parser
        parser = N8nExecutionParser(execution_data)
        normalized = parser.parse()

        print(f"[n8n-fetch] Parsed n8n_workflow_id: {normalized.n8n_workflow_id}")
        print(f"[n8n-fetch] Parsed n8n_execution_id: {normalized.n8n_execution_id}")
        print(f"[n8n-fetch] Parsed event count: {len(normalized.events)}")
        print(f"[n8n-fetch] Parsed status: {normalized.status}")

        # Store in database
        storage = ExecutionStorage()
        execution_uuid = await storage.store_execution(normalized)

        print(f"[n8n-fetch] Stored execution UUID: {execution_uuid}")

        if not execution_uuid:
            raise HTTPException(
                status_code=500,
                detail="Failed to store execution in database"
            )

        # Get the workflow ID from storage (the actual UUID, not n8n ID)
        # We need to query it since the storage doesn't return it
        workflow_uuid = None
        try:
            supabase = create_client(settings.supabase_url, settings.supabase_key)
            exec_result = supabase.table("executions").select("workflow_id").eq("id", execution_uuid).execute()
            if exec_result.data:
                workflow_uuid = exec_result.data[0]["workflow_id"]
        except Exception as e:
            print(f"[n8n-fetch] Error getting workflow UUID: {e}")

        return {
            "success": True,
            "execution_id": execution_uuid,
            "workflow_id": workflow_uuid,
            "n8n_workflow_id": normalized.n8n_workflow_id,
            "n8n_execution_id": normalized.n8n_execution_id,
            "status": normalized.status,
            "event_count": len(normalized.events),
            "duration_ms": normalized.duration_ms,
            "analysis_url": f"/execution/{execution_uuid}/analysis"
        }

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Timeout connecting to n8n API. Check if the URL is correct."
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to n8n: {str(e)}"
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="Invalid JSON response from n8n API"
        )
    except Exception as e:
        print(f"Error fetching from n8n: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing execution: {str(e)}"
        )


# TODO: Add endpoints for:
# - POST /api/workflows (import workflow)
# - POST /api/analyze (trigger analysis)
# - GET /api/workflows/{id}/stats
