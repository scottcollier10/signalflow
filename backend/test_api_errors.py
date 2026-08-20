"""
Test API error handling.

Verifies:
1. Internal exception details never leak to API clients (generic messages only,
   real exception logged server-side).
2. Upload endpoints enforce a file-size cap and a top-level JSON shape guard.
3. storage.store_execution logs DB failures instead of silently returning None.

Run: venv/bin/python test_api_errors.py
"""

import asyncio
import json
import logging
import sys
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from src.main import app

MARKER = "SECRET-INTERNAL-DETAIL-XYZ"
MAIN_PY = Path(__file__).parent / "src" / "main.py"
FIXTURE = Path(__file__).parent / "fixtures" / "n8n_execution_sample.json"

client = TestClient(app)


def test_no_str_e_in_http_details():
    """Source-level sweep: no except Exception block leaks str(e) to clients.

    ValueError handlers are exempt: those messages are raised deliberately by
    analyzers as client-safe text. The leak pattern is generic Exception
    handlers echoing internal error strings.
    """
    print("\n=== Test: no str(e) leaks from except Exception blocks in main.py ===")
    source = MAIN_PY.read_text()

    lines = source.splitlines()
    offenders = []
    for i, line in enumerate(lines):
        if "except Exception" in line:
            window = "\n".join(lines[i : i + 8])
            if "str(e)" in window:
                offenders.append(i + 1)
    assert not offenders, (
        f"except Exception blocks leaking str(e) at main.py lines: {offenders}"
    )
    # f-string embeds that leak exception content to clients
    for leaky in [
        'Failed to connect to n8n: {str(e)}',
        'Error processing execution: {str(e)}',
        'Could not reach n8n instance: {str(e)}',
    ]:
        assert leaky not in source, f"main.py still embeds str(e) in: {leaky}"

    # The real exception must be logged server-side instead
    assert "import logging" in source, "main.py should log exceptions server-side"
    assert "logger.exception" in source or "logger.error" in source, (
        "main.py should log the real exception (logger.exception/error)"
    )
    print("✅ No str(e) leaks in HTTPException details; server-side logging present")


def test_parse_endpoint_does_not_leak():
    """Parser blow-up on /api/parse-execution returns a generic message."""
    print("\n=== Test: /api/parse-execution hides internal errors ===")

    with patch("src.main.N8nExecutionParser", side_effect=Exception(MARKER)):
        resp = client.post(
            "/api/parse-execution",
            files={"file": ("exec.json", b'{"id": "1"}', "application/json")},
        )

    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert MARKER not in resp.text, f"Internal error leaked to client: {resp.text}"
    print(f"✅ 400 with generic detail: {resp.json()['detail']}")


def test_normalize_endpoint_does_not_leak():
    """Parser blow-up on /api/normalize-execution returns a generic message."""
    print("\n=== Test: /api/normalize-execution hides internal errors ===")

    with patch("src.main.N8nExecutionParser", side_effect=Exception(MARKER)):
        resp = client.post(
            "/api/normalize-execution",
            files={"file": ("exec.json", b'{"id": "1"}', "application/json")},
        )

    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert MARKER not in resp.text, f"Internal error leaked to client: {resp.text}"
    print(f"✅ 400 with generic detail: {resp.json()['detail']}")


def test_db_endpoints_do_not_leak():
    """DB/service blow-ups return generic 500s, not exception strings."""
    print("\n=== Test: DB-backed endpoints hide internal errors ===")

    with patch("src.main.WorkflowService", side_effect=Exception(MARKER)):
        resp = client.get("/api/workflows")
    assert resp.status_code == 500, f"Expected 500, got {resp.status_code}"
    assert MARKER not in resp.text, f"/api/workflows leaked: {resp.text}"
    print(f"✅ /api/workflows: 500 with generic detail: {resp.json()['detail']}")

    with patch("src.main.create_client", side_effect=Exception(MARKER)):
        resp = client.get("/api/workflows/some-id/raw-json")
    assert resp.status_code == 500, f"Expected 500, got {resp.status_code}"
    assert MARKER not in resp.text, f"raw-json leaked: {resp.text}"
    print(f"✅ raw-json: 500 with generic detail: {resp.json()['detail']}")


def test_upload_size_cap():
    """Uploads over the size cap are rejected with 413."""
    print("\n=== Test: upload size cap ===")

    oversized = b'{"pad": "' + b"x" * (10 * 1024 * 1024) + b'"}'  # > 10MB
    for endpoint in ["/api/parse-execution", "/api/normalize-execution"]:
        resp = client.post(
            endpoint,
            files={"file": ("big.json", oversized, "application/json")},
        )
        assert resp.status_code == 413, (
            f"{endpoint}: expected 413 for oversized upload, got {resp.status_code}"
        )
        print(f"✅ {endpoint}: 413 for oversized upload")


def test_upload_shape_guard():
    """Valid JSON that isn't an object is rejected with 400 before parsing."""
    print("\n=== Test: upload JSON shape guard ===")

    for bad_body in [b"[1, 2, 3]", b'"just a string"', b"42"]:
        for endpoint in ["/api/parse-execution", "/api/normalize-execution"]:
            resp = client.post(
                endpoint,
                files={"file": ("exec.json", bad_body, "application/json")},
            )
            assert resp.status_code == 400, (
                f"{endpoint}: expected 400 for non-object JSON {bad_body!r}, "
                f"got {resp.status_code}"
            )
            detail = resp.json()["detail"]
            assert "json object" in detail.lower(), (
                f"{endpoint}: detail should say a JSON object is expected, got: {detail}"
            )
    print("✅ Non-object JSON rejected with 400 on both endpoints")


def test_storage_logs_db_failure():
    """store_execution logs the real DB failure (not just print) and returns None."""
    print("\n=== Test: storage logs DB failures ===")

    from src.normalizer.parser import N8nExecutionParser

    normalized = N8nExecutionParser(json.loads(FIXTURE.read_text())).parse()

    class BoomClient:
        def table(self, name):
            raise Exception(MARKER)

    records = []

    class Capture(logging.Handler):
        def emit(self, record):
            records.append(record)

    storage_logger = logging.getLogger("src.normalizer.storage")
    handler = Capture()
    storage_logger.addHandler(handler)
    old_level = storage_logger.level
    storage_logger.setLevel(logging.DEBUG)

    try:
        with patch("src.normalizer.storage.create_client", return_value=BoomClient()):
            from src.normalizer.storage import ExecutionStorage

            result = asyncio.run(
                ExecutionStorage().store_execution(normalized)
            )
    finally:
        storage_logger.removeHandler(handler)
        storage_logger.setLevel(old_level)

    assert result is None, "Contract: store_execution returns None on failure"

    error_records = [r for r in records if r.levelno >= logging.ERROR]
    assert error_records, (
        "Expected an ERROR-level log record from src.normalizer.storage on DB failure"
    )
    assert any(r.exc_info for r in error_records), (
        "Expected the exception traceback (exc_info) to be logged"
    )
    print(f"✅ DB failure logged at ERROR with traceback; returned None")


def main():
    tests = [
        test_no_str_e_in_http_details,
        test_parse_endpoint_does_not_leak,
        test_normalize_endpoint_does_not_leak,
        test_db_endpoints_do_not_leak,
        test_upload_size_cap,
        test_upload_shape_guard,
        test_storage_logs_db_failure,
    ]

    print("=" * 60)
    print("API ERROR HANDLING TESTS")
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
