import type { ReactNode } from "react";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
  ProgressBar,
  Select,
  TableRating,
  TableText,
  type BadgeColor,
  type TableCellType,
  type TableSize,
} from "../src";
import { TableAsset, tableAssetUrl, type TableAssetName } from "../src/components/table-assets";
import type { SourceCellContent } from "./table-source-types";

export function sourceTableCellType(name: string): TableCellType {
  const types: Record<string, TableCellType> = {
    Text: "text",
    Avatar: "avatar",
    "File type icon": "file",
    "Payment method": "payment",
    Badge: "badge",
    "Badges multiple": "badges",
    "Trend positive": "trend-positive",
    "Trend negative": "trend-negative",
    "Avatar group": "avatar-group",
    "Select dropdown": "select",
    "Progress bar": "progress",
    "Star ratings": "rating",
    "Action buttons": "action-buttons",
    "Action icons": "action-icons",
    "Action dropdown icon": "action-menu",
  };
  return types[name] ?? "text";
}
function badgeColor(style: string): BadgeColor {
  return (style.match(
    /utility-(gray-blue|blue-light|gray|brand|error|warning|success|blue|indigo|purple|pink|orange)-/
  )?.[1] ?? "gray") as BadgeColor;
}
export function TableSourceCellContent({
  source,
  type,
  size,
  index,
  onAction,
}: {
  source: SourceCellContent;
  type: TableCellType;
  size: TableSize;
  index: number;
  onAction: (value: string) => void;
}): React.ReactElement {
  const initials =
    type === "avatar"
      ? source.blocks.find((block) => block.name === "Avatar")?.texts[0]
      : undefined;
  const texts = source.texts
    .map((text) => text.text)
    .filter((text, index) => !(index === 0 && text === initials));
  const asset = (name: string): TableAssetName => `source${index}_${name}` as TableAssetName;
  const graphic = (name: string): ReactNode => <TableAsset name={asset(name)} />;
  const strong =
    source.texts[0]?.style.includes("font-medium") &&
    source.texts[0]?.style.includes("text-primary");
  const badge = (block: SourceCellContent["blocks"][number], position: number): ReactNode => (
    <Badge
      key={position}
      size={block.style.includes("text-sm") || (size === "md" && index === 2) ? "md" : "sm"}
      variant={block.style.includes("radius-sm") ? "modern" : "pill"}
      color={badgeColor(block.style)}
      leading={
        type.startsWith("trend-")
          ? graphic(type === "trend-positive" ? "imgArrowUp" : "imgArrowDown")
          : undefined
      }
    >
      {block.texts.at(-1)}
    </Badge>
  );
  const menu = (
    <Dropdown>
      <DropdownTrigger asChild>
        <button className="p-table-action" type="button" aria-label="Row actions">
          {index === 2 ? graphic("imgDotsVertical") : <TableAsset name="source2_imgDotsVertical" />}
        </button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem onSelect={() => onAction("Edit row")}>Edit</DropdownItem>
        <DropdownItem onSelect={() => onAction("Delete row")}>Delete</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
  if (type === "action-menu") return menu;
  if (type === "action-buttons")
    return (
      <span className="p-table-actions">
        {["Delete", "Edit"].map((label) => (
          <button
            key={label}
            type="button"
            className="p-table-action"
            data-brand={label === "Edit"}
            onClick={() => onAction(label)}
          >
            {label}
          </button>
        ))}
      </span>
    );
  if (type === "action-icons")
    return (
      <span className="p-table-actions" style={{ gap: 2 }}>
        {source.images.map((image, i) => (
          <button
            key={i}
            className="p-table-action"
            data-icon
            type="button"
            aria-label={image.src.replace(/^img/, "").replace(/\d+$/, "")}
            onClick={() => onAction(image.src)}
          >
            {graphic(image.src)}
          </button>
        ))}
      </span>
    );
  if (type === "rating")
    return (
      <TableRating
        label="Customer rating"
        defaultValue={4}
        onValueChange={(value) => onAction(`${value} stars`)}
      />
    );
  if (type === "progress")
    return (
      <ProgressBar value={Number.parseFloat(texts[0] ?? "60")} showValue aria-label="License use" />
    );
  if (type === "select")
    return (
      <Select
        aria-label="Project status"
        defaultValue="progress"
        leadingIcon={<TableAsset name="source2_imgSizeMdOutlineFalse" />}
        trailingIcon={<TableAsset name="source2_imgChevronDown" />}
        options={[
          { value: "progress", label: texts[0] ?? "In progress" },
          { value: "complete", label: "Complete" },
          { value: "paused", label: "Paused" },
        ]}
        onValueChange={onAction}
      />
    );
  if (type === "badge" || type === "badges") {
    const blocks = source.blocks.filter((block) => block.name === "Badge");
    return (
      <span className="p-table-badges">
        {blocks.map((block, i) => {
          const isModern = block.style.includes("radius-sm");
          const hasDot = source.images.some((image) => image.src.startsWith("imgDot"));
          return (
            <Badge
              key={i}
              size={index === 2 && size === "md" ? "md" : "sm"}
              color={badgeColor(block.style)}
              variant={isModern ? "modern" : "pill"}
              leading={
                hasDot
                  ? graphic(
                      source.images.find((image) => image.src.startsWith("imgDot"))?.src ?? "imgDot"
                    )
                  : undefined
              }
            >
              {block.texts[0] ?? texts[i]}
            </Badge>
          );
        })}
      </span>
    );
  }
  if (type === "trend-positive" || type === "trend-negative")
    return (
      <>
        <span>{texts[0]}</span>
        {source.blocks.filter((block) => block.name === "Badge").map(badge)}
      </>
    );
  if (type === "avatar-group") {
    const images = source.images.filter((image) => image.src.startsWith("imgAvatar"));
    return (
      <>
        {texts.some((text) => text.endsWith("users")) && (
          <span>{texts.find((text) => text.endsWith("users"))}</span>
        )}
        <AvatarGroup
          members={images.map((image, i) => ({
            id: String(i),
            label: `Member ${i + 1}`,
            src: tableAssetUrl(asset(image.src)),
            style: { backgroundColor: source.backgrounds[i] },
          }))}
          size="xs"
          maxVisible={5}
          totalCount={10}
          onMoreClick={() => onAction("More members")}
        />
      </>
    );
  }
  if (type === "avatar")
    return (
      <span className="p-table-avatar-content" data-size={size}>
        <Avatar
          label={texts[0] ?? "User"}
          initials={initials}
          size={size === "md" ? "md" : "sm"}
          status={
            source.controls.some((control) => control.name === "AvatarOnlineIndicator")
              ? "online"
              : "none"
          }
          src={source.images[0] ? tableAssetUrl(asset(source.images[0].src)) : undefined}
          style={{ backgroundColor: source.backgrounds[0] }}
        />
        <TableText strong supportingText={texts[1]}>
          {texts[0]}
        </TableText>
      </span>
    );
  if (type === "file") {
    const wrap = source.blocks.find((block) => block.name === "File type wrap");
    const color =
      wrap?.style.match(/colors\\?\/([^\/]+)\\?\/600/)?.[1]?.replace(/\\/g, "") ?? "error";
    return (
      <span className="p-table-avatar-content" data-size={size}>
        <span className="table-source-file" data-size={size}>
          {source.images[0] ? (
            graphic(source.images[0].src)
          ) : (
            <TableAsset name={size === "md" ? "source2_imgPage" : "source2_imgPage1"} />
          )}
          <span style={{ backgroundColor: `var(--figma-colors-${color}-600)` }}>
            {texts[0] ?? "PDF"}
          </span>
        </span>
        <TableText strong supportingText={texts[2]}>
          {texts[1]}
        </TableText>
      </span>
    );
  }
  if (type === "payment")
    return (
      <span className="p-table-avatar-content" data-size={size}>
        <TableAsset
          name={
            size === "md" ? "source2_imgPaymentMethodIcon" : "source2_imgSizeSmPaymentMethodVisa"
          }
        />
        <TableText strong supportingText={texts[1]}>
          {texts[0]}
        </TableText>
      </span>
    );
  return (
    <TableText strong={Boolean(strong)} supportingText={texts[1]}>
      {texts[0]}
    </TableText>
  );
}
