(function () {
  const namespace = "lifeCompass.";
  const currentPage = document.body.dataset.page;
  const links = document.querySelectorAll(".top-nav a");

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (currentPage && href.includes(currentPage)) {
      link.setAttribute("aria-current", "page");
    }
  });

  function collectLifeCompassData() {
    const data = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(namespace)) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch (error) {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    return data;
  }

  function todayStamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function exportBackup() {
    const backup = {
      app: "Life Compass",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: collectLifeCompassData()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `life-compass-backup-${todayStamp()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function clearLifeCompassData() {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(namespace)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  }

  function restoreBackup(payload) {
    const data = payload?.data || payload?.localStorage || payload;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Backup file does not contain Life Compass data.");
    }

    const entries = Object.entries(data).filter(([key]) => key.startsWith(namespace));
    if (!entries.length) {
      throw new Error("Backup file does not contain Life Compass data.");
    }

    clearLifeCompassData();
    entries.forEach(([key, value]) => {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    });
  }

  function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        restoreBackup(JSON.parse(reader.result));
        window.location.reload();
      } catch (error) {
        window.alert("That file could not be imported as a Life Compass backup.");
      }
    });
    reader.readAsText(file);
  }

  function addDataControls() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const tools = document.createElement("div");
    tools.className = "data-tools";

    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.textContent = "Export JSON";
    exportButton.addEventListener("click", exportBackup);

    const importLabel = document.createElement("label");
    importLabel.className = "import-button";
    importLabel.textContent = "Import JSON";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", () => {
      importBackup(input.files?.[0]);
      input.value = "";
    });
    importLabel.append(input);

    tools.append(exportButton, importLabel);
    header.append(tools);
  }

  addDataControls();
})();
