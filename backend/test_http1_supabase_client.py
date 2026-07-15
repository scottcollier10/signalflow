"""
Bug-fix tests: API-layer Supabase clients must speak HTTP/1.1, not HTTP/2.

Why: supabase-py's default httpx session enables HTTP/2, and httpx's sync
HTTP/2 connection is not reliably safe under concurrent threads — parallel
requests multiplexed onto one h2 connection intermittently corrupt the
framing, the server replies GOAWAY (ConnectionTerminated error_code:1) and
reads fail with [Errno 35]. Measured against hosted Supabase: 16/48
concurrent reads failed on a shared default client, 0/288 with HTTP/1.1.
This bit _store_clusters (dropped cluster inserts after the delete) and
intermittently 500'd /error-analysis under the page's parallel fetches.
Over HTTP/1.1 each concurrent request gets its own pooled connection,
which httpx handles safely across threads.

Run: python test_http1_supabase_client.py
"""

import sys

sys.path.insert(0, ".")

from supabase import create_client as supabase_default_create_client

from src.db import create_http1_supabase_client


URL = "https://example-project.supabase.co"
KEY = "test-key"


def _pool_http2(client):
    return client.postgrest.session._transport._pool._http2


def test_factory_disables_http2():
    """The factory's postgrest session must run HTTP/1.1."""
    db = create_http1_supabase_client(URL, KEY)
    assert _pool_http2(db) is False, (
        "postgrest session negotiates HTTP/2 — concurrent threaded requests "
        "will intermittently corrupt the connection"
    )
    print("✅ Factory client's postgrest session is HTTP/1.1")


def test_default_client_still_http2():
    """Documents why the factory exists: stock create_client is HTTP/2.
    If this fails, supabase-py changed its default and the factory can go."""
    db = supabase_default_create_client(URL, KEY)
    assert _pool_http2(db) is True, (
        "stock supabase client no longer uses HTTP/2 — factory may be obsolete"
    )
    print("✅ Stock client still defaults to HTTP/2 (factory still needed)")


def test_session_routes_to_rest_url():
    """Injected session must carry the PostgREST base URL, or every
    table()/rpc() call would hit a relative path with no host."""
    db = create_http1_supabase_client(URL, KEY)
    base = str(db.postgrest.session.base_url)
    assert base.rstrip("/") == f"{URL}/rest/v1", f"got {base}"
    print("✅ Injected session routes to /rest/v1")


def test_session_authenticates():
    """Auth headers must survive the injection (apikey + bearer). postgrest
    applies its own headers per request, not on the injected session."""
    db = create_http1_supabase_client(URL, KEY)
    headers = db.postgrest.headers
    assert headers.get("apikey") == KEY
    assert headers.get("authorization") == f"Bearer {KEY}"
    print("✅ postgrest layer carries apikey + bearer auth per request")


def test_api_layer_uses_factory():
    """main.py's create_client must BE the factory, so every endpoint's
    per-request client is HTTP/1.1."""
    from src import main
    assert main.create_client is create_http1_supabase_client, (
        "src.main still uses supabase.create_client directly"
    )
    print("✅ API layer endpoints build clients through the factory")


if __name__ == "__main__":
    tests = [
        test_factory_disables_http2,
        test_default_client_still_http2,
        test_session_routes_to_rest_url,
        test_session_authenticates,
        test_api_layer_uses_factory,
    ]
    failures = 0
    for test in tests:
        try:
            test()
        except AssertionError as e:
            failures += 1
            print(f"❌ {test.__name__}: {e}")
    print("=" * 60)
    if failures:
        print(f"❌ {failures}/{len(tests)} tests FAILED")
        sys.exit(1)
    print(f"✅ All {len(tests)} tests passed")
    print("=" * 60)
