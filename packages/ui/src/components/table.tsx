"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { Checkbox, Toggle } from "./selection";
import { HelpIcon, HelpIconGlyph, HelpIconReferenceCursor, TooltipSurface } from "./tooltip";
import { TableAsset } from "./table-assets";

export type TableSize = "sm" | "md";
export type TableSortDirection = "ascending" | "descending";
export type TableSort = { columnId: string; direction: TableSortDirection };
export type TableHeaderLabelProps = Omit<ComponentProps<"span">, "onClick"> & {
  children: ReactNode;
  arrow?: "none" | "up" | "down" | "selector";
  help?: ReactNode;
  helpLabel?: string;
  onSort?: () => void;
  sortLabel?: string;
  state?: "default" | "hover";
  referenceHelp?: boolean;
};
export function TableHeaderLabel({
  children,
  arrow = "none",
  help,
  helpLabel = "Column information",
  onSort,
  sortLabel,
  state = "default",
  referenceHelp = false,
  className,
  ...props
}: TableHeaderLabelProps): React.ReactElement {
  const graphic = arrow !== "none" && (
    <span className="p-table-header-arrow">
      <span data-arrow-state="default">
        <TableAsset
          name={
            arrow === "up"
              ? "source0_imgArrowUp"
              : arrow === "down"
                ? "source0_imgArrowDown"
                : "source0_imgChevronSelectorVertical"
          }
        />
      </span>
      <span data-arrow-state="hover">
        <TableAsset
          name={
            arrow === "up"
              ? "source0_imgArrowUp1"
              : arrow === "down"
                ? "source0_imgArrowDown1"
                : "source0_imgChevronSelectorVertical1"
          }
        />
      </span>
    </span>
  );
  return (
    <span {...props} className={cn("p-table-header-label", className)} data-state={state}>
      {onSort ? (
        <button type="button" className="p-table-sort" onClick={onSort} aria-label={sortLabel}>
          {children}
          {help == null && graphic}
        </button>
      ) : (
        <span className="p-table-sort-copy">
          {children}
          {help == null && graphic}
        </span>
      )}
      {help != null &&
        (referenceHelp ? (
          <span className="p-help-reference" data-placement="top-no-arrow">
            <HelpIconGlyph open={state === "hover"} />
            {state === "hover" && (
              <>
                <TooltipSurface content={help} contentWidth={109} />
                <HelpIconReferenceCursor />
              </>
            )}
          </span>
        ) : (
          <HelpIcon content={help} label={helpLabel} />
        ))}
      {help != null && graphic}
    </span>
  );
}
export type TableCellLeadActionProps = {
  type?: "checkbox" | "radio" | "toggle";
  label: string;
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  disabled?: boolean;
  name?: string;
  value?: string;
  onCheckedChange?: (checked: boolean) => void;
};
export function TableCellLeadAction({
  type = "checkbox",
  label,
  checked,
  defaultChecked,
  disabled,
  name,
  value,
  onCheckedChange,
}: TableCellLeadActionProps): React.ReactElement {
  if (type === "radio")
    return (
      <input
        className="p-table-radio"
        type="radio"
        aria-label={label}
        name={name}
        value={value}
        checked={checked === undefined ? undefined : checked === true}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
    );
  if (type === "toggle")
    return (
      <Toggle
        size="sm"
        aria-label={label}
        checked={checked === undefined ? undefined : checked === true}
        defaultChecked={defaultChecked}
        disabled={disabled}
        name={name}
        value={value}
        onCheckedChange={onCheckedChange}
      />
    );
  return (
    <Checkbox
      size="md"
      aria-label={label}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      name={name}
      value={value}
      onCheckedChange={(next) => onCheckedChange?.(next === true)}
    />
  );
}
export type TableHeaderCellProps = ComponentProps<"th"> & {
  size?: TableSize;
  selection?: ReactNode;
};
export function TableHeaderCell({
  size = "md",
  selection,
  children,
  className,
  ...props
}: TableHeaderCellProps): React.ReactElement {
  return (
    <th
      {...props}
      scope={props.scope ?? "col"}
      className={cn("p-table-header-cell", className)}
      data-size={size}
    >
      <div className="p-table-cell-inner">
        {selection}
        {children}
      </div>
    </th>
  );
}
export const tableCellTypes = [
  "text",
  "avatar",
  "file",
  "payment",
  "badge",
  "badges",
  "trend-positive",
  "trend-negative",
  "avatar-group",
  "select",
  "progress",
  "rating",
  "action-buttons",
  "action-icons",
  "action-menu",
] as const;
export type TableCellType = (typeof tableCellTypes)[number];
export type TableCellProps = ComponentProps<"td"> & {
  size?: TableSize;
  type?: TableCellType;
  selection?: ReactNode;
  state?: "default" | "hover";
};
export function TableCell({
  size = "md",
  type = "text",
  selection,
  state = "default",
  children,
  className,
  ...props
}: TableCellProps): React.ReactElement {
  return (
    <td
      {...props}
      className={cn("p-table-cell", className)}
      data-size={size}
      data-type={type}
      data-state={state}
    >
      <div className="p-table-cell-inner">
        {selection}
        {children}
      </div>
    </td>
  );
}
export function TableText({
  children,
  supportingText,
  strong = false,
}: {
  children?: ReactNode;
  supportingText?: ReactNode;
  strong?: boolean;
}): React.ReactElement {
  return (
    <span className="p-table-text" data-strong={strong}>
      <span>{children}</span>
      {supportingText != null && <span className="p-table-supporting">{supportingText}</span>}
    </span>
  );
}
export type DataTableColumn<Row> = {
  id: string;
  header: ReactNode;
  width?: number;
  help?: ReactNode;
  render: (row: Row) => ReactNode;
  sortValue?: (row: Row) => string | number | null | undefined;
  type?: TableCellType;
  align?: "start" | "end" | "center";
};
export type DataTableProps<Row> = Omit<ComponentProps<"section">, "onSelect"> & {
  rows: readonly Row[];
  columns: readonly DataTableColumn<Row>[];
  getRowId: (row: Row) => string;
  caption: string;
  size?: TableSize;
  dividers?: "lines" | "alternating";
  header?: ReactNode;
  footer?: ReactNode;
  empty?: ReactNode;
  selection?: boolean;
  selectedIds?: readonly string[];
  defaultSelectedIds?: readonly string[];
  onSelectionChange?: (ids: string[]) => void;
  isRowDisabled?: (row: Row) => boolean;
  rowLabel?: (row: Row) => string;
  sort?: TableSort | null;
  defaultSort?: TableSort | null;
  onSortChange?: (sort: TableSort) => void;
};
/** Local sorting and selection; callers own fetching, pagination and action callbacks. */
export function DataTable<Row>({
  rows,
  columns,
  getRowId,
  caption,
  size = "md",
  dividers = "lines",
  header,
  footer,
  empty = "No results.",
  selection = false,
  selectedIds,
  defaultSelectedIds = [],
  onSelectionChange,
  isRowDisabled,
  rowLabel,
  sort,
  defaultSort = null,
  onSortChange,
  className,
  ...props
}: DataTableProps<Row>): React.ReactElement {
  const [internalSelection, setInternalSelection] = useState<readonly string[]>(defaultSelectedIds);
  const [internalSort, setInternalSort] = useState<TableSort | null>(defaultSort);
  const selected = new Set(selectedIds ?? internalSelection);
  const activeSort = sort === undefined ? internalSort : sort;
  const sortable = columns.find((column) => column.id === activeSort?.columnId);
  const sorted = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      if (!activeSort || !sortable?.sortValue) return a.index - b.index;
      const av = sortable.sortValue(a.row),
        bv = sortable.sortValue(b.row);
      const aMissing = av == null || (typeof av === "number" && !Number.isFinite(av));
      const bMissing = bv == null || (typeof bv === "number" && !Number.isFinite(bv));
      if (aMissing || bMissing)
        return aMissing === bMissing ? a.index - b.index : aMissing ? 1 : -1;
      const comparison =
        typeof av === "number" && typeof bv === "number"
          ? av === bv
            ? 0
            : av < bv
              ? -1
              : 1
          : String(av).localeCompare(String(bv));
      return (
        (activeSort.direction === "descending" ? -comparison : comparison) || a.index - b.index
      );
    });
  const eligible = rows.filter((row) => !isRowDisabled?.(row)).map(getRowId);
  const count = eligible.filter((id) => selected.has(id)).length;
  const all = eligible.length > 0 && count === eligible.length;
  const changeSelection = (next: Set<string>) => {
    const ids = [...next];
    if (selectedIds === undefined) setInternalSelection(ids);
    onSelectionChange?.(ids);
  };
  const selectAll = (checked: boolean) => {
    const next = new Set(selected);
    for (const id of eligible)
      if (checked) next.add(id);
      else next.delete(id);
    changeSelection(next);
  };
  const changeSort = (column: DataTableColumn<Row>) => {
    const next: TableSort = {
      columnId: column.id,
      direction:
        activeSort?.columnId === column.id && activeSort.direction === "ascending"
          ? "descending"
          : "ascending",
    };
    if (sort === undefined) setInternalSort(next);
    onSortChange?.(next);
  };
  return (
    <section {...props} className={cn("p-data-table", className)} data-dividers={dividers}>
      {header}
      <div className="p-table-scroll" role="region" aria-label={caption} tabIndex={0}>
        <table
          className="p-table"
          style={{
            minWidth: columns.every((c) => c.width !== undefined)
              ? columns.reduce((sum, c) => sum + (c.width ?? 0), 0)
              : undefined,
          }}
        >
          <caption className="p-table-caption">{caption}</caption>
          <colgroup>
            {columns.map((column) => (
              <col key={column.id} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <TableHeaderCell
                  key={column.id}
                  size={size}
                  data-align={column.align}
                  aria-sort={
                    column.sortValue
                      ? activeSort?.columnId === column.id
                        ? activeSort.direction
                        : "none"
                      : undefined
                  }
                  selection={
                    selection && index === 0 ? (
                      <TableCellLeadAction
                        label="Select all rows"
                        checked={all ? true : count > 0 ? "indeterminate" : false}
                        disabled={eligible.length === 0}
                        onCheckedChange={selectAll}
                      />
                    ) : undefined
                  }
                >
                  <TableHeaderLabel
                    help={column.help}
                    helpLabel={`About ${typeof column.header === "string" ? column.header : column.id}`}
                    arrow={
                      column.sortValue
                        ? activeSort?.columnId === column.id
                          ? activeSort.direction === "ascending"
                            ? "up"
                            : "down"
                          : "selector"
                        : "none"
                    }
                    onSort={column.sortValue ? () => changeSort(column) : undefined}
                    sortLabel={
                      column.sortValue
                        ? `Sort by ${typeof column.header === "string" ? column.header : column.id}`
                        : undefined
                    }
                  >
                    {column.header}
                  </TableHeaderLabel>
                </TableHeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ row }) => {
              const id = getRowId(row);
              return (
                <tr key={id} aria-selected={selection ? selected.has(id) : undefined}>
                  {columns.map((column, index) => (
                    <TableCell
                      key={column.id}
                      size={size}
                      data-align={column.align}
                      type={column.type}
                      style={{
                        textAlign:
                          column.align === "end"
                            ? "right"
                            : column.align === "center"
                              ? "center"
                              : undefined,
                      }}
                      selection={
                        selection && index === 0 ? (
                          <TableCellLeadAction
                            label={`Select ${rowLabel?.(row) ?? id}`}
                            checked={selected.has(id)}
                            disabled={isRowDisabled?.(row)}
                            onCheckedChange={(checked) => {
                              const next = new Set(selected);
                              if (checked) next.add(id);
                              else next.delete(id);
                              changeSelection(next);
                            }}
                          />
                        ) : undefined
                      }
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className="p-table-empty" colSpan={columns.length}>
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
