import { defineConfig } from "../../../../../packages/ui/node_modules/vite/dist/node/index.js";
import react from "../../../../../packages/ui/node_modules/@vitejs/plugin-react/dist/index.js";
import { fileURLToPath } from "node:url";
const repo = fileURLToPath(new URL("../../../../../", import.meta.url)).replaceAll("\\", "/");
const fixture = fileURLToPath(new URL("./fixtures.jsx", import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "@/env", replacement: fixture },
      { find: "@/lib/auth-context", replacement: fixture },
      { find: "next/navigation", replacement: fixture },
      { find: "next/link", replacement: fixture },
      { find: "@pansgpt/ui/styles.css", replacement: repo + "packages/ui/src/styles/index.css" },
      { find: "@pansgpt/ui/shell", replacement: repo + "packages/ui/src/shell.ts" },
      { find: "react-dom", replacement: repo + "apps/web/node_modules/react-dom" },
      { find: "react", replacement: repo + "apps/web/node_modules/react" },
      { find: "@", replacement: repo + "apps/web" },
    ],
  },
  server: { host: "127.0.0.1", port: 4180, strictPort: true, fs: { allow: [repo] } },
});
