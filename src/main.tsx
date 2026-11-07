import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/index.css";
import "./styles/premium-ui.css";
import "./styles/orders.css";
import "./styles/localization.css";
import { initializeI18n } from "./i18n/loader";
void initializeI18n().then(() => createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
));
