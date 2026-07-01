import type { LifeCompassBackup } from "../models/backup";
import { clearByNamespace, collectByNamespace, STORAGE_NAMESPACE } from "./storage";
import { todayStamp } from "./dates";

export function createBackup(): LifeCompassBackup {
  return {
    app: "Life Compass",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: collectByNamespace(STORAGE_NAMESPACE)
  };
}

export function exportBackup(): void {
  const blob = new Blob([JSON.stringify(createBackup(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `life-compass-backup-${todayStamp()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function restoreBackup(payload: unknown): void {
  const maybePayload = payload as { data?: unknown; localStorage?: unknown } | null;
  const data = maybePayload?.data || maybePayload?.localStorage || payload;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Backup file does not contain Life Compass data.");
  }

  const entries = Object.entries(data).filter(([key]) => key.startsWith(STORAGE_NAMESPACE));
  if (!entries.length) throw new Error("Backup file does not contain Life Compass data.");

  clearByNamespace(STORAGE_NAMESPACE);
  entries.forEach(([key, value]) => {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  });
}

export function importBackup(file: File | undefined): void {
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      restoreBackup(JSON.parse(String(reader.result)));
      window.location.reload();
    } catch {
      window.alert("That file could not be imported as a Life Compass backup.");
    }
  });
  reader.readAsText(file);
}
