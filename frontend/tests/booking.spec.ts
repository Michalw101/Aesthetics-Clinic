import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test('TC01: Successful Appointment Booking', async ({ page }) => {
  // 1. ניווט לדף קביעת תורים דרך ה-Navbar בלבד
  const navBookButton = page.locator('nav').getByRole('button', { name: 'הזמיני תור' });
  await navBookButton.click();
  
  // 2. מילוי פרטים
  await page.fill('input[placeholder="ישראלה ישראלי"]', 'ישראלה כהן');
  await page.fill('input[type="email"]', 'test-user@example.com');
  await page.fill('input[type="tel"]', '0501234567');
  
  // בחירת תאריך 
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const dateString = tomorrow.toISOString().split('T')[0];
  await page.fill('input[type="date"]', dateString);
  
  // 3. בחירת שעה (החלק המתוקן)
  // בוחרים את השדה השני (שדה השעות) ומחכים שהוא יהפוך לזמין
  const timeSelect = page.locator('select').nth(1); 
  await expect(timeSelect).toBeEnabled(); 
  await expect(timeSelect).not.toHaveText(/טוען/); 
  await timeSelect.selectOption({ index: 1 });
  
  // 4. שליחה
  await page.click('button:has-text("אישור וקביעת התור")');
  
  // 5. בדיקת הצלחה
  await expect(page.locator('text=התור נקבע בהצלחה')).toBeVisible({ timeout: 10000 });
});
test('TC02: Block invalid booking (missing phone)', async ({ page }) => {
  // 1. ניווט לדף קביעת תורים דרך ה-Navbar
  const navBookButton = page.locator('nav').getByRole('button', { name: 'הזמיני תור' });
  await navBookButton.click();
  
  // 2. מילוי שם ואימייל בלבד (בכוונה מדלגים על טלפון!)
  await page.fill('input[placeholder="ישראלה ישראלי"]', 'ישראלה כהן');
  await page.fill('input[type="email"]', 'test-user@example.com');
  
  // 3. בחירת תאריך (לעוד שבוע בדיוק כמו בטסט הראשון)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const dateString = futureDate.toISOString().split('T')[0];
  await page.fill('input[type="date"]', dateString);
  
  // 4. בחירת שעה (המתנה לטעינת השעות)
  const timeSelect = page.locator('select').nth(1); 
  await expect(timeSelect).toBeEnabled(); 
  await expect(timeSelect).not.toHaveText(/טוען/); 
  await timeSelect.selectOption({ index: 1 });
  
  // 5. ניסיון שליחה
  // עכשיו הכפתור כבר לא אפור (כי יש תאריך ושעה), אז אפשר ללחוץ עליו
  await page.click('button:has-text("אישור וקביעת התור")');
  
  // 6. אימות ולידציה
  // אנחנו מצפים שהמערכת תתפוס שאין טלפון ותקפיץ שגיאה
  await expect(page.locator('text=אנא מלאי את כל השדות')).toBeVisible();
});