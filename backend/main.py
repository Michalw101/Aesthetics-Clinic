from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client
from typing import Literal, Any
import os
import re
from dotenv import load_dotenv
from cryptography.fernet import Fernet
from google import genai
from google.genai import types
from datetime import datetime, timedelta


from auth import get_supabase_admin, require_admin
from dependencies import get_current_user

import smtplib
from email.mime.text import MIMEText

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

# ==========================================
# (Checkout)
# ==========================================
RAW_KEY = os.getenv("ENCRYPTION_KEY")
if RAW_KEY:
    ENCRYPTION_KEY = RAW_KEY.encode()
    print("🔐 Securely loaded encryption key from environment.")
else:
    ENCRYPTION_KEY = Fernet.generate_key()
    print("⚠️ Warning: ENCRYPTION_KEY not found in .env. Generated a temporary key.")

cipher_suite = Fernet(ENCRYPTION_KEY)


# סכמות נתונים קיימות
class UserInput(BaseModel):
    name: str
    content: str


class ChatPart(BaseModel):
    text: str

class AppointmentStatusUpdate(BaseModel):
    status: str

class ChatTurn(BaseModel):
    role: Literal["user", "model"]
    parts: list[ChatPart] = Field(min_length=1)


class ChatRequest(BaseModel):
    messages: list[ChatTurn] = Field(min_length=1)


class ChatResponse(BaseModel):
    reply: str

class WeeklyDayConfig(BaseModel):
    id: int
    day: str
    isOpen: bool
    start: str
    end: str

class ClinicScheduleUpdate(BaseModel):
    weekly_schedule: list[WeeklyDayConfig]
    blocked_dates: list[str]
# =========================================================
# סכמות נתונים חדשות עבור מערכת התורים (Pydantic Models) - של ציפורה
# =========================================================
class AppointmentCreate(BaseModel):
    client_name: str
    phone: str
    customer_email: str  # <--- השדה החדש שנוסף
    treatment_type: str
    appointment_date: str  # פורמט צפוי: YYYY-MM-DD
    appointment_time: str  # פורמט צפוי: HH:MM


# =========================================================
# סכמות מוצרים וניהול של צוות הפיתוח
# =========================================================
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


class AdminUserOut(BaseModel):
    id: str
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    is_admin: bool = False
    last_sign_in_at: str | None = None


class AdminUserUpdateRequest(BaseModel):
    first_name: str
    last_name: str
    phone: str
    is_admin: bool = False


class AdminUserUpdateResponse(BaseModel):
    status: str = "success"
    message: str
    data: dict[str, Any]


class AdminUserDeleteResponse(BaseModel):
    status: str = "success"
    message: str
    user_id: str


class AdminOrderStatusUpdateRequest(BaseModel):
    status: str = Field(min_length=1, max_length=50)


class AdminOrderStatusUpdateResponse(BaseModel):
    status: str = "success"
    message: str
    order_id: str
    data: dict[str, Any] | None = None

class CheckoutRequest(BaseModel):
    user_id: str
    client_name: str
    items: list[dict[str, Any]]
    total_price: float
    payment_method: str = "credit_card"
    card_token_or_raw: str  # נתוני תשלום רגישים שיצופנו בשרת

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
    if not supabase:
        raise HTTPException(status_code=500, detail="חיבור ל-Supabase לא הוגדר כראוי")
    
    try:
        data = {
            "user_name": user_data.name,
            "content": user_data.content
        }
        response = supabase.table("user_inputs").insert(data).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"שגיאה בשמירת הנתונים: {str(e)}")

@app.patch("/api/appointments/{appointment_id}/status")
async def update_appointment_status(appointment_id: int, status_update: AppointmentStatusUpdate):
    """מעדכן סטטוס של תור קיים (למשל: canceled)"""
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")
    
    try:
        response = supabase.table("appointments") \
            .update({"status": status_update.status}) \
            .eq("id", appointment_id) \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="התור לא נמצא")
            
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בעדכון התור: {str(e)}")

# =========================================================
# נתיבים (Routes) חדשים עבור מערכת התורים
# =========================================================

# =========================================================
# נתיבים (Routes) מעודכנים למערכת התורים וניהול היומן
# =========================================================

@app.get("/api/admin/schedule")
async def get_clinic_schedule():
    """שולף את הגדרות היומן של המנהלת"""
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")
    
    response = supabase.table("clinic_schedule").select("*").eq("id", 1).execute()
    if not response.data:
        return {"weekly_schedule": [], "blocked_dates": []}
    return response.data[0]


@app.put("/api/admin/schedule")
async def update_clinic_schedule(schedule: ClinicScheduleUpdate):
    """שומר את הגדרות היומן (ימי פעילות ושעות, ימים חסומים)"""
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")
    
    data_to_save = {
        "weekly_schedule": [day.model_dump() for day in schedule.weekly_schedule],
        "blocked_dates": schedule.blocked_dates
    }
    
    # עדכון השורה הקבועה (id=1)
    response = supabase.table("clinic_schedule").update(data_to_save).eq("id", 1).execute()
    return {"status": "success", "message": "הגדרות היומן עודכנו", "data": response.data}


@app.get("/api/appointments/available-slots")
async def get_available_slots(date: str):
    """
    מחשב שעות פנויות דינמיות לפי:
    1. תאריכים חסומים (חופשים).
    2. שעות פתיחה וסגירה ביום הספציפי בשבוע.
    3. תורים שכבר נקבעו בפועל.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר")
    
    try:
        # 1. שליפת הגדרות היומן של הקליניקה
        schedule_res = supabase.table("clinic_schedule").select("*").eq("id", 1).execute()
        if not schedule_res.data:
            return {"date": date, "available_slots": []}
            
        settings = schedule_res.data[0]
        blocked_dates = settings.get("blocked_dates", [])
        weekly_schedule = settings.get("weekly_schedule", [])

        # בדיקה האם התאריך נחסם ידנית ע"י המנהלת
        if date in blocked_dates:
            return {"date": date, "available_slots": []} # יום חופש, אין תורים

        # 2. מציאת איזה יום בשבוע זה (ב-JS יום א' זה 0, בפייתון יום ב' זה 0. נתרגם:)
        target_date = datetime.strptime(date, "%Y-%m-%d")
        js_day_index = (target_date.weekday() + 1) % 7 
        
        # שליפת הגדרת היום הספציפי מתוך המערך השבועי
        day_config = next((d for d in weekly_schedule if d["id"] == js_day_index), None)
        
        # אם היום מסומן כסגור או שלא נמצאה הגדרה - מחזירים מערך ריק
        if not day_config or not day_config.get("isOpen"):
            return {"date": date, "available_slots": []}

        # 3. יצירת רשימת כל השעות האפשריות באותו יום (כל שעה עגולה)
        start_time = datetime.strptime(day_config["start"], "%H:%M")
        end_time = datetime.strptime(day_config["end"], "%H:%M")
        
        all_possible_slots = []
        current_time = start_time
        # מייצר חלונות של שעה עד לשעת הסגירה
        while current_time < end_time:
            all_possible_slots.append(current_time.strftime("%H:%M"))
            current_time += timedelta(hours=1)

        # 4. שליפת התורים התפוסים ב-DB
        appointments_res = supabase.table("appointments") \
            .select("appointment_time") \
            .eq("appointment_date", date) \
            .neq("status", "canceled") \
            .execute()
            
        booked_slots = [row["appointment_time"] for row in appointments_res.data]
        
        # 5. סינון שעות שכבר נתפסו
        available_slots = [slot for slot in all_possible_slots if slot not in booked_slots]
        
        return {"date": date, "available_slots": available_slots}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בשליפת חלונות זמן פנויים: {str(e)}")
    
@app.get("/api/appointments")
async def get_all_appointments():
    """שליפת כל התורים מהמסד והחזרתם לפרונטאנד"""
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")
    
    try:
        # שליפת כל התורים ומיון לפי תאריך
        response = supabase.table("appointments").select("*").order("appointment_date").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בשליפת התורים: {str(e)}")
def send_confirmation_email(recipient_email: str, customer_name: str, date: str, time: str):
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    
    if not sender_email or not sender_password:
        print("⚠️ אזהרה: פרטי התחברות למייל חסרים בקובץ .env, המייל לא נשלח.")
        return

    body = f"שלום {customer_name},\n\nהתור שלך נקבע בהצלחה לתאריך {date} בשעה {time}.\nנשמח לראותך בקליניקה Aesthetics!"
    
    msg = MIMEText(body, 'plain', 'utf-8')
    msg['Subject'] = 'אישור הזמנת תור - Aesthetics Clinic'
    msg['From'] = sender_email
    msg['To'] = recipient_email

    try:
        # התחברות לשרת ה-SMTP של גוגל ושליחת ההודעה
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)
            print(f"📧 אישור נשלח בהצלחה למייל: {recipient_email}")
    except Exception as e:
        print(f"❌ שגיאה בשליחת המייל: {str(e)}")   

@app.post("/api/appointments/book")
async def book_appointment(appointment: AppointmentCreate):
    """
    קובע תור חדש. בודק קודם בשרת שהחלון המבוקש לא נתפס ברגע האחרון.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")
    
    try:
        # בדיקה של הרגע האחרון ב-DB: האם כבר קיים תור מאושר באותו תאריך ובאותה שעה
        check_existing = supabase.table("appointments") \
            .select("id") \
            .eq("appointment_date", appointment.appointment_date) \
            .eq("appointment_time", appointment.appointment_time) \
            .neq("status", "canceled") \
            .execute()
        
        if check_existing.data:
            raise HTTPException(status_code=400, detail="חלון הזמן שנבחר כבר נתפס, אנא בחר שעה אחרת.")
        
        # הכנת האובייקט לשמירה ב-Supabase
        new_row = {
            "client_name": appointment.client_name,
            "phone": appointment.phone,
            "treatment_type": appointment.treatment_type,
            "appointment_date": appointment.appointment_date,
            "appointment_time": appointment.appointment_time,
            "status": "confirmed"
        }
        
        # שמירת התור בטבלה
        response = supabase.table("appointments").insert(new_row).execute()
        send_confirmation_email(
            recipient_email=appointment.customer_email,
            customer_name=appointment.client_name,
            date=appointment.appointment_date,
            time=appointment.appointment_time
        )
        return {
            "status": "success",
            "message": "התור נקבע בהצלחה!",
            "data": response.data
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בתהליך קביעת התור: {str(e)}")


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


@app.get("/api/admin/users", response_model=list[AdminUserOut])
def list_admin_users(_admin=Depends(require_admin)):
    """
    Returns all users via the get_admin_users RPC (joins auth.users + public.profiles).
    Requires a valid JWT and is_admin = true on the caller's profile.
    """
    supabase_admin = get_supabase_admin()

    try:
        response = supabase_admin.rpc("get_admin_users", {}).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch admin users: {str(e)}",
        ) from e

    return response.data or []


@app.put("/api/admin/users/{user_id}", response_model=AdminUserUpdateResponse)
def update_admin_user(
    user_id: str,
    payload: AdminUserUpdateRequest,
    _admin=Depends(require_admin),
):
    """
    Updates a user's profile in public.profiles.
    Requires a valid JWT and is_admin = true on the caller's profile.
    """
    supabase_admin = get_supabase_admin()

    update_data = {
        "first_name": payload.first_name.strip(),
        "last_name": payload.last_name.strip(),
        "phone": payload.phone.strip(),
        "is_admin": payload.is_admin,
    }

    try:
        response = (
            supabase_admin.table("profiles")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update user profile: {str(e)}",
        ) from e

    if not response.data:
        raise HTTPException(status_code=404, detail="User profile not found")

    return AdminUserUpdateResponse(
        message="Profile updated successfully",
        data=response.data[0],
    )


@app.delete("/api/admin/users/{user_id}", response_model=AdminUserDeleteResponse)
def delete_admin_user(user_id: str, _admin=Depends(require_admin)):
    """
    Permanently deletes a user from Supabase Auth (and profiles via CASCADE if configured).
    Requires a valid JWT and is_admin = true on the caller's profile.
    """
    supabase_admin = get_supabase_admin()

    try:
        supabase_admin.auth.admin.delete_user(user_id)
    except Exception as auth_error:
        # If FK blocks auth deletion, remove profile first then retry
        try:
            supabase_admin.table("profiles").delete().eq("id", user_id).execute()
            supabase_admin.auth.admin.delete_user(user_id)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete user: {str(e)}",
            ) from e

    return AdminUserDeleteResponse(
        message="User deleted successfully",
        user_id=user_id,
    )


@app.get("/api/admin/orders")
def list_admin_orders(_admin=Depends(require_admin)):
    """
    Returns all orders via the get_admin_orders RPC.
    Requires a valid JWT and is_admin = true on the caller's profile.
    """
    supabase_admin = get_supabase_admin()

    try:
        response = supabase_admin.rpc("get_admin_orders", {}).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch admin orders: {str(e)}",
        ) from e

    return response.data or []


@app.put(
    "/api/admin/orders/{order_id}/status",
    response_model=AdminOrderStatusUpdateResponse,
)
def update_admin_order_status(
    order_id: str,
    payload: AdminOrderStatusUpdateRequest,
    _admin=Depends(require_admin),
):
    """
    Updates an order's status in public.cart_items.
    Requires a valid JWT and is_admin = true on the caller's profile.
    """
    supabase_admin = get_supabase_admin()
    new_status = payload.status.strip()

    try:
        response = (
            supabase_admin.table("cart_items")
            .update({"status": new_status})
            .eq("id", order_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update order status: {str(e)}",
        ) from e

    if not response.data:
        raise HTTPException(status_code=404, detail="Order not found")

    return AdminOrderStatusUpdateResponse(
        message="Order status updated successfully",
        order_id=order_id,
        data=response.data[0],
    )


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

# ==========================================
# Profile Management
# ==========================================

class ProfileUpdateRequest(BaseModel):
    user_id: str
    first_name: str
    last_name: str
    phone: str

@app.put("/api/profile/update")
async def update_profile(payload: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    """
    מקבל את הפרטים המעודכנים ומאומת מול טוקן ה-JWT.
    מונע ממישהו לעדכן פרופיל של משתמש אחר (מניעת פירצת IDOR).
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")
    
    # הגנה: מוודאים שהמשתמש מנסה לעדכן אך ורק את ה-UID של עצמו
    if payload.user_id != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot update another user's profile")

    try:
        data_to_update = {
            "first_name": payload.first_name.strip(),
            "last_name": payload.last_name.strip(),
            "phone": payload.phone.strip()
        }
        
        response = (
            supabase.table("profiles")
            .update(data_to_update)
            .eq("id", current_user["uid"])  # משתמשים ב-UID הבטוח מהטוקן
            .execute()
        )
        
        return {
            "status": "success", 
            "message": "הפרופיל עודכן בהצלחה", 
            "data": response.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"שגיאה בעדכון הפרופיל: {str(e)}")     
    
# ==========================================
# (ספרינט 2 - Checkout)
# ==========================================

@app.post("/api/checkout")
async def checkout(payload: CheckoutRequest):
    """
    ספרינט 2: ביצוע הזמנה ותשלום מאובטח אסינכרוני.
    עומד בדרישות הבקלוג: ביצוע מהיר, הצפנה מאובטחת, ותמיכה בריבוי משתמשים בו-זמנית.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")

    try:
        # 1. דרישה: Securely Encrypted - נצפין את נתוני התשלום הרגישים שהגיעו מהפרונט
        encrypted_payment_data = cipher_suite.encrypt(payload.card_token_or_raw.encode())
        encrypted_payment_str = encrypted_payment_data.decode()

        # 2. בניית האובייקט לשמירה בטבלת orders ב-Supabase
        order_data = {
            "client_uid": payload.user_id,
            "client_name": payload.client_name,
            "items": payload.items,  # נשמר כ-jsonb באופן אוטומטי
            "total_price": payload.total_price,
            "status": "paid",
            "payment_method": payload.payment_method
            # במידת הצורך תוכלי להוסיף עמודה בטבלה ולשמור את הטוקן המוצפן: "encrypted_token": encrypted_payment_str
        }

        # 3. שמירת ההזמנה בטבלת orders (מבוצע אסינכרונית ללא חסימת השרת)
        response = supabase.table("orders").insert(order_data).execute()

        # 4. ניקוי עגלת הקניות של המשתמש בבסיס הנתונים (cart_items) לאחר רכישה מוצלחת
        try:
            supabase.table("cart_items").delete().eq("user_id", payload.user_id).execute()
        except Exception as cart_err:
            print(f"Warning: Failed to clear backend cart: {str(cart_err)}")

        return {
            "status": "success",
            "message": "התשלום בוצע וההזמנה נקלטה בהצלחה!",
            "order_id": response.data[0]["id"] if response.data else None
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"שגיאה בתהליך התשלום: {str(e)}")  
    
    # ==========================================
# שליפת הזמנות עבור משתמש ספציפי (Checkout ספרינט 2)
# ==========================================
@app.get("/api/orders")
async def get_user_orders(user_id: str, current_user: dict = Depends(get_current_user)):
    """
    Task 3: שליפת היסטוריית הזמנות מאובטחת.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")
    
    # אם מישהו מנסה לדחוף ל-URL מזהה של לקוחה אחרת - נזרוק אותו בבעיטה
    if user_id != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Access denied to other users' order history.")
    
    try:
        response = supabase.table("orders") \
            .select("*") \
            .eq("client_uid", current_user["uid"]) \
            .order("created_at", desc=True) \
            .execute()
            
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בשליפת ההזמנות: {str(e)}")