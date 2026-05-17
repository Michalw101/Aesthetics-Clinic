/** תאריך מ-Supabase (מחרוזת ISO או Timestamp של Firebase לגאסי) */
export function formatDisplayDate(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toLocaleDateString('he-IL');
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('he-IL');
}
