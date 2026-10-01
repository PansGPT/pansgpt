import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { setupOAuthLoopbackServer, registerCustomProtocol, OAuthTokens } from "./main/oauth";
import { storeToken, getToken, clearToken, isKeychainAvailable } from "./auth/keychain";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Register custom protocol (pansgpt://auth/callback)
registerCustomProtocol("pansgpt", (tokens: OAuthTokens) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("auth:oauth-success", tokens);
  }
});

app.whenReady().then(() => {
  // General IPC handlers
  ipcMain.handle("ping", () => "pong");

  // Auth & Keychain IPC Handlers
  ipcMain.handle("auth:is-keychain-available", () => isKeychainAvailable());
  ipcMain.handle("auth:get-token", (_e, key: string) => getToken(key));
  ipcMain.handle("auth:store-token", (_e, key: string, val: string) => storeToken(key, val));
  ipcMain.handle("auth:clear-token", (_e, key: string) => clearToken(key));

  // Initialize loopback server for system browser OAuth
  setupOAuthLoopbackServer((tokens: OAuthTokens) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("auth:oauth-success", tokens);
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
