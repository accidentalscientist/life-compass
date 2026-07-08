import "../styles/styles.css";
import { initialiseHeader } from "../core/header";
import { initialiseSettingsMenu } from "../features/settings/settingsMenu";
import { initialiseStrategyPage } from "../features/strategy/strategyController";
import { pullRemoteData, startSyncLoop } from "../core/sync";

async function boot(): Promise<void> {
  await pullRemoteData();
  initialiseHeader("strategy");
  initialiseSettingsMenu();
  initialiseStrategyPage();
  startSyncLoop();
}

boot();
