import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

# אנחנו מייצרים פה קליינט סופבייס ייעודי לבדיקת הרשאות (משתמש באותם משתנים שכבר יש לך ב-.env!)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

auth_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    פונקציית אבטחה שנעזרת בשרת הרשמי של Supabase כדי לאמת את הטוקן.
    עובדת ב-100% מול כל סוגי ההצפנות (Symmetric / ECC / RSA) ללא צורך במפתחות נוספים!
    """
    if not auth_client:
        raise HTTPException(status_code=500, detail="Supabase connection not configured")

    token = credentials.credentials

    try:
        # הקסם: נותנים ל-Supabase עצמו לבדוק את החתימה של הטוקן
        user_response = auth_client.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

        return {
            "uid": user_response.user.id,
            "email": user_response.user.email,
            "role": "authenticated"
        }

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again."
        )