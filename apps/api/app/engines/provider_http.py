"""Reusable routing connections; no credentials or request bodies are stored here."""

import asyncio
from weakref import WeakKeyDictionary

import httpx

_clients: WeakKeyDictionary[asyncio.AbstractEventLoop, httpx.AsyncClient] = WeakKeyDictionary()


def routing_http_client() -> httpx.AsyncClient:
    loop = asyncio.get_running_loop()
    client = _clients.get(loop)
    if client is None or client.is_closed:
        client = httpx.AsyncClient(
            timeout=None,
            limits=httpx.Limits(
                max_connections=32, max_keepalive_connections=16, keepalive_expiry=30
            ),
        )
        _clients[loop] = client
    return client


async def close_provider_http() -> None:
    client = _clients.pop(asyncio.get_running_loop(), None)
    if client is not None:
        await client.aclose()
