import { exportBackup, importBackup } from "../../core/backup";
import { loadDemoData } from "../../core/demoData";
import { applySettings, getSettings, saveSettings } from "../../core/settings";

export function initialiseSettingsMenu(): void {
  const header = document.querySelector(".site-header");
  if (!header) return;

  applySettings();

  const settings = getSettings();
  const wrapper = document.createElement("div");
  wrapper.className = "settings-menu";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "settings-trigger";
  trigger.textContent = "Settings";
  trigger.setAttribute("aria-expanded", "false");

  const panel = document.createElement("div");
  panel.className = "settings-panel";
  panel.hidden = true;

  const editToggle = document.createElement("label");
  editToggle.className = "settings-toggle";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = settings.editMode;
  const toggleText = document.createElement("span");
  toggleText.textContent = "Edit mode";
  checkbox.addEventListener("change", () => {
    const nextSettings = { ...getSettings(), editMode: checkbox.checked };
    saveSettings(nextSettings);
    applySettings(nextSettings);
    window.dispatchEvent(new CustomEvent("lifeCompass:settingsChanged", { detail: nextSettings }));
  });
  editToggle.append(checkbox, toggleText);

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.textContent = "Export JSON";
  exportButton.addEventListener("click", () => {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    exportBackup();
  });

  const importLabel = document.createElement("label");
  importLabel.className = "import-button";
  importLabel.textContent = "Import JSON";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", () => {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    importBackup(input.files?.[0]);
    input.value = "";
  });
  importLabel.append(input);

  const demoButton = document.createElement("button");
  demoButton.type = "button";
  demoButton.className = "settings-danger";
  demoButton.textContent = "Load demo data";
  demoButton.addEventListener("click", () => {
    const confirmed = window.confirm("Replace local Life Compass data with generic demo data?");
    if (!confirmed) return;
    loadDemoData();
    window.location.reload();
  });

  const note = document.createElement("p");
  note.className = "settings-note";
  note.textContent = "Backups and demo data stay in this browser unless you share them.";

  trigger.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    trigger.setAttribute("aria-expanded", String(!panel.hidden));
  });

  document.addEventListener("click", (event) => {
    if (panel.hidden) return;
    if (wrapper.contains(event.target as Node)) return;
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  });

  panel.append(editToggle, exportButton, importLabel, demoButton, note);
  wrapper.append(trigger, panel);
  header.append(wrapper);
}
