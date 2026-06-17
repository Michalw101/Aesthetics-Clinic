/** תאריך מ-Supabase (מחרוזת ISO או Timestamp של Firebase לגאסי) */
export function formatDisplayDate(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toLocaleDateString('he-IL');
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('he-IL');
}

/** תאריך ושעה לתצוגה (למשל: פעילות אחרונה) */
export function formatDisplayDateTime(value: unknown): string {
  if (value == null) return '—';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
