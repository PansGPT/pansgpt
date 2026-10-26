import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("pansgptBridge", {
  auth: {
    getSession: () => ipcRenderer.invoke("auth:get-session"),
    signOut: () => ipcRenderer.invoke("auth:sign-out"),
    beginOAuth: (provider: "google" | "apple") => ipcRenderer.invoke("auth:begin-oauth", provider),
    onOAuthSuccess: (
      callback: (tokens: { access_token: string; refresh_token: string }) => void
    ) => {
      const listener = (_event: unknown, tokens: { access_token: string; refresh_token: string }) =>
        callback(tokens);
      ipcRenderer.on("auth:oauth-success", listener);
      return () => ipcRenderer.removeListener("auth:oauth-success", listener);
    },
  },
});
