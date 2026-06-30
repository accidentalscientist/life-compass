# Life Compass

Life Compass is a local-first personal strategy and execution dashboard built with HTML, CSS and vanilla JavaScript.

The public repository contains the app template and generic demo data only. Personal strategy, tasks, rules, calendar marks and kanban items are stored locally in the user's browser with LocalStorage.

No backend. No login. No analytics. No tracking. No cloud sync.

## Run

Open `index.html` directly in a browser, or serve the folder locally:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Pages

- `index.html`: graphical Map / Set Sail home hub.
- `strategy.html`: editable north star, current season, career story, operating principles and long-term direction.
- `execution.html`: three daily tasks, weekly focus, X calendar, project kanban, subtasks and done ledger.

## Data Model

Life Compass separates data into three categories:

- Public code: HTML, CSS, JavaScript, layout, components and LocalStorage logic.
- Demo data: generic starter content in `data/demo-strategy.json` and `examples/sample-backup.json`.
- User data: private content created in the browser and stored in LocalStorage.

The app loads demo content only when no user content exists. Once users edit content, their data is saved locally in their browser.

## Backup

Use the header controls to manage local data:

- `Export JSON`: downloads a backup named `life-compass-backup-YYYY-MM-DD.json`.
- `Import JSON`: restores a previous Life Compass backup.

Exported backups are private user data. Store them somewhere safe and do not commit them to a public repository.

## Privacy Note

This project is designed to keep user data local. Do not commit real personal strategy files, task exports, screenshots or backups to a public repository.

If private data is committed once, deleting it later is not enough because Git keeps history.

## Public-Safe Files

Expected public files include:

- `index.html`
- `strategy.html`
- `execution.html`
- `css/styles.css`
- `js/app.js`
- `js/strategy.js`
- `js/execution.js`
- `data/demo-strategy.json`
- `examples/sample-backup.json`
- `README.md`
- `.gitignore`

## Assets

- `assets/map-hero.png`: generated cartography image for Strategy.
- `assets/sail-hero.png`: generated caravel image for Set Sail / Execution.
- `assets/sail-hero-yacht-original.png`: preserved original yacht-style sailing image.

## LocalStorage Keys

- `lifeCompass.strategy`
- `lifeCompass.dailyTasks.YYYY-MM-DD`
- `lifeCompass.weeklyFocus.YYYY-WW`
- `lifeCompass.calendar`
- `lifeCompass.kanban`
- `lifeCompass.parkingLot`
- `lifeCompass.doneLedger`

## Final Standard

Public as software.
Private as life.
Generic by default.
Personal only inside the user's browser.
