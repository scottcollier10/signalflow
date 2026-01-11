from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.normalizer.parser import N8nExecutionParser
from src.normalizer.storage import ExecutionStorage
from src.services.workflow_service import WorkflowService
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


# TODO: Add endpoints for:
# - POST /api/workflows (import workflow)
# - POST /api/analyze (trigger analysis)
# - GET /api/workflows/{id}/stats
# - GET /api/recommendations/{workflow_id}
