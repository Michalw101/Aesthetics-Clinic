from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client
from typing import Literal, Any
import os
import re
from dotenv import load_dotenv

from google import genai
from google.genai import types

# טעינת משתני סביבה מקובץ .env
load_dotenv()

app = FastAPI(title="Aesthetics Clinic Backend")

# הגדרת CORS כדי לאפשר לפרונטאנד לתקשר עם הבקאנד
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # מאפשר לכל כתובת לפנות לשרת (מעולה ל-POC)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# הגדרת פרטי התחברות ל-Supabase ממשתני הסביבה
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# בדיקה שהמשתנים קיימים לפני יצירת הקליינט
if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in environment variables")
    supabase: Client = None
else:
    # יצירת חיבור ל-Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def _resolve_gemini_model(raw: str | None) -> str:
    """מנרמל שם מודל מ-.env (בלי models/) ומחליף מודלים שהוסרו מה-API."""
    name = (raw or "gemini-2.5-flash").strip()
    if name.startswith("models/"):
        name = name.removeprefix("models/")
    legacy = {
        "gemini-1.5-flash": "gemini-2.5-flash",
        "gemini-1.5-flash-latest": "gemini-2.5-flash",
        "gemini-1.5-pro": "gemini-2.5-flash",
        "gemini-1.5-pro-latest": "gemini-2.5-flash",
        "gemini-pro": "gemini-2.5-flash",
    }
    resolved = legacy.get(name, name)
    if resolved != name:
        print(f"GEMINI_MODEL: {name!r} הוחלף ב-{resolved!r} (מודל לא נתמך יותר)")
    return resolved


GEMINI_MODEL = _resolve_gemini_model(os.getenv("GEMINI_MODEL"))

SYSTEM_INSTRUCTION = """
את אסיסטנטית Aesthetics Clinic, עוזרת וירטואלית ויועצת יופי רשמית של הקליניקה.
התקשורת שלך היא בעברית בלבד.
הטון שלך הוא מקצועי, אמפתי, מזמין ובעל ידע רב בטיפוח העור וקוסמטיקה.
התשובות צריכות להיות תמציתיות, קלות לקריאה ומובנות.

מטרות עיקריות:
1. המלצה על מוצרי טיפוח בהתאם לסוג העור והצרכים של המשתמש.
2. מתן מידע על טיפולים קוסמטיים המוצעים בקליניקה.
3. סיוע והכוונה למשתמשים כיצד לקבוע תור או לבדוק סטטוס הזמנה.

חוקים ומגבלות:
- אין לתת ייעוץ רפואי: אם משתמש מתאר מצב עור חמור (למשל: אקנה קשה, זיהומים, פריחות לא מוסברות), עלייך להמליץ לו להתייעץ עם רופא עור.
- מגבלות מלאי וקביעת תורים: אין לך גישה בזמן אמת ליומן או למלאי. אם משתמש מבקש לקבוע תור לשעה ספציפית, כווני אותו בנימוס לדף "קביעת תורים" באתר.
- עגלת קניות ותשלום: אם משתמש רוצה לקנות מוצר שהמלצת עליו, הנחי אותו לחפש אותו ב"חנות מוצרים" ולהוסיף אותו לעגלה.

דוגמאות לאינטראקציה:
משתמש: "יש לי עור מאוד יבש, מה כדאי לי לשים?"
AI: "שלום! לעור יבש אני ממליצה לשלב שגרת טיפוח הכוללת סרום חומצה היאלורונית וקרם לחות עשיר. תוכלי למצוא מגוון מוצרים מתאימים בחנות שלנו תחת הקטגוריה 'עור יבש'. האם תרצי שאפרט על מוצרים ספציפיים?"

משתמש: "איך אני קובעת תור לטיפול פנים?"
AI: "זה פשוט מאוד! היכנסי לאזור 'קביעת תורים' באזור האישי שלך באתר, בחרי את סוג הטיפול (טיפול פנים), ותוכלי לראות את כל התאריכים והשעות הפנויים ביומן של הקליניקה. צריכה עזרה נוספת?"
"""


# הגדרת מבנה הנתונים הצפוי בבקשה (Schema)
class UserInput(BaseModel):
    name: str
    content: str


class ChatPart(BaseModel):
    text: str


class ChatTurn(BaseModel):
    role: Literal["user", "model"]
    parts: list[ChatPart] = Field(min_length=1)


class ChatRequest(BaseModel):
    """היסטוריית צ'אט בפורמט Gemini: role + parts עם טקסט."""
    messages: list[ChatTurn] = Field(min_length=1)


class ChatResponse(BaseModel):
    reply: str


class ProductOut(BaseModel):
    id: str
    name: str
    brand: str
    category: str
    price: float
    image_url: str | None = None
    stock: int = 0


class ProductSearchResponse(BaseModel):
    products: list[ProductOut]
    count: int
    
class AddToCartRequest(BaseModel):
    user_id: str      
    product_id: str  
    quantity: int = Field(default=1, gt=0) 

def _sanitize_search_param(value: str | None, *, max_length: int = 120) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if len(cleaned) > max_length:
        raise HTTPException(
            status_code=400,
            detail=f"פרמטר החיפוש ארוך מדי (מקסימום {max_length} תווים)",
        )
    if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", cleaned):
        raise HTTPException(status_code=400, detail="פרמטר חיפוש לא תקין")
    return cleaned


def _row_to_product(row: dict[str, Any]) -> ProductOut:
    return ProductOut(
        id=str(row["id"]),
        name=row["name"],
        brand=row.get("brand") or "",
        category=row.get("category") or "",
        price=float(row["price"]),
        image_url=row.get("image_url"),
        stock=int(row.get("stock") or 0),
    )


def _search_products_direct(
    search_term: str | None,
    category_filter: str | None,
) -> list[dict[str, Any]]:
    query = supabase.table("products").select("*")

    if search_term:
        pattern = f"{search_term}%"
        query = query.or_(
            f"name.ilike.{pattern},category.ilike.{pattern},brand.ilike.{pattern}"
        )

    if category_filter:
        query = query.ilike("category", f"{category_filter}%")

    response = query.order("name").execute()
    return response.data or []


def _search_products_in_supabase(
    search_term: str | None,
    category_filter: str | None,
) -> list[ProductOut]:
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")

    try:
        rows = _search_products_direct(search_term, category_filter)
    except Exception as e:
        print(f"Error querying products from Supabase: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="שגיאה בגישה לטבלת products ב-Supabase. בדקי SUPABASE_URL ו-SUPABASE_KEY ב-backend/.env",
        ) from e

    return [_row_to_product(row) for row in rows]


def _messages_to_gemini_contents(messages: list[ChatTurn]) -> list[types.Content]:
    out: list[types.Content] = []
    for turn in messages:
        text = "\n".join(p.text for p in turn.parts)
        role = "model" if turn.role == "model" else "user"
        out.append(types.Content(role=role, parts=[types.Part.from_text(text=text)]))
    return out


def _last_user_question(messages: list[ChatTurn]) -> str:
    for turn in reversed(messages):
        if turn.role == "user" and turn.parts:
            return turn.parts[-1].text
    return ""


@app.get("/")
def home():
    return {"message": "השרת פעיל ומוכן לקבל בקשות"}


@app.get("/api/products", response_model=ProductSearchResponse)
def list_products():
    """מחזיר את כל המוצרים מ-Supabase (לתצוגה בחנות)."""
    products = _search_products_in_supabase(None, None)
    return ProductSearchResponse(products=products, count=len(products))


@app.get("/api/products/search", response_model=ProductSearchResponse)
def search_products(
    q: str | None = Query(
        default=None,
        description="חיפוש לפי שם מוצר, מותג או קטגוריה",
    ),
    category: str | None = Query(
        default=None,
        description="סינון נוסף לפי קטגוריה",
    ),
):
    """
    Task 2 + 3: חיפוש מוצרים ב-Supabase (RPC search_products).
    דורש לפחות אחד מהפרמטרים q או category.
    """
    search_term = _sanitize_search_param(q)
    category_filter = _sanitize_search_param(category)

    if not search_term and not category_filter:
        raise HTTPException(
            status_code=400,
            detail="יש להזין מילת חיפוש (q) או קטגוריה (category)",
        )

    products = _search_products_in_supabase(search_term, category_filter)
    return ProductSearchResponse(products=products, count=len(products))


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    """
    מקבל הודעות מהפרונטאנד, קורא ל-Gemini בצד השרת, שומר שאלה+תשובה ב-Supabase (טבלה data_table),
    ומחזיר את תשובת המודל.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY לא מוגדר בשרת")

    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")

    contents = _messages_to_gemini_contents(payload.messages)
    question = _last_user_question(payload.messages)

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        result = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION.strip(),
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"שגיאה בקריאה ל-Gemini: {str(e)}")

    reply = (result.text or "").strip()
    if not reply:
        raise HTTPException(status_code=502, detail="תשובה ריקה מ-Gemini")

    row = {"question": question, "answer": reply}
    try:
        supabase.table("data_table").insert(row).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בשמירה ל-Supabase (data_table): {str(e)}")

    return ChatResponse(reply=reply)


@app.post("/add_data")
async def add_data(user_data: UserInput):
    """
    נקודת קצה שמקבלת נתונים מה-Frontend ושומרת אותם בטבלה ב-Supabase.
    יש לוודא קיום טבלה בשם 'user_inputs' ב-Supabase.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="חיבור ל-Supabase לא הוגדר כראוי")
    
    try:
        # הזנת הנתונים לטבלה 'user_inputs'
        # עמודות בטבלה: user_name, content
        data = {
            "user_name": user_data.name,
            "content": user_data.content
        }
        
        response = supabase.table("user_inputs").insert(data).execute()
        
        # החזרת תשובה חיובית למשתמש
        return {"status": "success", "data": response.data}
        
    except Exception as e:
        # טיפול בשגיאות (למשל אם הטבלה לא קיימת או בעיית תקשורת)
        raise HTTPException(status_code=400, detail=f"שגיאה בשמירת הנתונים: {str(e)}")

# ==========================================
# Add to Cart & View Cart
# ==========================================

@app.post("/api/cart/add")
async def add_to_cart(payload: AddToCartRequest):
    """
    מוסיף מוצר לעגלה של המשתמש ב-Supabase.
    אם המוצר כבר קיים בעגלה של אותו משתמש -> מעדכן את הכמות (מוסיף עליה).
    אם המוצר לא קיים -> יוצר שורה חדשה.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")

    try:
        # 1. בדיקה האם המוצר כבר קיים בעגלה של המשתמש הספציפי הזה
        existing_item = (
            supabase.table("cart_items")
            .select("*")
            .eq("user_id", payload.user_id)
            .eq("product_id", payload.product_id)
            .execute()
        )

        if existing_item.data:
            # המוצר כבר בעגלה -> נחשב את הכמות החדשה ונעדכן את השורה הקיימת
            current_qty = existing_item.data[0]["quantity"]
            new_qty = current_qty + payload.quantity
            
            response = (
                supabase.table("cart_items")
                .update({"quantity": new_qty})
                .eq("id", existing_item.data[0]["id"])
                .execute()
            )
            message = "כמות המוצר בעגלה עודכנה בהצלחה"
        else:
            # המוצר לא בעגלה -> נוסיף שורה חדשה לגמרי
            data = {
                "user_id": payload.user_id,
                "product_id": payload.product_id,
                "quantity": payload.quantity
            }
            response = supabase.table("cart_items").insert(data).execute()
            message = "המוצר התווסף לעגלה בהצלחה"

        return {"status": "success", "message": message, "data": response.data}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"שגיאה בהוספת המוצר לעגלה: {str(e)}")


@app.get("/api/cart")
async def view_cart(user_id: str = Query(..., description="ID של המשתמש לצורך שליפת העגלה")):
    """
    שולף את כל הפריטים שנמצאים בעגלה של משתמש ספציפי מתוך Supabase.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")
        
    try:
        response = supabase.table("cart_items").select("*").eq("user_id", user_id).execute()
        return {
            "status": "success",
            "user_id": user_id,
            "cart_items": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"שגיאה בשליפת נתוני העגלה: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # הרצה על פורט 3000 כברירת מחדל לסביבה זו
    uvicorn.run(app, host="0.0.0.0", port=3000)


if __name__ == "__main__":
    import uvicorn
    # הרצה על פורט 3000 כברירת מחדל לסביבה זו
    uvicorn.run(app, host="0.0.0.0", port=3000)
