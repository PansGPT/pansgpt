import { useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  CardHeader,
  DataTable,
  Pagination,
  TableCell,
  TableCellLeadAction,
  TableHeaderCell,
  TableHeaderLabel,
  TableRating,
  TableText,
  type DataTableColumn,
  type TableCellType,
} from "../src";
import { TableAsset } from "../src/components/table-assets";
import { tableSources } from "./table-source-data";
import { tableContentSources } from "./table-content-data";
import { tableCellContents } from "./table-cell-content-data";
import { sourceTableCellType, TableSourceCellContent } from "./table-source-cell";
import type { TableSource } from "./table-source-types";

function TableSourceExample({
  source,
  onAction,
}: {
  source: TableSource;
  onAction: (action: string) => void;
}): React.ReactElement {
  const mobile = source.width === 375;
  const family = tableSources[3]?.variants.find((variant) => variant.id === source.id);
  const title = source.headerContent?.texts[0]?.text.trim();
  const files = title === "Files uploaded";
  const actions = files ? (
    <>
      <Button
        variant="secondary"
        size="md"
        leadingIcon={null}
        trailingIcon={null}
        onClick={() => onAction("Download all")}
      >
        Download all
      </Button>
      <Button
        size="md"
        leadingIcon={<TableAsset name="source11_imgUploadCloud02" />}
        trailingIcon={null}
        onClick={() => onAction("Upload")}
      >
        Upload
      </Button>
    </>
  ) : undefined;
  const header = source.headerContent ? (
    <CardHeader
      title={title}
      breakpoint={mobile ? "mobile" : "desktop"}
      badge={
        title === "Team members" ? (
          <Badge color="brand">100 users</Badge>
        ) : files && source.headerContent.texts.some((text) => text.text === "10/20 seats") ? (
          <Badge color="brand">10/20 seats</Badge>
        ) : undefined
      }
      supportingText={title === "Customers" ? source.headerContent.texts[1]?.text : undefined}
      menu={
        !files ? (
          <button
            type="button"
            className="p-table-action"
            aria-label={`${title} options`}
            onClick={() => onAction("Table options")}
          >
            <TableAsset name="source2_imgDotsVertical" />
          </button>
        ) : undefined
      }
      actions={actions}
      mobileActions={actions}
    />
  ) : undefined;
  const rows = Array.from(
    { length: (source.columns[0]?.cells.length ?? 1) - 1 },
    (_, index) => index
  );
  const columns: DataTableColumn<number>[] = source.columns.map((column) => {
    const first = column.cells[0];
    const body = column.cells[1];
    const cellType = sourceTableCellType(String(body?.props.Type));
    return {
      id: column.id,
      header: (
        <TableHeaderLabel
          arrow={
            first?.content.images.some((image) => image.src.includes("ArrowDown"))
              ? "down"
              : first?.content.images.some((image) => image.src.includes("ChevronSelector"))
                ? "selector"
                : "none"
          }
          help={
            first?.content.images.some((image) => image.src.includes("HelpIcon"))
              ? "This is a tooltip"
              : undefined
          }
        >
          {first?.name === "Table header cell" ? first.content.texts[0]?.text : undefined}
        </TableHeaderLabel>
      ),
      width: column.width,
      type: cellType,
      render: (row) => {
        const cell = column.cells[row + 1];
        return cell ? (
          <TableSourceCellContent
            source={cell.content}
            type={cellType}
            size="md"
            index={source.assetIndex}
            onAction={onAction}
          />
        ) : null;
      },
    };
  });
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => String(row)}
      rowLabel={(row) => source.columns[0]?.cells[row + 1]?.content.texts[0]?.text ?? String(row)}
      caption={title ?? "Sales invoices"}
      selection={source.columns[0]?.cells[0]?.props.Checkbox === "True"}
      dividers={family?.name.includes("Alternating") ? "alternating" : "lines"}
      header={header}
      footer={
        source.pagination ? (
          <Pagination
            pageCount={10}
            variant="card-default"
            breakpoint={mobile ? "mobile" : "desktop"}
            onPageChange={(page) => onAction(`Page ${page}`)}
          />
        ) : undefined
      }
    />
  );
}
export function TableFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
  const [empty, setEmpty] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const rows = [
    { id: "a", name: "Ada", score: 10 },
    { id: "b", name: "Bola", score: 5 },
    { id: "c", name: "Chika", score: 5 },
    { id: "d", name: "Disabled", score: null },
  ];
  const columns: DataTableColumn<(typeof rows)[number]>[] = [
    {
      id: "name",
      header: "Name",
      width: 280,
      sortValue: (row) => row.name,
      help: "The learner's name",
      render: (row) => <TableText strong>{row.name}</TableText>,
    },
    {
      id: "score",
      header: "Score",
      width: 180,
      sortValue: (row) => row.score,
      render: (row) => row.score ?? "Unavailable",
    },
    {
      id: "rating",
      header: "Rating",
      width: 180,
      type: "rating",
      render: (row) => (
        <TableRating
          label={`${row.name} rating`}
          defaultValue={4}
          onValueChange={(value) => setAction(`${row.name}: ${value} stars`)}
        />
      ),
    },
  ];
  function primitive(familyId: string, id: string, name: string, width: number): ReactNode {
    const size = name.includes("Size=sm") ? "sm" : "md";
    if (familyId === "1221:106788")
      return (
        <TableHeaderLabel
          referenceHelp
          state={name.includes("Hover") ? "hover" : "default"}
          help={name.includes("Help icon=True") ? "This is a tooltip" : undefined}
          arrow={
            name.includes("Arrow=Down")
              ? "down"
              : name.includes("Arrow=Up")
                ? "up"
                : name.includes("Chevron selector")
                  ? "selector"
                  : "none"
          }
        >
          <span style={{ display: "inline-block", width: 57 }}>Company</span>
        </TableHeaderLabel>
      );
    if (familyId === "9400:570197")
      return (
        <TableCellLeadAction
          label={name}
          type={name.includes("Radio") ? "radio" : name.includes("Toggle") ? "toggle" : "checkbox"}
          name={`source-${id}`}
        />
      );
    if (familyId === "1221:107933")
      return (
        <table className="p-table" style={{ width }}>
          <tbody>
            <tr>
              <TableHeaderCell
                size={size}
                selection={
                  name.includes("Checkbox=True") ? (
                    <TableCellLeadAction label="Select table rows" />
                  ) : undefined
                }
              >
                {name.includes("Text=True") && (
                  <TableHeaderLabel arrow={name.includes("Checkbox=True") ? "down" : "none"}>
                    <span style={{ display: "inline-block", width: 57 }}>Company</span>
                  </TableHeaderLabel>
                )}
              </TableHeaderCell>
            </tr>
          </tbody>
        </table>
      );
    const content = tableCellContents.find((cell) => cell.id === id);
    if (!content) throw new Error(`Missing table cell ${id}`);
    const type = sourceTableCellType(name.match(/Type=([^,]+)/)?.[1] ?? "Text");
    return (
      <table className="p-table" style={{ width }}>
        <tbody>
          <tr>
            <TableCell
              size={size}
              type={type}
              state={name.includes("Hover") ? "hover" : "default"}
              selection={
                content.controls.some((control) => control.name === "TableCellLeadAction") ? (
                  <TableCellLeadAction label="Select row" />
                ) : undefined
              }
            >
              <TableSourceCellContent
                source={content}
                type={type}
                size={size}
                index={2}
                onAction={setAction}
              />
            </TableCell>
          </tr>
        </tbody>
      </table>
    );
  }
  return (
    <section className="preview-section">
      <h2>Table source families</h2>
      {tableSources.map((family) => (
        <section key={family.id}>
          <h3>{family.name}</h3>
          <div className="table-source-scroll">
            <div className="table-source-grid">
              {family.variants.map((source) => (
                <div
                  data-table-source-id={source.id}
                  key={source.id}
                  style={{ width: source.width }}
                >
                  {family.id === "1227:110587" ? (
                    <TableSourceExample
                      source={tableContentSources.find((table) => table.id === source.id)!}
                      onAction={setAction}
                    />
                  ) : (
                    primitive(family.id, source.id, source.name, source.width)
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
      <h2>Live data table</h2>
      <label>
        <input
          type="checkbox"
          checked={empty}
          onChange={(event) => setEmpty(event.target.checked)}
        />
        Show empty table
      </label>
      <div data-testid="live-table">
        <DataTable
          caption="Learner results"
          rows={empty ? [] : rows}
          columns={columns}
          getRowId={(row) => row.id}
          rowLabel={(row) => row.name}
          selection
          selectedIds={selected}
          onSelectionChange={setSelected}
          isRowDisabled={(row) => row.id === "d"}
        />
      </div>
      <output data-testid="table-selection">{selected.join(",")}</output>
      <output data-testid="table-action">{action}</output>
    </section>
  );
}
