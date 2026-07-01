import type { AppSettings } from "../models/settings";
import { getJson, setJson, storageKeys } from "./storage";

export const defaultSettings: AppSettings = {
  editMode: false
};

export function getSettings(): AppSettings {
  return { ...defaultSettings, ...getJson<Partial<AppSettings>>(storageKeys.settings, defaultSettings) };
}

export function saveSettings(settings: AppSettings): void {
  setJson(storageKeys.settings, settings);
}

export function applySettings(settings = getSettings()): void {
  document.body.classList.toggle("is-edit-mode", settings.editMode);
}
