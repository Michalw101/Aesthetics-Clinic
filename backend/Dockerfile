# שימוש בדמות בסיס קלה של פייתון
FROM python:3.11-slim

# הגדרת תיקיית העבודה בתוך הקונטיינר
WORKDIR /app

# העתקת קובץ ה-requirements והתקנת הספריות
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# העתקת כל שאר קבצי השרת לתיקיית העבודה
COPY . .

# חשיפת הפורט עליו רץ השרת
EXPOSE 3000

# פקודה להרצת השרת באמצעות uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
