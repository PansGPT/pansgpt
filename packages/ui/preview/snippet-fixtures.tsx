import { useState } from "react";
import { CodeSnippet, CodeSnippetReference, CodeSnippetTabReference } from "../src";
import { snippetSources, snippetSourceLines } from "./snippet-source-data";
type Token = { readonly text: string; readonly tone?: string };
const lines = (items: readonly (readonly Token[])[]): string =>
  items.map((row) => row.map((token) => token.text).join("")).join("\n");
const formatter =
  (items: readonly (readonly Token[])[]) =>
  (_line: string, index: number): React.ReactNode =>
    items[index]?.map((token, i) => (
      <span key={i} className="p-code-token" data-tone={token.tone}>
        {token.text || "\u200b"}
      </span>
    ));
export function SnippetFixtures(): React.ReactElement {
  const [selected, setSelected] = useState("npm");
  const [copied, setCopied] = useState("");
  const [expanded, setExpanded] = useState(false);
  const examples = [
    {
      value: "npm",
      label: "npm",
      code: Array.from({ length: 30 }, (_, i) => "npm example " + (i + 1)).join("\n"),
    },
    { value: "yarn", label: "yarn", code: "yarn add pansgpt\n<script>safe text</script>" },
    { value: "disabled", label: "disabled", code: "disabled", disabled: true },
    { value: "bun", label: "bun", code: "bun add pansgpt" },
  ];
  return (
    <section className="preview-section">
      <h2>Code snippet tabs</h2>
      <div className="code-tab-source-grid">
        {snippetSources.tabs.map(([id, name]) => (
          <CodeSnippetTabReference
            key={id}
            data-source-id={id}
            current={name.includes("Current=True")}
            state={/State=(.+)/.exec(name)![1].toLowerCase() as "default" | "hover" | "focus"}
          >
            npm
          </CodeSnippetTabReference>
        ))}
      </div>
      <h2>Code snippet source layouts</h2>
      <div className="code-snippet-source-grid">
        <CodeSnippetReference
          data-source-id="1234:368"
          label="Source schema example"
          code={lines(snippetSourceLines.simple)}
          formatLine={formatter(snippetSourceLines.simple)}
        />
        <CodeSnippetReference
          data-source-id="9282:550144"
          label="Source color example"
          variant="tabs"
          items={["npm", "yarn", "bun"].map((value) => ({
            value,
            label: value,
            code: lines(snippetSourceLines.tabbed),
            formatLine: formatter(snippetSourceLines.tabbed),
          }))}
        />
      </div>
      <h2>Live examples</h2>
      <CodeSnippet
        data-testid="snippet-demo"
        label="Install package"
        variant="tabs"
        items={examples}
        value={selected}
        onValueChange={setSelected}
        expanded={expanded}
        onExpandedChange={setExpanded}
        collapseAfterLines={4}
        onCopy={setCopied}
      />
      <output data-testid="copied-code">{copied}</output>
      <CodeSnippet
        data-testid="snippet-uncontrolled"
        label="Simple text"
        code={'const value = "<b>literal</b>";\n\nexport default value;'}
        showCopy
      />
      <CodeSnippet
        data-testid="snippet-auto"
        label="Automatic selection"
        variant="tabs"
        items={examples.slice(1)}
        defaultValue="yarn"
      />
    </section>
  );
}
