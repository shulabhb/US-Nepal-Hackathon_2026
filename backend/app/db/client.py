"""
Supabase client (optional).

If `SUPABASE_URL` and `SUPABASE_KEY` are set, `get_supabase()` returns a client.
Otherwise returns None — routes can stay stubs until persistence is wired.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    from supabase import Client

_supabase: Client | None = None


def get_supabase() -> Client | None:
    """Lazy singleton; None when credentials are missing."""
    global _supabase
    if not settings.supabase_url or not settings.supabase_key:
        return None
    if _supabase is None:
        from supabase import create_client

        _supabase = create_client(settings.supabase_url, settings.supabase_key)
    return _supabase


# Inserts and reads: see app.services.checkins
