# Life Compass

Life Compass is a local-first personal strategy and execution dashboard built with TypeScript and Vite.

The public repository contains the app engine and generic demo data only. Personal strategy, tasks, operating principles, calendar marks and kanban items are stored locally in the user's browser with LocalStorage.

No backend. No login. No analytics. No tracking. No cloud sync.

## Run

Install dependencies:

```powershell
npm.cmd install
```

Start the Vite development server:

```powershell
npm.cmd run dev
```

Then open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

## Build

```powershell
npm.cmd run typecheck
npm.cmd run build
```

The production build is written to `dist/`.

## Pages

- `index.html`: graphical Map / Set Sail home hub.
- `strategy.html`: editable north star, current season, career story, operating principles and long-term direction.
- `execution.html`: three daily tasks, weekly focus, X calendar, project kanban, subtasks and done ledger.

## Project Structure

- `src/pages/`: Vite page entry points.
- `src/core/`: shared browser, storage, backup, date, ID and DOM utilities.
- `src/models/`: TypeScript data models.
- `src/features/strategy/`: Strategy page defaults and controller.
- `src/features/execution/`: Execution page controller.
- `src/features/settings/`: shared import/export controls.
- `src/styles/styles.css`: app styling.
- `public/assets/`: public image assets served by Vite.
- `data/demo-strategy.json`: generic starter strategy content.
- `examples/sample-backup.json`: generic backup example.

## Data Model

Life Compass separates data into three categories:

- Public code: HTML, CSS, TypeScript, layout, components and LocalStorage logic.
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
- `src/`
- `public/assets/`
- `data/demo-strategy.json`
- `examples/sample-backup.json`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `README.md`
- `.gitignore`

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
