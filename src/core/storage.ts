export const STORAGE_NAMESPACE = "lifeCompass." as const;

export const storageKeys = {
  strategy: "lifeCompass.strategy",
  calendar: "lifeCompass.calendar",
  kanban: "lifeCompass.kanban",
  parkingLot: "lifeCompass.parkingLot",
  doneLedger: "lifeCompass.doneLedger",
  settings: "lifeCompass.settings"
} as const;

export function dailyKey(dateIso: string): string {
  return `lifeCompass.dailyTasks.${dateIso}`;
}

export function weeklyKey(weekIso: string): string {
  return `lifeCompass.weeklyFocus.${weekIso}`;
}

export function getJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function collectByNamespace(namespace = STORAGE_NAMESPACE): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(namespace)) continue;

    try {
      data[key] = JSON.parse(localStorage.getItem(key) ?? "null") as unknown;
    } catch {
      data[key] = localStorage.getItem(key);
    }
  }

  return data;
}

export function clearByNamespace(namespace = STORAGE_NAMESPACE): void {
  const keys: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(namespace)) keys.push(key);
  }

  keys.forEach((key) => localStorage.removeItem(key));
}
