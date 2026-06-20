import { test, expect } from '@playwright/test';

test('התחברות מוצלחת למערכת', async ({ page }) => {
  // 1. כניסה לאתר
  await page.goto('http://localhost:3000/');
  
  // 2. לחיצה על כפתור התחברות
  await page.getByRole('button', { name: 'התחברות' }).click({ force: true });

  // 3. מילוי אימייל (הרובוט מצא את השם המדויק!)
  await page.getByRole('textbox', { name: 'אימייל' }).fill('sarablass6236@gmail.com');
  
  // 4. מילוי סיסמה (אותו היגיון)
  await page.getByRole('textbox', { name: 'סיסמה' }).fill('123456');
  
// הפתרון המדויק: תשתמשי ב-getByRole כדי להגדיר לו שאת מחפשת רק כפתור
// 5. לחיצה על כפתור הכניסה
await page.getByRole('button', { name: 'התחברי' }).click();

// --- כאן השינוי ---
// אנחנו אומרים לרובוט: "תחכה 3 שניות, ובזמן הזה תראה לי מה קורה באתר"
await page.waitForTimeout(3000); 

// במקום לבדוק URL, בואי נבדוק אם מופיע אלמנט כלשהו שמוכיח שהתחברנו
// (תחליפי 'החשבון שלי' בטקסט שמופיע באתר *אחרי* התחברות מוצלחת)
await expect(page.getByText('שלום')).toBeVisible();
});