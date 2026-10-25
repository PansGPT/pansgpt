interface NativeSession {
  access_token: string;
  refresh_token: string;
}
interface DesktopAuth {
  getSession(): Promise<NativeSession | null>;
  beginOAuth(provider: "google" | "apple"): Promise<void>;
  signOut(): Promise<void>;
  onOAuthSuccess(callback: (session: NativeSession) => void): () => void;
}
declare global {
  interface Window {
    pansgptBridge?: { auth: DesktopAuth };
  }
}
export function desktopAuth(): DesktopAuth | undefined {
  return typeof window === "undefined" ? undefined : window.pansgptBridge?.auth;
}
