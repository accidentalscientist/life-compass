import "../styles/styles.css";
import { initialiseHeader } from "../core/header";
import { initialiseSettingsMenu } from "../features/settings/settingsMenu";
import { pullRemoteData, startSyncLoop } from "../core/sync";

async function boot(): Promise<void> {
  await pullRemoteData();
  initialiseHeader("home");
  initialiseSettingsMenu();
  startSyncLoop();
}

boot();
