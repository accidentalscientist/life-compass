import "../styles/styles.css";
import { initialiseHeader } from "../core/header";
import { initialiseSettingsMenu } from "../features/settings/settingsMenu";
import { initialiseExecutionPage } from "../features/execution/executionController";
import { pullRemoteData, startSyncLoop } from "../core/sync";

async function boot(): Promise<void> {
  await pullRemoteData();
  initialiseHeader("execution");
  initialiseSettingsMenu();
  initialiseExecutionPage();
  startSyncLoop();
}

boot();
