"""Minimal n8n REST API helper for building SignalFlow demo workflows.

Requires environment variables (validated on first API call, not at import):
  N8N_API_URL  — e.g. https://n8n.example.com
  N8N_API_KEY  — n8n API key (Settings > API)
"""
import os
import json
import urllib.request


def _get_config():
    base = os.environ.get("N8N_API_URL", "")
    key = os.environ.get("N8N_API_KEY", "")
    if not base or not key:
        raise SystemExit(
            "N8N_API_URL and N8N_API_KEY are required for --apply/--activate.\n"
            "  export N8N_API_URL=https://your-n8n-instance.com\n"
            "  export N8N_API_KEY=n8n_api_..."
        )
    return base, key


def call(method, path, body=None):
    base, key = _get_config()
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{base}/api/v1{path}",
        data=data,
        method=method,
        headers={"X-N8N-API-KEY": key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:2000]}")
        raise


def webhook(path_suffix, body=None):
    """Call a production webhook on the instance."""
    base, _ = _get_config()
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(
        f"{base}/webhook/{path_suffix}",
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        return resp.status, resp.read().decode()[:500]
