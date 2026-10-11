import {
  ColorSwatch,
  GradientSwatch,
  TypeScaleSpecimen,
  ShadowCard,
  FocusRingCard,
  BlurCard,
  RadiusCard,
  RadiusExample,
  ContainerSpecimen,
  Keycap,
  NumericKey,
  NumericKeyCombo,
  DesignNote,
  VariablesIcon,
  FigmaVariablesNote,
  DesignSystemFooter,
  DesignSystemHeader,
  DesignCursor,
  MeasureLine,
  MeasureSpacingGuide,
  DocumentationTableCell,
  FoundationAsset,
  type NumericKeyType,
  type DesignCursorType,
  type DocumentationCellType,
} from "../src";
import { foundationSources } from "./foundation-source-data";
const note =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae congue nullam consectetur ornare consectetur sed in leo. Enim imperdiet urna tincidunt at integer.";
const keyTypes: Record<string, NumericKeyType> = {
  "(Template)": "template",
  "⌫ Delete": "delete",
  "Arrow: Left": "left",
  "Arrow: Right": "right",
  "Arrow: Up": "up",
  "Arrow: Down": "down",
  Simple: "simple",
  "⌘ Command": "command",
  "⇧ Shift": "shift",
  "⌥ Option": "option",
  "˄ Control": "control",
  "⏎ Return": "return",
  "⎋ Escape": "escape",
  "␣ Space": "space",
  "⇥ Tab": "tab",
};
const cellTypes: Record<string, DocumentationCellType> = {
  "Lead cell primary": "primary",
  "Lead cell secondary": "secondary",
  "Lead cell tertiary": "tertiary",
  "Cell default": "default",
  "Cell swatch light": "swatch-light",
  "Cell swatch dark": "swatch-dark",
  Divider: "divider",
  Header: "header",
};
export function FoundationFixtures(): React.ReactElement {
  return (
    <section className="preview-section">
      <h2>Foundations and design documentation</h2>
      {foundationSources.map((family) => (
        <section key={family.id}>
          <h3>{family.name}</h3>
          <div className="foundation-source-scroll">
            <div className="foundation-source-grid">
              {family.variants.map((source) => {
                const type = source.name.slice(source.name.indexOf("=") + 1);
                const position = type.toLowerCase() as "left" | "right" | "top" | "bottom";
                const cellType = cellTypes[type];
                const keys = Number(type);
                return (
                  <div
                    key={source.id}
                    data-foundation-source-id={source.id}
                    style={{ width: source.width }}
                  >
                    {family.id === "1029:37647" ? (
                      <ColorSwatch label="900" value="#000000" contrast="AA 4.55" />
                    ) : family.id === "1272:4548" ? (
                      <GradientSwatch
                        startLabel="800"
                        startValue="#000000"
                        endLabel="600"
                        endValue="#000000"
                      />
                    ) : family.id === "1019:35537" ? (
                      <TypeScaleSpecimen
                        title="Text 6xl"
                        specification="Font size: 72px / 4.5rem | Line height: 90px / 5.625rem | Letter spacing: -2%"
                      />
                    ) : family.id === "5253:373419" ? (
                      <ShadowCard />
                    ) : family.id === "5424:399227" ? (
                      <FocusRingCard />
                    ) : family.id === "5253:373221" ? (
                      <BlurCard />
                    ) : family.id === "5253:373849" ? (
                      <RadiusCard />
                    ) : family.id === "6443:299109" ? (
                      <RadiusExample />
                    ) : family.id === "1072:50372" ? (
                      <ContainerSpecimen />
                    ) : family.id === "1101:104589" ? (
                      <Keycap />
                    ) : family.id === "1101:104597" ? (
                      <NumericKey keyType={keyTypes[type]} />
                    ) : family.id === "1101:104664" ? (
                      <NumericKeyCombo>
                        {keys > 1 && (
                          <NumericKey
                            symbol={<FoundationAsset name="source11_imgSymbol" />}
                            keyType="command"
                          />
                        )}
                        {keys > 2 && (
                          <NumericKey
                            symbol={<FoundationAsset name="source11_imgSymbol1" />}
                            keyType="shift"
                          />
                        )}
                        {keys > 3 && (
                          <NumericKey
                            symbol={<FoundationAsset name="source11_imgSymbol2" />}
                            keyType="control"
                          />
                        )}
                        <NumericKey keyType="simple" />
                      </NumericKeyCombo>
                    ) : family.id === "1023:37095" ? (
                      <DesignSystemFooter
                        brand={
                          <div className="foundation-footer-brand">
                            <FoundationAsset name="source12_imgFavicon1" />
                            <span>PansGPT</span>
                          </div>
                        }
                      />
                    ) : family.id === "1027:9560" ? (
                      <DesignNote heading="Heading" badge="New" size={type as "sm" | "md"}>
                        {note}
                      </DesignNote>
                    ) : family.id === "5263:372534" ? (
                      <FigmaVariablesNote>{note.replace(" at integer.", ".")}</FigmaVariablesNote>
                    ) : family.id === "1518:345603" ? (
                      <DesignSystemHeader
                        heading="Typography"
                        description="Description text dolor sit incididunt, adipisicing tempor, tempor labore dolore magna aliqua."
                        sectionLabel="Foundations"
                        pageLabel="Typography"
                        mark={
                          <FoundationAsset
                            className="foundation-header-mark"
                            name="source15_imgFavicon1"
                          />
                        }
                      />
                    ) : family.id === "1143:83960" ? (
                      <MeasureSpacingGuide position={position} />
                    ) : family.id === "1143:83642" ? (
                      <MeasureLine spacer={type === "Spacer"} />
                    ) : family.id === "6472:99378" ? (
                      <VariablesIcon single={type === "True"} />
                    ) : family.id === "6472:98427" ? (
                      <DocumentationTableCell
                        type={cellType}
                        cursor={cellType.startsWith("swatch")}
                        followOn
                      >
                        {cellType.startsWith("swatch")
                          ? "gray-900"
                          : cellType === "header"
                            ? "Heading"
                            : "Content"}
                      </DocumentationTableCell>
                    ) : (
                      <DesignCursor type={type as DesignCursorType} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </section>
  );
}
