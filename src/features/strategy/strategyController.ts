import { createElement, setText, byId } from "../../core/dom";
import { getJson, setJson, storageKeys } from "../../core/storage";
import type { OperatingRule, Strategy } from "../../models/strategy";
import { fallbackStrategy } from "./strategyDefaults";

type FieldType = "text" | "textarea" | "list" | "pairs";

interface EditorField {
  key: string;
  label: string;
  type: FieldType;
}

interface EditorConfig {
  title: string;
  fields: EditorField[];
}

const editors: Record<string, EditorConfig> = {
  hero: {
    title: "Strategic Bearing",
    fields: [
      { key: "title", label: "Hero title", type: "text" },
      { key: "principle", label: "Principle", type: "text" },
      { key: "northStar", label: "North Star", type: "text" }
    ]
  },
  careerCompass: {
    title: "Career Compass",
    fields: [
      { key: "careerCompass.title", label: "Title", type: "text" },
      { key: "careerCompass.items", label: "Compass items", type: "pairs" }
    ]
  },
  careerStory: {
    title: "Career Story",
    fields: [
      { key: "careerStory.title", label: "Title", type: "text" },
      { key: "careerStory.body", label: "Story", type: "textarea" },
      { key: "careerStory.points", label: "Key thinking points", type: "list" }
    ]
  },
  season: {
    title: "Current Season",
    fields: [
      { key: "season.title", label: "Title", type: "text" },
      { key: "season.summary", label: "Summary", type: "textarea" },
      { key: "season.points", label: "Season points", type: "list" },
      { key: "season.tags", label: "Tags", type: "list" }
    ]
  },
  longTermDirection: {
    title: "Long-Term Direction",
    fields: [{ key: "longTermDirection", label: "Direction points", type: "list" }]
  }
};

let strategy: Strategy = fallbackStrategy;

export function initialiseStrategyPage(): void {
  loadStrategy()
    .then((loadedStrategy) => {
      strategy = loadedStrategy;
      renderStrategy();
      bindEvents();
    })
    .catch(() => {
      strategy = mergeStrategy(fallbackStrategy, loadLocalStrategy());
      renderStrategy();
      bindEvents();
    });
}

async function loadStrategy(): Promise<Strategy> {
  // Falls back to the plain relative path for `npm run dev`/`vite build` usage
  // outside this deployment. The Django integration sets this explicitly via
  // `{% static %}`, since its data file doesn't live where Vite's own dev
  // server or default build output would expect it.
  const dataUrl = document.body.dataset.demoDataUrl || `${import.meta.env.BASE_URL}data/demo-strategy.json`;
  const response = await fetch(dataUrl);
  const demoStrategy = response.ok ? ((await response.json()) as Strategy) : fallbackStrategy;
  return mergeStrategy(demoStrategy, loadLocalStrategy());
}

function loadLocalStrategy(): Partial<Strategy> | null {
  return getJson<Partial<Strategy> | null>(storageKeys.strategy, null);
}

function mergeStrategy(base: Strategy, local: Partial<Strategy> | null): Strategy {
  const merged = structuredClone(base);
  if (!local) return merged;

  Object.assign(merged, local);
  merged.careerCompass = { ...base.careerCompass, ...(local.careerCompass || {}) };
  merged.season = {
    ...base.season,
    ...(local.season || {}),
    points: local.season?.points || base.season.points,
    tags: local.season?.tags || base.season.tags
  };
  merged.rules = (local.rules || base.rules).slice(0, 6).map((rule, index) => {
    const baseRule = base.rules[index] || fallbackStrategy.rules[index];
    return {
      ...baseRule,
      ...rule,
      number: rule.number || baseRule?.number || String(index + 1).padStart(2, "0"),
      name: rule.name || baseRule?.name || "",
      summary: rule.summary || baseRule?.summary || rule.text
    };
  });
  merged.careerStory = {
    ...base.careerStory,
    ...(local.careerStory || {}),
    points: local.careerStory?.points || base.careerStory.points
  };
  merged.longTermDirection = local.longTermDirection || base.longTermDirection;
  return merged;
}

function saveStrategy(): void {
  strategy.currentSeason = strategy.season.title;
  setJson(storageKeys.strategy, strategy);
}

function getPath(path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, strategy);
}

function setPath(path: string, value: unknown): void {
  const keys = path.split(".");
  const finalKey = keys.pop();
  if (!finalKey) return;

  const target = keys.reduce<Record<string, unknown>>((current, key) => {
    return current[key] as Record<string, unknown>;
  }, strategy as unknown as Record<string, unknown>);
  target[finalKey] = value;
}

function renderList(id: string, items: string[]): void {
  const list = document.getElementById(id);
  if (!list) return;
  list.replaceChildren(...items.map((item) => createElement("li", "", item)));
}

function renderRuleCard(rule: OperatingRule, mode: "summary" | "full"): HTMLElement {
  const card = createElement("article", "rule-card");
  card.append(
    createElement("span", "rule-number", rule.number),
    createElement("h3", "", rule.name),
    createElement("p", "", mode === "full" ? rule.text : rule.summary)
  );
  return card;
}

function renderRuleEditor(rule: OperatingRule, index: number): HTMLElement {
  const card = createElement("article", "rule-card rule-editor");
  card.dataset.index = String(index);
  card.append(
    renderRuleInput("number", "#", rule.number),
    renderRuleInput("name", "Title", rule.name),
    renderRuleInput("summary", "Summary", rule.summary),
    renderRuleInput("text", "Full description", rule.text, "textarea")
  );
  return card;
}

function renderRuleInput(key: keyof OperatingRule, labelText: string, value: string, tag: "input" | "textarea" = "input"): HTMLLabelElement {
  const label = createElement("label", "", labelText);
  const field = tag === "textarea" ? document.createElement("textarea") : document.createElement("input");
  field.dataset.ruleKey = key;
  field.value = value || "";
  if (field instanceof HTMLTextAreaElement) field.rows = 4;
  label.append(field);
  return label;
}

function renderStrategy(): void {
  setText("strategy-title", strategy.title);
  setText("strategy-principle", strategy.principle);
  setText("north-star", strategy.northStar);
  setText("current-season", strategy.season.title);
  setText("compass-title", strategy.careerCompass.title);
  setText("season-title", strategy.season.title);
  setText("season-summary", strategy.season.summary);
  setText("career-story-title", strategy.careerStory.title);
  setText("career-story-body", strategy.careerStory.body);

  const compass = byId("career-compass");
  const compassItems = strategy.careerCompass.items.map((item) => {
    const card = createElement("article", "compass-item");
    card.append(createElement("h3", "", item.label), createElement("p", "", item.text));
    return card;
  });
  compass.replaceChildren(...compassItems);

  const tags = byId("season-tags");
  tags.replaceChildren(...strategy.season.tags.map((tag) => createElement("span", "", tag)));

  const preview = byId("rules-preview");
  preview.replaceChildren(...strategy.rules.map((rule) => renderRuleCard(rule, "summary")));

  const rules = byId("rules-grid");
  rules.replaceChildren(...strategy.rules.map((rule, index) => renderRuleEditor(rule, index)));

  renderList("long-term-direction", strategy.longTermDirection);
  renderList("career-story-points", strategy.careerStory.points);
  renderList("season-points", strategy.season.points);
}

function openEditor(section: string): void {
  const editor = editors[section];
  if (!editor) return;

  byId("strategy-edit-title").textContent = editor.title;
  byId("strategy-edit-kicker").textContent = "Edit Strategy";
  const fields = byId("strategy-edit-fields");
  fields.replaceChildren(...editor.fields.map(renderField));
  byId<HTMLDialogElement>("strategy-edit-modal").showModal();
}

function renderField(field: EditorField): HTMLLabelElement {
  const label = createElement("label", "", field.label);
  if (field.type === "textarea" || field.type === "list" || field.type === "pairs") {
    const textarea = document.createElement("textarea");
    textarea.rows = field.type === "pairs" ? 7 : 5;
    textarea.dataset.key = field.key;
    textarea.dataset.type = field.type;
    textarea.value = formatFieldValue(field);
    label.append(textarea);
    return label;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.dataset.key = field.key;
  input.dataset.type = field.type;
  input.value = String(getPath(field.key) || "");
  label.append(input);
  return label;
}

function formatFieldValue(field: EditorField): string {
  const value = getPath(field.key);
  if (field.type === "pairs" && Array.isArray(value)) {
    return value.map((item) => `${item.label}: ${item.text}`).join("\n");
  }
  if (field.type === "list" && Array.isArray(value)) {
    return value.join("\n");
  }
  return String(value || "");
}

function parseFieldValue(input: HTMLInputElement | HTMLTextAreaElement): unknown {
  const type = input.dataset.type as FieldType;
  if (type === "pairs") {
    return input.value
      .split("\n")
      .map((line) => {
        const [label, ...rest] = line.split(":");
        return { label: label.trim(), text: rest.join(":").trim() };
      })
      .filter((item) => item.label || item.text);
  }
  if (type === "list") {
    return input.value.split("\n").map((line) => line.trim()).filter(Boolean);
  }
  return input.value.trim();
}

function bindEvents(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-edit-section]").forEach((button) => {
    button.addEventListener("click", () => openEditor(button.dataset.editSection || ""));
  });

  byId("open-rules").addEventListener("click", () => {
    byId<HTMLDialogElement>("rules-modal").showModal();
  });

  byId<HTMLFormElement>("strategy-edit-form").addEventListener("submit", (event) => {
    if ((event.submitter as HTMLButtonElement | null)?.value !== "save") return;
    event.preventDefault();
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("#strategy-edit-fields input, #strategy-edit-fields textarea").forEach((input) => {
      if (input.dataset.key) setPath(input.dataset.key, parseFieldValue(input));
    });
    saveStrategy();
    renderStrategy();
    byId<HTMLDialogElement>("strategy-edit-modal").close();
  });

  byId<HTMLFormElement>("rules-form").addEventListener("submit", (event) => {
    if ((event.submitter as HTMLButtonElement | null)?.value !== "save") return;
    event.preventDefault();
    strategy.rules = Array.from(document.querySelectorAll<HTMLElement>(".rule-editor")).map((card, index) => {
      const getValue = (key: keyof OperatingRule) => card.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-rule-key="${key}"]`)?.value.trim() || "";
      return {
        number: getValue("number") || String(index + 1).padStart(2, "0"),
        name: getValue("name") || `Principle ${index + 1}`,
        summary: getValue("summary"),
        text: getValue("text")
      };
    }).slice(0, 6);
    saveStrategy();
    renderStrategy();
    byId<HTMLDialogElement>("rules-modal").close();
  });
}
