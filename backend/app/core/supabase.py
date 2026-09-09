"""
Supabase Client Singleton for ScheduleSync
Provides access to Supabase Auth, Storage (file/photo upload buckets), and Realtime.
"""

import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """
    Returns the initialized Supabase client using SUPABASE_URL and SERVICE_ROLE_KEY or ANON_KEY.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY

    if not url or not key:
        logger.info("Supabase URL or Key not set in .env. Supabase client disabled.")
        return None

    try:
        _supabase_client = create_client(url, key)
        logger.info("Supabase client successfully initialized.")
        return _supabase_client
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {e}")
        return None
