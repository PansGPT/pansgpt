import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { ESLint } = require("eslint");
const cwd = fileURLToPath(new URL("../apps/web/", import.meta.url));
const eslint = new ESLint({ cwd });
for (const path of ["app/__lint_probe.ts", "lib/__lint_probe.ts", "components/__lint_probe.tsx"]) {
  const results = await eslint.lintText("export const probe: any = 1;", { filePath: path });
  if (
    !results.some((result) =>
      result.messages.some(
        (message) =>
          message.ruleId === "@typescript-eslint/no-explicit-any" && message.severity === 2
      )
    )
  ) {
    throw new Error(`The lint gate did not reject explicit any in ${path}`);
  }
}
console.log("Web lint covers app, lib and components and rejects explicit any.");
