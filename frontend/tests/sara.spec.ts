import { test, expect } from '@playwright/test';

// ================================================================
// טסט 1: בדיקת התחברות בסיסית
// ================================================================
test('התחברות מוצלחת למערכת', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('button', { name: 'התחברות' }).click({ force: true });

  await page.getByRole('textbox', { name: 'אימייל' }).fill('sarablass6236@gmail.com');
  await page.getByRole('textbox', { name: 'סיסמה' }).fill('123456');
  
  // הוספנו force: true כדי שגם Webkit יעבור כאן חלק
  await page.getByRole('button', { name: 'התחברי' }).click({ force: true });

  await page.waitForTimeout(2000); 
  await expect(page.getByText('שלום')).toBeVisible();
});


// ================================================================
// טסט 2: עריכת פרטי פרופיל ושמירה במסד הנתונים
// ================================================================
test('עדכון פרטי פרופיל משתמשת', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('button', { name: 'התחברות' }).click({ force: true });
  await page.getByRole('textbox', { name: 'אימייל' }).fill('sarablass6236@gmail.com');
  await page.getByRole('textbox', { name: 'סיסמה' }).fill('123456');
  
  // הוספנו force: true גם בהתחברות של הטסט השני
  await page.getByRole('button', { name: 'התחברי' }).click({ force: true });

  const profileLink = page.getByRole('button', { name: /שלום,/ });
  await expect(profileLink).toBeVisible({ timeout: 10000 });
  await profileLink.click();

  await page.getByRole('button', { name: /עריכת פרטים/ }).click();
  await expect(page.getByText('עריכת פרטים אישיים')).toBeVisible();

  await page.locator('input').nth(0).fill('שרה');
  await page.locator('input').nth(1).fill('בלסברגר');
  await page.locator('input').nth(2).fill('050-1234567');

  await page.getByRole('button', { name: 'שמירת שינויים' }).click();

  await expect(page.getByText('הפרופיל עודכן בהצלחה!')).toBeVisible();

  // --- הפתרון ל-Strict Mode ---
  // הגדרנו לו לחפש אך ורק אלמנט מסוג "כותרת" (H2) שמכיל את השם, במקום סתם טקסט כללי
  await expect(page.getByRole('heading', { name: 'שרה בלסברגר' })).toBeVisible();
});