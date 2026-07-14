from supabase import create_client, Client, ClientOptions
from app.config import settings


def get_supabase_service_client() -> Client:
    """
    Returns a Supabase client configured with the service role key.
    This client bypasses Row Level Security (RLS) policies.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
        options=ClientOptions(
            postgrest_client_timeout=10,
            storage_client_timeout=10,
        ),
    )


def get_supabase_user_client(access_token: str) -> Client:
    """
    Returns a Supabase client configured for a specific authenticated user.
    This client respects RLS policies by passing the user's JWT access token.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
        options=ClientOptions(
            headers={"Authorization": f"Bearer {access_token}"},
            postgrest_client_timeout=10,
            storage_client_timeout=10,
        ),
    )
