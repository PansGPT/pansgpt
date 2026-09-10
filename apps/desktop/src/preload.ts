import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("pansgptBridge", {
  platform: process.platform,
  version: "2.0.0",
  ping: () => ipcRenderer.invoke("ping"),
});
