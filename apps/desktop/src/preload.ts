import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("pansgptBridge", {
  platform: process.platform,
  version: "2.0.0",
  ping: () => ipcRenderer.invoke("ping"),
  auth: {
    isKeychainAvailable: () => ipcRenderer.invoke("auth:is-keychain-available"),
    getToken: (key: string) => ipcRenderer.invoke("auth:get-token", key),
    storeToken: (key: string, value: string) => ipcRenderer.invoke("auth:store-token", key, value),
    clearToken: (key: string) => ipcRenderer.invoke("auth:clear-token", key),
    onOAuthSuccess: (
      callback: (tokens: { access_token: string; refresh_token?: string }) => void
    ) => {
      const subscription = (
        _event: unknown,
        tokens: { access_token: string; refresh_token?: string }
      ) => callback(tokens);
      ipcRenderer.on("auth:oauth-success", subscription);
      return () => {
        ipcRenderer.removeListener("auth:oauth-success", subscription);
      };
    },
  },
});
