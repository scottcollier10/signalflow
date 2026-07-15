"""Supabase client construction for the API layer.

supabase-py's default httpx session enables HTTP/2, and httpx's sync HTTP/2
connection is not reliably safe under concurrent threads: parallel requests
multiplexed onto the one h2 connection intermittently corrupt the framing,
the server replies GOAWAY (ConnectionTerminated error_code:1) and reads fail
with [Errno 35]. The analysis endpoints fan blocking Supabase calls out
across threads (asyncio.to_thread + gather), so they hit this. Injecting an
HTTP/1.1 client sidesteps it: each concurrent request gets its own pooled
connection, which httpx handles safely across threads.
"""

import httpx
from postgrest.constants import DEFAULT_POSTGREST_CLIENT_TIMEOUT
from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions


def create_http1_supabase_client(url: str, key: str) -> Client:
    """Drop-in replacement for supabase.create_client with HTTP/2 disabled."""
    http1_session = httpx.Client(
        http2=False,
        base_url=f"{url}/rest/v1",
        follow_redirects=True,
        timeout=DEFAULT_POSTGREST_CLIENT_TIMEOUT,
    )
    return create_client(
        url, key, options=SyncClientOptions(httpx_client=http1_session)
    )
