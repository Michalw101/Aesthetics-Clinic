from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client
from typing import Literal
import os
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


# =========================================================
# סכמות נתונים חדשות עבור מערכת התורים (Pydantic Models)
# =========================================================
class AppointmentCreate(BaseModel):
    client_name: str
    phone: str
    treatment_type: str
    appointment_date: str  # פורמט צפוי: YYYY-MM-DD
    appointment_time: str  # פורמט צפוי: HH:MM


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

@app.get("/api/appointments/available-slots")
async def get_available_slots(date: str):
    """
    מקבל תאריך (YYYY-MM-DD) ומחזיר את חלונות הזמן הפנויים באותו יום.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="חיבור ל-Supabase לא הוגדר כראוי")
    
    # שעות הפעילות המוגדרות של הקליניקה (ניתן לשנות בהתאם לצורך)
    all_possible_slots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
    
    try:
        # שליפת כל התורים התפוסים לאותו תאריך שאינם מבוטלים
        response = supabase.table("appointments") \
            .select("appointment_time") \
            .eq("appointment_date", date) \
            .neq("status", "canceled") \
            .execute()
        
        # חילוץ השעות התפוסות מתוך תוצאות השילפה
        booked_slots = [row["appointment_time"] for row in response.data]
        
        # סינון חלונות הזמן - משאירים רק את השעות שלא קיימות ב-booked_slots
        available_slots = [slot for slot in all_possible_slots if slot not in booked_slots]
        
        return {
            "date": date,
            "available_slots": available_slots
        }
        
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
        
        return {
            "status": "success",
            "message": "התור נקבע בהצלחה!",
            "data": response.data
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בתהליך קביעת התור: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    # הרצה על פורט 3000 כברירת מחדל
    uvicorn.run(app, host="0.0.0.0", port=3000)