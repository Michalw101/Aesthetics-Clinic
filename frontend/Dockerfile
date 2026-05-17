# שלב 1: בניית האפליקציה (Build Stage)
FROM node:20-slim AS build

# הגדרת תיקיית עבודה
WORKDIR /app

# העתקת קבצי הגדרות התלויות
COPY package.json package-lock.json ./

# התקנת תלויות
RUN npm install

# העתקת כל שאר קבצי הפרויקט
COPY . .

# בניית הפרויקט לייצור (יוצר תיקיית dist)
RUN npm run build

# שלב 2: הגשת הקבצים (Production Stage)
# נשתמש ב-nginx קל כדי להגיש את הקבצים הסטטיים
FROM nginx:stable-alpine

# העתקת קבצי ה-build מהשלב הקודם לתיקייה של nginx
COPY --from=build /app/dist /usr/share/nginx/html

# חשיפת פורט 80 (הסטנדרטי ל-web)
# במערכת AI Studio אנחנו עובדים בדרך כלל על פורט 3000, 
# אבל קונטיינר Frontend עצמאי לרוב ירוץ על 80 או 8080.
EXPOSE 80

# הרצת nginx
CMD ["nginx", "-g", "daemon off;"]
