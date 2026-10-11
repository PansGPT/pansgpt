import { useState } from "react";
import {
  EditorColorSelect,
  TextEditor,
  TextEditorIcon,
  TextEditorToolbar,
  TextEditorTooltip,
  TextHighlight,
  TextHighlightReference,
  textEditorCommands,
  type TextEditorCommand,
  type TextEditorSnapshot,
} from "../src";

const sourceContent = (
  <>
    <p>
      We need another and a wiser and perhaps a more mystical concept of animals. Remote from
      universal nature, and living by complicated artifice, man in civilization surveys the creature
      through the glass of his knowledge and sees thereby a feather magnified and the whole image in
      distortion.
    </p>
    <p>
      We patronize them for their incompleteness, for their tragic fate of having taken form so far
      below ourselves. And therein we err, and greatly err. For the animal shall not be measured by
      man.
    </p>
    <p>
      <strong>In a world older and more complete than ours they move finished and complete,</strong>{" "}
      <em>gifted with extensions of the senses we have lost or never attained,</em>
      {
        " living by voices we shall never hear. They are not brethren, they are not underlings; they are other nations, caught with ourselves in the net of life and time, fellow prisoners of the splendour and travail of the earth."
      }
    </p>
  </>
);
const sources = [
  ["9292:559707", "sm", "default"],
  ["9291:558820", "md", "default"],
  ["9292:559714", "sm", "floating"],
  ["9292:559324", "md", "floating"],
] as const;
export function TextEditorFixtures(): React.ReactElement {
  const [snapshot, setSnapshot] = useState<TextEditorSnapshot>({
    text: "Pharmacy notes",
    html: "Pharmacy notes",
  });
  const [command, setCommand] = useState<TextEditorCommand>("Bold");
  return (
    <section className="preview-section">
      <h2>Text editor source layouts</h2>
      <div className="text-editor-source-scroll">
        <div className="text-editor-source-grid">
          {sources.map(([id, size, variant]) => (
            <TextEditor
              key={id}
              data-source-id={id}
              label={`Source text editor ${id}`}
              size={size}
              variant={variant}
              initialContent={sourceContent}
              hint="964 characters left"
              referenceScrollBar
              onRequest={(request) => {
                setCommand(request);
              }}
            />
          ))}
        </div>
      </div>
      <h2>All forty-eight icon states</h2>
      <div className="text-editor-source-scroll">
        <div className="text-editor-icon-grid">
          {(["default", "hover", "current"] as const).flatMap((state) =>
            textEditorCommands.map((type) => (
              <TextEditorIcon
                key={type + state}
                data-editor-reference-command={type}
                command={type}
                referenceState={state}
                onClick={() => setCommand(type)}
              />
            ))
          )}
        </div>
      </div>
      <h2>Color selection and toolbar layouts</h2>
      <div className="text-editor-reference-toolbars">
        <EditorColorSelect />
        <EditorColorSelect selected />
        <TextEditorToolbar />
        <TextEditorToolbar size="md" />
        <TextEditorTooltip activeCommands={["Bold"]} />
        <TextEditorTooltip advanced activeCommands={["Bold"]} />
      </div>
      <p>
        <TextHighlight>Selected text</TextHighlight>
      </p>
      <div style={{ paddingTop: 64, paddingBottom: 24 }}>
        <TextHighlightReference onCommand={setCommand} />
      </div>
      <h2>Live editing</h2>
      <TextEditor
        data-testid="text-editor-live"
        label="Notes editor"
        size="md"
        defaultValue="Pharmacy notes"
        maxLength={1000}
        onValueChange={setSnapshot}
        onRequest={(request) => {
          setCommand(request);
          return request === "Link"
            ? "https://example.com/course"
            : request === "Generate"
              ? "Study summary"
              : undefined;
        }}
      />
      <output data-testid="editor-text">{snapshot.text}</output>
      <output data-testid="editor-html">{snapshot.html}</output>
      <output data-testid="editor-command">{command}</output>
      <TextEditor label="Read-only notes" defaultValue="Read-only content" readOnly />
      <TextEditor label="Disabled notes" defaultValue="Disabled content" disabled />
      <TextEditor label="Five-character notes" defaultValue="" maxLength={5} />
    </section>
  );
}
