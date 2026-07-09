"""Minimal n8n REST API helper for building SignalFlow demo workflows."""
import json
import urllib.request

_cfg = json.load(open('/Users/scottcollier/.claude.json'))
_env = _cfg['mcpServers']['n8n-mcp']['env']
BASE = _env['N8N_API_URL']
KEY = _env['N8N_API_KEY']


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{BASE}/api/v1{path}",
        data=data,
        method=method,
        headers={"X-N8N-API-KEY": KEY, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:2000]}")
        raise


def webhook(path_suffix, body=None):
    """Call a production webhook on the instance."""
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(
        f"{BASE}/webhook/{path_suffix}",
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        return resp.status, resp.read().decode()[:500]
