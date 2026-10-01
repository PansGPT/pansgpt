// ==============================================================================
// PansGPT 2.0 Desktop OAuth Listener & Protocol Handler (Phase 7.7)
// Supports custom protocol (pansgpt://auth/callback) and loopback listener
// ==============================================================================

import { app, BrowserWindow } from "electron";
import * as http from "http";
import { storeToken } from "../auth/keychain";

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

const SUCCESS_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PansGPT Authentication Successful</title>
  <style>
    body {
      background-color: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    h2 { color: #38bdf8; margin-top: 0; font-size: 20px; }
    p { color: #a1a1aa; font-size: 14px; line-height: 1.5; margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Authentication Successful</h2>
    <p>You can close this tab and return to the PansGPT desktop application.</p>
  </div>
  <script>
    setTimeout(() => { window.close(); }, 3000);
  </script>
</body>
</html>
`;

export function extractTokensFromUrl(urlStr: string): OAuthTokens | null {
  try {
    const url = new URL(urlStr);
    let params: URLSearchParams;

    if (url.hash && url.hash.length > 1) {
      params = new URLSearchParams(url.hash.substring(1));
    } else {
      params = url.searchParams;
    }

    const accessToken = params.get("access_token");
    if (!accessToken) return null;

    const refreshToken = params.get("refresh_token") || undefined;
    const tokenType = params.get("token_type") || undefined;
    const expiresIn = params.get("expires_in")
      ? parseInt(params.get("expires_in")!, 10)
      : undefined;

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenType,
      expires_in: expiresIn,
    };
  } catch (err) {
    console.error("Failed to parse OAuth URL:", err);
    return null;
  }
}

export function setupOAuthLoopbackServer(
  onSuccess: (tokens: OAuthTokens) => void,
  port = 4567
): http.Server {
  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }

    if (req.url.startsWith("/auth/callback")) {
      const fullUrl = `http://127.0.0.1:${port}${req.url}`;
      const tokens = extractTokensFromUrl(fullUrl);

      if (tokens) {
        if (tokens.access_token) {
          storeToken("access_token", tokens.access_token);
        }
        if (tokens.refresh_token) {
          storeToken("refresh_token", tokens.refresh_token);
        }
        onSuccess(tokens);

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(SUCCESS_HTML);
      } else {
        // May receive hash fragment on client browser, serve landing script to extract and POST
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html>
          <body>
            <script>
              if (window.location.hash) {
                window.location.href = "/auth/callback?" + window.location.hash.substring(1);
              } else {
                document.body.innerText = "No authentication credentials received.";
              }
            </script>
          </body>
          </html>
        `);
      }
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(
      `Desktop OAuth loopback server listening on http://127.0.0.1:${port}/auth/callback`
    );
  });

  return server;
}

export function registerCustomProtocol(
  protocolScheme = "pansgpt",
  onTokensReceived?: (tokens: OAuthTokens) => void
): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(protocolScheme, process.execPath, [process.argv[1]]);
    }
  } else {
    app.setAsDefaultProtocolClient(protocolScheme);
  }

  // Handle incoming deep links
  const handleDeepLink = (rawUrl: string) => {
    if (rawUrl.startsWith(`${protocolScheme}://auth/callback`)) {
      const tokens = extractTokensFromUrl(rawUrl);
      if (tokens) {
        if (tokens.access_token) storeToken("access_token", tokens.access_token);
        if (tokens.refresh_token) storeToken("refresh_token", tokens.refresh_token);
        if (onTokensReceived) onTokensReceived(tokens);

        // Also broadcast to all windows
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send("auth:oauth-success", tokens);
        });
      }
    }
  };

  // macOS
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // Windows / Linux second instance
  app.on("second-instance", (_event, commandLine) => {
    const deepLink = commandLine.find((arg) => arg.startsWith(`${protocolScheme}://`));
    if (deepLink) {
      handleDeepLink(deepLink);
    }
  });
}
