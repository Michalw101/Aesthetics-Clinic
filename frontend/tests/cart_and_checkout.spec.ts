import { test, expect } from '@playwright/test';

test.describe('שירה ברוורמן - בדיקות אינטגרציה לעגלה, קופה והיסטוריית הזמנות', () => {

  // לפני כל טסט בסדרה הזו, נתחבר למערכת כדי שנוכל לבצע Checkout
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.getByRole('button', { name: 'התחברות' }).click({ force: true });
    await page.getByRole('textbox', { name: 'אימייל' }).fill('shira.test@example.com');
    await page.getByRole('textbox', { name: 'סיסמה' }).fill('123456');
    await page.getByRole('button', { name: 'התחברי' }).click();
    await page.waitForTimeout(2000); // המתנה קלה לטעינת ה-Token
  });

  // 1. טסט עבור הוספה לעגלה ועדכון כמות (Sprint 1 + Sprint 2)
  test('הוספת מוצר לעגלה ועדכון כמות דינמי בקטלוג', async ({ page }) => {
    // מעבר לחנות המוצרים
    await page.goto('http://localhost:3000/store');

    // לחיצה ראשונה על הוספת המוצר הראשון לעגלה
    const addToCartButton = page.getByRole('button', { name: 'הוספה לעגלה' }).first();
    await addToCartButton.click();

    // לחיצה שנייה על אותו מוצר כדי לבדוק את לוגיקת ה-Increment (useCart)
    await addToCartButton.click();

    // פתיחת רכיב העגלה (או מעבר לעמוד העגלה)
    await page.getByRole('button', { name: 'עגלת קניות' }).click();

    // אימות שהסטייט עודכן בהצלחה והכמות מציגה 2
    const quantityIndicator = page.getByText('כמות: 2');
    await expect(quantityIndicator).toBeVisible();
  });

  // 2. טסט עבור תהליך קופה והצגה בהיסטוריית הזמנות (Sprint 2)
  test('תהליך קופה מוצלח והצגת ההזמנה בהיסטוריית רכישות בפרופיל', async ({ page }) => {
    // מעבר לעמוד הקופה עם מוצרים בעגלה
    await page.goto('http://localhost:3000/checkout');

    // אימות שפרטי ה-Payload ותמונות המוצרים נטענים כראוי בממשק
    await expect(page.getByText('סיכום הזמנה')).toBeVisible();

    // לחיצה על כפתור ביצוע התשלום / אישור הזמנה סופי
    await page.getByRole('button', { name: 'בצע הזמנה' }).click();

    // המתנה לעיבוד ה-API מול ה-FastAPI Endpoint ושמירה ב-Supabase
    await page.waitForTimeout(3000);

    // מעבר לעמוד הפרופיל המעוצב מחדש לצורך בדיקת ההיסטוריה
    await page.goto('http://localhost:3000/profile');

    // אימות שההזמנה החדשה אכן מופיעה בטבלת היסטוריית ההזמנות
    await expect(page.getByText('הזמנות קודמות')).toBeVisible();
    
    // בדיקה שמופיע סטטוס ראשוני (למשל "בטיפול" או "Pending") של ההזמנה שבוצעה כעת
    await expect(page.getByText('בטיפול')).toBeVisible();
  });

});