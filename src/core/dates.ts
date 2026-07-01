export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekKey(date: Date): string {
  const cleanDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = cleanDate.getUTCDay() || 7;
  cleanDate.setUTCDate(cleanDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(cleanDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((cleanDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${cleanDate.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

export function formatDate(value: string): string {
  if (!value) return "No date";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function todayStamp(): string {
  return toIsoDate(new Date());
}
