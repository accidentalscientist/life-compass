import "../styles/styles.css";
import { initialiseHeader } from "../core/header";
import { initialiseSettingsMenu } from "../features/settings/settingsMenu";
import { initialiseStrategyPage } from "../features/strategy/strategyController";

initialiseHeader("strategy");
initialiseSettingsMenu();
initialiseStrategyPage();
