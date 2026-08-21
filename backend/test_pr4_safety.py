"""PR #4 safety-contract regression tests.

Credential-free tests protecting the local-safety and demo-portability
guarantees introduced in PR #4. Every test here runs without network,
credentials, or environment variables.

Run: python -m pytest test_pr4_safety.py -v
"""

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
DEMO = ROOT / "demo"

# Env that strips all n8n/demo-specific vars
CLEAN_ENV = {
    k: v for k, v in os.environ.items()
    if k not in {
        "N8N_API_URL", "N8N_API_KEY",
        "N8N_WF3_ID",
        "N8N_HUBSPOT_CRED_ID", "N8N_HUBSPOT_CRED_NAME",
        "N8N_ANTHROPIC_CRED_ID", "N8N_ANTHROPIC_CRED_NAME",
    }
}


# ---------------------------------------------------------------------------
# 1. Browser credential storage safety
# ---------------------------------------------------------------------------

def test_api_key_never_written_to_localstorage():
    """setApiKey must use sessionStorage, never localStorage."""
    source = (FRONTEND / "lib" / "credentials.ts").read_text()

    # setApiKey body must use sessionStorage
    fn_match = re.search(
        r"export function setApiKey\b.*?\n\}",
        source,
        re.DOTALL,
    )
    assert fn_match, "setApiKey function not found in credentials.ts"
    body = fn_match.group()
    assert "sessionStorage" in body, "setApiKey must write to sessionStorage"
    assert "localStorage" not in body, "setApiKey must NOT touch localStorage"


def test_getapikey_reads_sessionstorage():
    """getApiKey must read from sessionStorage only."""
    source = (FRONTEND / "lib" / "credentials.ts").read_text()
    fn_match = re.search(
        r"export function getApiKey\b.*?\n\}",
        source,
        re.DOTALL,
    )
    assert fn_match, "getApiKey function not found in credentials.ts"
    body = fn_match.group()
    assert "sessionStorage" in body, "getApiKey must read from sessionStorage"
    assert "localStorage" not in body, "getApiKey must NOT read from localStorage"


def test_legacy_migration_constants_present():
    """Migration code must reference all three legacy key names."""
    source = (FRONTEND / "lib" / "credentials.ts").read_text()
    for key in ["n8n_api_key", "n8n_instance_url", "signalflow-settings"]:
        assert key in source, f"Legacy key '{key}' missing from credentials.ts migration"


def test_import_page_no_direct_localstorage_apikey():
    """Import page must not write API key directly to localStorage."""
    source = (FRONTEND / "app" / "import" / "page.tsx").read_text()
    # Must not contain the old pattern
    assert "localStorage.setItem('n8n_api_key'" not in source, \
        "Import page still writes API key to localStorage"
    assert "localStorage.setItem(\"n8n_api_key\"" not in source, \
        "Import page still writes API key to localStorage"


def test_settings_page_no_apikey_in_blob():
    """Settings page must not store n8nApiKey inside the JSON blob object."""
    source = (FRONTEND / "app" / "settings" / "page.tsx").read_text()
    # Find the settings object literal that gets written to localStorage
    obj_match = re.search(
        r"const settings\s*=\s*\{(.*?)\};",
        source,
        re.DOTALL,
    )
    assert obj_match, "settings object literal not found in settings/page.tsx"
    obj_body = obj_match.group(1)
    assert "n8nApiKey" not in obj_body, \
        "settings blob still includes n8nApiKey"
    assert "n8nUrl" not in obj_body, \
        "settings blob still includes n8nUrl"


# ---------------------------------------------------------------------------
# 2. No maintainer-specific values in demo scripts
# ---------------------------------------------------------------------------

BANNED_PATTERNS = [
    r"scottcollier",
    r"cajclfnTNjb94L3J",       # old HubSpot cred ID
    r"ACpyxUk8B8NfGOc8",       # old Anthropic cred ID
    r"UL1TiuFvfDWtsDEF",       # old hardcoded WF3 ID
    r"S2LBskBqoo1fHCTO",       # old WF1 n8n ID
    r"r4ezuLjS8LxFmzur",       # old WF2 n8n ID
    r"\.claude\.json",          # old config file path
]


def test_no_maintainer_ids_in_demo():
    """Demo scripts must not contain hardcoded maintainer-specific IDs."""
    demo_files = list(DEMO.glob("*.py")) + list(DEMO.glob("*.md"))
    for path in demo_files:
        content = path.read_text()
        for pattern in BANNED_PATTERNS:
            assert not re.search(pattern, content), \
                f"{path.name} contains banned pattern: {pattern}"


def test_no_maintainer_ids_in_docs():
    """Docs must not contain hardcoded maintainer-specific IDs."""
    docs = ROOT / "docs"
    for path in docs.glob("*.md"):
        content = path.read_text()
        for pattern in BANNED_PATTERNS:
            assert not re.search(pattern, content), \
                f"{path.name} contains banned pattern: {pattern}"


# ---------------------------------------------------------------------------
# 3. Demo builders: offline preview, gated apply, gated activate
# ---------------------------------------------------------------------------

BUILDERS = ["build_wf1.py", "build_wf2.py", "build_wf3.py", "build_wf3_v2.py"]


def _run_builder(script, args=None):
    """Run a demo builder script and return (returncode, stdout+stderr)."""
    cmd = [sys.executable, str(DEMO / script)] + (args or [])
    result = subprocess.run(
        cmd, capture_output=True, text=True, env=CLEAN_ENV, timeout=10,
    )
    return result.returncode, result.stdout + result.stderr


def test_plain_builders_succeed_offline():
    """All builders exit 0 with no env vars and no flags."""
    for script in BUILDERS:
        rc, output = _run_builder(script)
        assert rc == 0, f"{script} failed dry run (rc={rc}): {output}"
        assert "Dry run" in output, f"{script} missing dry-run message"


def test_apply_requires_env_vars():
    """--apply must fail when N8N_API_URL/N8N_API_KEY are not set."""
    for script in BUILDERS:
        rc, output = _run_builder(script, ["--apply"])
        assert rc != 0, f"{script} --apply should fail without env vars"


def test_activate_requires_apply():
    """--activate without --apply must be rejected by argparse."""
    for script in BUILDERS:
        rc, output = _run_builder(script, ["--activate"])
        assert rc != 0, f"{script} --activate without --apply should fail"
        assert "requires --apply" in output.lower() or "error" in output.lower(), \
            f"{script} should say --activate requires --apply: {output}"


def test_wf3_v2_defers_wf_id_check():
    """build_wf3_v2 must not require N8N_WF3_ID for dry run."""
    rc, output = _run_builder("build_wf3_v2.py")
    assert rc == 0, f"build_wf3_v2 dry run failed: {output}"
    assert "N8N_WF3_ID" in output, \
        "build_wf3_v2 dry run should mention N8N_WF3_ID as a note"


# ---------------------------------------------------------------------------
# 4. n8n_api.py is import-safe
# ---------------------------------------------------------------------------

def test_n8n_api_importable_without_env():
    """Importing n8n_api must not crash when env vars are missing."""
    cmd = [sys.executable, "-c", "import n8n_api; print('OK')"]
    result = subprocess.run(
        cmd, capture_output=True, text=True, env=CLEAN_ENV,
        cwd=str(DEMO), timeout=10,
    )
    assert result.returncode == 0, \
        f"n8n_api import failed without env vars: {result.stderr}"
    assert "OK" in result.stdout


# ---------------------------------------------------------------------------
# 5. Deleted files stay deleted
# ---------------------------------------------------------------------------

def test_imported_json_removed():
    """demo/imported.json and demo/imported_v2.json must not exist."""
    assert not (DEMO / "imported.json").exists(), "demo/imported.json still exists"
    assert not (DEMO / "imported_v2.json").exists(), "demo/imported_v2.json still exists"
