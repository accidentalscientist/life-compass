import "../styles/styles.css";
import { initialiseHeader } from "../core/header";
import { initialiseSettingsMenu } from "../features/settings/settingsMenu";
import { initialiseExecutionPage } from "../features/execution/executionController";

initialiseHeader("execution");
initialiseSettingsMenu();
initialiseExecutionPage();
