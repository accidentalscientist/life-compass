(function () {
  const strategyKey = "lifeCompass.strategy";
  const fallbackStrategy = {
    title: "The map before action.",
    principle: "Strategy is the map. Execution is the sail.",
    northStar: "Build a meaningful career",
    currentSeason: "Create visible progress",
    careerCompass: {
      title: "Meaningful career direction",
      items: [
        { label: "Capability", text: "Build useful skills through focused practice and visible projects." },
        { label: "Evidence", text: "Create work that demonstrates judgment, reliability and momentum." },
        { label: "Path", text: "Clarify the people, roles and places that fit the next season." }
      ]
    },
    season: {
      title: "Create visible progress",
      summary: "A focused season for turning intention into small, finished pieces of work.",
      points: [
        "Finish one meaningful project brief.",
        "Publish or share one piece of visible work.",
        "Review the week and reduce unnecessary commitments."
      ],
      tags: ["Focus", "Progress", "Learning", "Review"]
    },
    rules: [
      { number: "01", name: "Protect Momentum", summary: "Make progress easy to restart.", text: "Choose small, repeatable actions that keep the important work moving." },
      { number: "02", name: "Tell The Truth", summary: "Stay honest about what is working.", text: "Use honest reflection to notice drift, friction and real progress." },
      { number: "03", name: "Keep Promises Small", summary: "Make commitments that can be finished.", text: "Prefer clear, finishable promises over vague ambition." },
      { number: "04", name: "Create Before Consuming", summary: "Put output before noise.", text: "Start the day by making progress on something that matters." },
      { number: "05", name: "Review The Map", summary: "Let reflection guide the next step.", text: "Regularly compare current action with long-term direction." },
      { number: "06", name: "Care For The Body", summary: "Health supports judgment.", text: "Use sleep, movement and food as foundations for better decisions." }
    ],
    careerStory: {
      title: "From curiosity to useful work",
      body: "This story is a movement from broad curiosity toward practical contribution. The through-line is learning, making ideas visible, and using finished work to create better opportunities.",
      points: [
        "Where I have been: building skills, interests and self-knowledge.",
        "Where I am now: turning direction into visible work and daily progress.",
        "Where I am going: toward roles and projects where my strengths are useful."
      ]
    },
    longTermDirection: [
      "Build a life and career around useful skills, clear values and visible contribution.",
      "Create a portfolio of work that can travel ahead of introductions.",
      "Move toward opportunities where learning, service and practical delivery meet."
    ]
  };

  const editors = {
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

  let strategy = null;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value || "";
  };

  const createElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  function loadLocalStrategy() {
    try {
      return JSON.parse(localStorage.getItem(strategyKey)) || null;
    } catch (error) {
      return null;
    }
  }

  function mergeStrategy(base, local) {
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
    merged.rules = (local.rules || base.rules).slice(0, 6).map((rule, index) => ({
      ...base.rules[index],
      ...rule,
      number: rule.number || base.rules[index]?.number || String(index + 1).padStart(2, "0"),
      name: rule.name || rule.title || base.rules[index]?.name || "",
      summary: rule.summary || base.rules[index]?.summary || rule.text
    }));
    merged.careerStory = {
      ...base.careerStory,
      ...(local.careerStory || {}),
      points: local.careerStory?.points || local.currentQuestions || base.careerStory.points
    };
    merged.longTermDirection = local.longTermDirection || base.longTermDirection;
    return merged;
  }

  function saveStrategy() {
    strategy.currentSeason = strategy.season.title;
    localStorage.setItem(strategyKey, JSON.stringify(strategy));
  }

  function getPath(path) {
    return path.split(".").reduce((current, key) => current?.[key], strategy);
  }

  function setPath(path, value) {
    const keys = path.split(".");
    const finalKey = keys.pop();
    const target = keys.reduce((current, key) => current[key], strategy);
    target[finalKey] = value;
  }

  function renderList(id, items) {
    const list = document.getElementById(id);
    if (!list) return;
    list.replaceChildren(...items.map((item) => createElement("li", "", item)));
  }

  function renderRuleCard(rule, mode) {
    const card = createElement("article", "rule-card");
    card.append(
      createElement("span", "rule-number", rule.number),
      createElement("h3", "", rule.name),
      createElement("p", "", mode === "full" ? rule.text : rule.summary)
    );
    return card;
  }

  function renderRuleEditor(rule, index) {
    const card = createElement("article", "rule-card rule-editor");
    card.dataset.index = index;
    card.append(
      renderRuleInput("number", "#", rule.number),
      renderRuleInput("name", "Title", rule.name),
      renderRuleInput("summary", "Summary", rule.summary),
      renderRuleInput("text", "Full description", rule.text, "textarea")
    );
    return card;
  }

  function renderRuleInput(key, labelText, value, tag = "input") {
    const label = createElement("label", "", labelText);
    const field = document.createElement(tag);
    field.dataset.ruleKey = key;
    field.value = value || "";
    if (tag === "textarea") field.rows = 4;
    label.append(field);
    return label;
  }

  function renderStrategy() {
    setText("strategy-title", strategy.title);
    setText("strategy-principle", strategy.principle);
    setText("north-star", strategy.northStar);
    setText("current-season", strategy.season.title);
    setText("compass-title", strategy.careerCompass.title);
    setText("season-title", strategy.season.title);
    setText("season-summary", strategy.season.summary);
    setText("career-story-title", strategy.careerStory.title);
    setText("career-story-body", strategy.careerStory.body);

    const compass = document.getElementById("career-compass");
    const compassItems = strategy.careerCompass.items.map((item) => {
      const card = createElement("article", "compass-item");
      card.append(createElement("h3", "", item.label), createElement("p", "", item.text));
      return card;
    });
    compass.replaceChildren(...compassItems);

    const tags = document.getElementById("season-tags");
    tags.replaceChildren(...strategy.season.tags.map((tag) => createElement("span", "", tag)));

    const preview = document.getElementById("rules-preview");
    preview.replaceChildren(...strategy.rules.map((rule) => renderRuleCard(rule, "summary")));

    const rules = document.getElementById("rules-grid");
    rules.replaceChildren(...strategy.rules.map((rule, index) => renderRuleEditor(rule, index)));

    renderList("long-term-direction", strategy.longTermDirection);
    renderList("career-story-points", strategy.careerStory.points);
    renderList("season-points", strategy.season.points);
  }

  function openEditor(section) {
    const editor = editors[section];
    if (!editor) return;

    document.getElementById("strategy-edit-title").textContent = editor.title;
    document.getElementById("strategy-edit-kicker").textContent = "Edit Strategy";
    const fields = document.getElementById("strategy-edit-fields");
    fields.replaceChildren(...editor.fields.map(renderField));
    document.getElementById("strategy-edit-modal").showModal();
  }

  function renderField(field) {
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
    input.value = getPath(field.key) || "";
    label.append(input);
    return label;
  }

  function formatFieldValue(field) {
    const value = getPath(field.key);
    if (field.type === "pairs") {
      return value.map((item) => `${item.label}: ${item.text}`).join("\n");
    }
    if (field.type === "list") {
      return value.join("\n");
    }
    return value || "";
  }

  function parseFieldValue(input) {
    const type = input.dataset.type;
    if (type === "pairs") {
      return input.value.split("\n").map((line) => {
        const [label, ...rest] = line.split(":");
        return { label: label.trim(), text: rest.join(":").trim() };
      }).filter((item) => item.label || item.text);
    }
    if (type === "list") {
      return input.value.split("\n").map((line) => line.trim()).filter(Boolean);
    }
    return input.value.trim();
  }

  function bindEvents() {
    document.querySelectorAll("[data-edit-section]").forEach((button) => {
      button.addEventListener("click", () => openEditor(button.dataset.editSection));
    });

    document.getElementById("open-rules").addEventListener("click", () => {
      document.getElementById("rules-modal").showModal();
    });

    document.getElementById("strategy-edit-form").addEventListener("submit", (event) => {
      if (event.submitter?.value !== "save") return;
      event.preventDefault();
      document.querySelectorAll("#strategy-edit-fields input, #strategy-edit-fields textarea").forEach((input) => {
        setPath(input.dataset.key, parseFieldValue(input));
      });
      saveStrategy();
      renderStrategy();
      document.getElementById("strategy-edit-modal").close();
    });

    document.getElementById("rules-form").addEventListener("submit", (event) => {
      if (event.submitter?.value !== "save") return;
      event.preventDefault();
      strategy.rules = Array.from(document.querySelectorAll(".rule-editor")).map((card, index) => {
        const getValue = (key) => card.querySelector(`[data-rule-key="${key}"]`)?.value.trim() || "";
        return {
          number: getValue("number") || String(index + 1).padStart(2, "0"),
          name: getValue("name") || `Principle ${index + 1}`,
          summary: getValue("summary"),
          text: getValue("text")
        };
      }).slice(0, 6);
      saveStrategy();
      renderStrategy();
      document.getElementById("rules-modal").close();
    });
  }

  fetch("data/demo-strategy.json")
    .then((response) => (response.ok ? response.json() : fallbackStrategy))
    .then((loadedStrategy) => {
      strategy = mergeStrategy(loadedStrategy, loadLocalStrategy());
      renderStrategy();
      bindEvents();
    })
    .catch(() => {
      strategy = mergeStrategy(fallbackStrategy, loadLocalStrategy());
      renderStrategy();
      bindEvents();
    });
})();
