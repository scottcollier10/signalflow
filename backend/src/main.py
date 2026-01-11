from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.normalizer.parser import N8nExecutionParser
from src.normalizer.storage import ExecutionStorage
from src.services.workflow_service import WorkflowService
from src.analysis.critical_path import CriticalPathAnalyzer
from src.analysis.bottlenecks import BottleneckAnalyzer
from src.analysis.error_clustering import ErrorClusteringAnalyzer
from supabase import create_client
from datetime import datetime
import json

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


# TODO: Add endpoints for:
# - POST /api/workflows (import workflow)
# - POST /api/analyze (trigger analysis)
# - GET /api/workflows/{id}/stats
# - GET /api/recommendations/{workflow_id}
