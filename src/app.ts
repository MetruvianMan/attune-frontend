// Attune App — Entry Point
import { initAppShell } from './ui/app-shell.js';

document.addEventListener('DOMContentLoaded', () => {
  initAppShell().catch((e) => {
    console.error('[APP] Failed to initialize app:', e);
    const errorMsg = e?.message || String(e);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:80%;z-index:9999;';
    errorDiv.innerHTML = `
      <h3 style="margin:0 0 10px;color:#EB5757;">App Initialization Failed</h3>
      <p style="margin:0 0 10px;font-size:14px;color:#636E72;">${errorMsg}</p>
      <button onclick="location.reload()" style="padding:8px 16px;background:#4A90E2;color:white;border:none;border-radius:6px;cursor:pointer;">Refresh Page</button>
      <button onclick="localStorage.clear();indexedDB.deleteDatabase('attune-app');location.reload()" style="padding:8px 16px;background:#EB5757;color:white;border:none;border-radius:6px;cursor:pointer;margin-left:8px;">Clear Data & Refresh</button>
    `;
    document.body.appendChild(errorDiv);
  });
});
