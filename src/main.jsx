import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from "virtual:pwa-register";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const updateSW = registerSW({
  onNeedRefresh() {
    const shouldUpdate = window.confirm(
      "A new version of The Booth is available. Refresh now?"
    );

    if (shouldUpdate) {
      updateSW(true);
    }
  },

  onOfflineReady() {
    console.log("App ready to work offline.");
  },
});