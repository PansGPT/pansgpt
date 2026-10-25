import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "node:path";
import { beginOAuth, getSession, signOut } from "./main/oauth";
import { desktopEnv } from "./config/env";
const origin = new URL(desktopEnv.webAppUrl).origin;
if (
  !desktopEnv.webAppUrl.startsWith("https://") &&
  !(process.env.NODE_ENV === "development" && origin === "http://localhost:3000")
)
  throw new Error("Desktop requires a trusted HTTPS application URL");
let mainWindow: BrowserWindow | null = null;
if (!app.requestSingleInstanceLock()) app.quit();
app.whenReady().then(() => {
  function trusted(event: Electron.IpcMainInvokeEvent): void {
    if (
      !event.senderFrame ||
      new URL(event.senderFrame.url).origin !== origin ||
      event.sender !== mainWindow?.webContents
    )
      throw new Error("Untrusted IPC caller");
  }
  ipcMain.handle("auth:get-session", (event) => {
    trusted(event);
    return getSession();
  });
  ipcMain.handle("auth:sign-out", (event) => {
    trusted(event);
    return signOut();
  });
  ipcMain.handle("auth:begin-oauth", (event, provider: unknown) => {
    trusted(event);
    if (provider !== "google" && provider !== "apple") throw new Error("Unsupported provider");
    return beginOAuth(provider, (tokens) =>
      mainWindow?.webContents.send("auth:oauth-success", tokens)
    );
  });
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== origin) event.preventDefault();
  });
  void mainWindow.loadURL(desktopEnv.webAppUrl);
});
app.on("window-all-closed", () => app.quit());
