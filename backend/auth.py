from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

supabase_admin: Client | None = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

security = HTTPBearer()


def get_supabase_admin() -> Client:
    if not supabase_admin:
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_SERVICE_ROLE_KEY is not configured on the server",
        )
    return supabase_admin


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Extracts the JWT from the Authorization header and verifies it with Supabase.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase client is not configured")

    token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(token)

        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        return user_response.user

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


def require_admin(user=Depends(verify_token)):
    """
    Verifies the JWT and ensures the caller has is_admin = true in profiles.
    """
    admin_client = get_supabase_admin()

    try:
        profile_response = (
            admin_client.table("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify admin privileges: {str(e)}",
        ) from e

    if not profile_response.data or not profile_response.data.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    return user
