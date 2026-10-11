import { useState, type ReactNode } from "react";
import {
  ActivityFeed,
  Avatar,
  AvatarLabelGroup,
  Badge,
  Button,
  Checkbox,
  FeedAttachment,
  FeedMessage,
  Input,
  SlideoutSection,
  type ActivityFeedEntry,
  type BadgeColor,
  type UploadFileType,
} from "../src";
import {
  SlideoutAsset,
  slideoutAssetUrl,
  type SlideoutAssetName,
} from "../src/components/slideout-assets";
import { slideoutFeedSources } from "./slideout-feed-source-data";

interface SourceRow {
  id?: string;
  texts: readonly { name: string; text: string }[];
  images: readonly string[];
  background?: string;
  online?: boolean;
  unread: boolean;
}
const labelNames = [
  "Design",
  "Product",
  "Marketing",
  "Management",
  "Sales",
  "Product",
  "Operations",
  "Customer Success",
  "Human Resources",
  "Compliance",
  "Finance",
];
const labelColors: readonly BadgeColor[] = [
  "brand",
  "blue",
  "indigo",
  "pink",
  "brand",
  "success",
  "blue-light",
  "purple",
  "blue",
  "orange",
  "gray",
];
function sourceAsset(index: number, name: string): SlideoutAssetName {
  return `source${index}_${name}` as SlideoutAssetName;
}
function RichText({
  text,
  onAction,
}: {
  text: string;
  onAction: (value: string) => void;
}): React.ReactElement {
  return (
    <>
      {text.split(/(Marketing site redesign|@olivia)/).map((part, index) =>
        part === "Marketing site redesign" || part === "@olivia" ? (
          <button key={index} type="button" onClick={() => onAction(part)}>
            {part}
          </button>
        ) : (
          part
        )
      )}
    </>
  );
}
function ThreadList({
  notifications,
  onAction,
}: {
  notifications: boolean;
  onAction: (value: string) => void;
}): React.ReactElement {
  const [read, setRead] = useState<ReadonlySet<string>>(new Set());
  const source = slideoutFeedSources[notifications ? 1 : 0];
  const rows: readonly SourceRow[] = source.rows;
  const items: ActivityFeedEntry[] = rows.map((row, position) => {
    const id = row.id ?? String(position);
    const actor = row.texts[0]?.text ?? "";
    const timestamp = row.texts[1]?.text ?? "";
    const description = row.texts[2]?.text ?? "";
    const fileIndex = row.texts.findIndex((text) =>
      ["PDF", "TXT", "JPG", "MP4"].includes(text.text)
    );
    const supporting =
      fileIndex >= 0 ? (
        <FeedAttachment
          type={(row.texts[fileIndex]?.text.toLowerCase() ?? "pdf") as UploadFileType}
          name={row.texts[fileIndex + 1]?.text ?? ""}
          sizeText={row.texts[fileIndex + 2]?.text ?? ""}
          onOpen={() => onAction(row.texts[fileIndex + 1]?.text ?? "Attachment")}
        />
      ) : row.texts[3] ? (
        notifications ? (
          <FeedMessage>
            <RichText
              text={row.texts
                .slice(3)
                .map((text) => text.text)
                .join(" ")}
              onAction={onAction}
            />
          </FeedMessage>
        ) : (
          <button
            type="button"
            className="slideout-thread-preview"
            aria-label={`Open conversation with ${actor}`}
            onClick={() => onAction(`Conversation: ${actor}`)}
          >
            <FeedMessage>
              {row.texts
                .slice(3)
                .map((text) => text.text)
                .join(" ")}
            </FeedMessage>
          </button>
        )
      ) : undefined;
    return {
      id,
      actor,
      timestamp,
      description: <RichText text={description} onAction={onAction} />,
      avatar: (
        <Avatar
          size="lg"
          label={actor}
          src={slideoutAssetUrl(
            sourceAsset(
              source.index,
              row.images.find((name) => name.startsWith("imgAvatar")) ?? "imgAvatar"
            )
          )}
          style={{ backgroundColor: row.background }}
          status={row.online ? "online" : "offline"}
        />
      ),
      supporting,
      supportingType: fileIndex >= 0 ? "file" : supporting ? "text" : undefined,
      unread: row.unread && !read.has(id),
      onMarkRead: () => setRead((previous) => new Set([...previous, id])),
      markReadLabel: `Mark ${actor} activity as read`,
    };
  });
  return (
    <ActivityFeed
      label={notifications ? "Panel notifications" : "Panel conversations"}
      className="slideout-thread-list"
      divider={notifications ? "connector" : "line"}
      items={items}
    />
  );
}
function LabelList({
  index,
  onAction,
}: {
  index: number;
  onAction: (value: string) => void;
}): React.ReactElement {
  const [query, setQuery] = useState("");
  return (
    <>
      <Input
        aria-label="Search for label"
        placeholder="Search for label"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        leadingIcon={<SlideoutAsset name={sourceAsset(index, "imgSearchLg")} />}
        trailingAddon={<kbd className="slideout-search-key">⌘K</kbd>}
      />
      <SlideoutSection title="Custom labels">
        <div className="slideout-label-list">
          {labelNames.map(
            (name, position) =>
              name.toLowerCase().includes(query.toLowerCase()) && (
                <Checkbox
                  key={`${name}-${position}`}
                  label={
                    <Badge size="md" color={labelColors[position]}>
                      {name}
                    </Badge>
                  }
                  defaultChecked={position < 4}
                  onCheckedChange={(checked) => onAction(`${name}: ${checked}`)}
                />
              )
          )}
        </div>
        <Button
          variant="link-color"
          leadingIcon={<SlideoutAsset name={sourceAsset(index, "imgPlus")} />}
          trailingIcon={null}
          onClick={() => onAction("Add label")}
        >
          Add label
        </Button>
      </SlideoutSection>
    </>
  );
}
function TeamList({
  index,
  onAction,
}: {
  index: number;
  onAction: (value: string) => void;
}): React.ReactElement {
  const [query, setQuery] = useState("");
  const source = slideoutFeedSources[2];
  const rows: readonly SourceRow[] = source.rows;
  return (
    <>
      <Input
        aria-label="Search team members"
        placeholder="Search"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        leadingIcon={<SlideoutAsset name={sourceAsset(index, "imgSearchLg")} />}
        trailingAddon={<kbd className="slideout-search-key">⌘K</kbd>}
      />
      {[
        { title: "Design", start: 0, end: 4 },
        { title: "Product", start: 4, end: 10 },
        { title: "Marketing", start: 10, end: 11 },
      ].map((group) => (
        <SlideoutSection key={group.title} title={group.title}>
          <div className="slideout-team-list">
            {rows
              .slice(group.start, group.end)
              .filter((row) =>
                row.texts.some((text) => text.text.toLowerCase().includes(query.toLowerCase()))
              )
              .map((row, position) => {
                const actor = row.texts[0]?.text ?? "";
                return (
                  <div key={row.id ?? position}>
                    <AvatarLabelGroup
                      size="md"
                      name={actor}
                      supportingText={row.texts[1]?.text}
                      avatar={{
                        label: actor,
                        src: slideoutAssetUrl(
                          sourceAsset(source.index, row.images[0] ?? "imgAvatar")
                        ),
                        status: row.online ? "online" : "offline",
                        style: { backgroundColor: row.background },
                      }}
                    />
                    <Button
                      iconOnly
                      variant="tertiary"
                      className="slideout-team-message"
                      leadingIcon={<SlideoutAsset name={sourceAsset(index, "imgMail01")} />}
                      aria-label={`Message ${actor}`}
                      onClick={() => onAction(`Message: ${actor}`)}
                    />
                  </div>
                );
              })}
          </div>
        </SlideoutSection>
      ))}
    </>
  );
}
export function SlideoutListContent({
  type,
  index,
  onAction,
}: {
  type: string;
  index: number;
  onAction: (value: string) => void;
}): ReactNode {
  if (type === "Messages" || type === "Notifications")
    return <ThreadList notifications={type === "Notifications"} onAction={onAction} />;
  if (type === "Labels") return <LabelList index={index} onAction={onAction} />;
  if (type === "Team members") return <TeamList index={index} onAction={onAction} />;
  return null;
}
