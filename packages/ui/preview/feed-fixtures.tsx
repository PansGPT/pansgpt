import { useState, type ReactNode } from "react";
import {
  ActivityFeed,
  Avatar,
  Badge,
  FeedAttachment,
  FeedItem,
  FeedLabels,
  FeedMessage,
  type ActivityFeedEntry,
  type FeedItemProps,
  type UploadFileType,
} from "../src";
import { FeedAsset, feedAssetUrl, type FeedAssetName } from "../src/components/feed-assets";
import { feedItemSources, feedLayoutSources } from "./feed-source-data";

function RichText({
  text,
  onSelect,
}: {
  text: string;
  onSelect: (selection: string) => void;
}): React.ReactElement {
  return (
    <>
      {text.split(/(Marketing site redesign|@olivia)/).map((part, index) =>
        part === "Marketing site redesign" || part === "@olivia" ? (
          <button key={index} type="button" onClick={() => onSelect(part)}>
            {part}
          </button>
        ) : (
          part
        )
      )}
    </>
  );
}
function Labels(): React.ReactElement {
  return (
    <FeedLabels>
      <Badge color="brand">Design</Badge>
      <Badge color="blue">Product</Badge>
      <Badge color="indigo">Marketing</Badge>
    </FeedLabels>
  );
}
function OriginalFile({
  type,
  name,
  sizeText,
  onOpen,
  page,
}: {
  type: UploadFileType;
  name: string;
  sizeText: string;
  onOpen: () => void;
  page: FeedAssetName;
}): React.ReactElement {
  return (
    <FeedAttachment
      type={type}
      name={name}
      sizeText={sizeText}
      onOpen={onOpen}
      icon={
        <span className="p-file-type-icon" data-file-type={type} aria-hidden="true">
          <span className="p-file-type-page">
            <FeedAsset name={page} />
          </span>
          <span className="p-file-type-label">{type.toUpperCase()}</span>
        </span>
      }
    />
  );
}
export function FeedFixtures(): React.ReactElement {
  const [selection, setSelection] = useState("");
  const [read, setRead] = useState<ReadonlySet<string>>(new Set());
  const markRead = (id: string): void => setRead((previous) => new Set([...previous, id]));
  const makeEntry = (
    source: (typeof feedLayoutSources)[number]["rows"][number],
    sourceIndex: number
  ): ActivityFeedEntry => {
    const actor = source.texts[0]?.text ?? "";
    const timestamp = source.texts[1]?.text ?? "";
    const description = source.texts[2]?.text ?? "";
    const message = source.texts.find((text) => text.name === "Message");
    const fileIndex = source.texts.findIndex((text) => text.name === "File type");
    const labels = source.texts.some((text) => text.text === "Design");
    const fileName = source.texts[fileIndex + 1]?.text ?? "";
    const sizeText = source.texts[fileIndex + 2]?.text ?? "";
    const type = (source.texts[fileIndex]?.text.toLowerCase() ?? "pdf") as UploadFileType;
    const supporting =
      fileIndex >= 0 ? (
        <OriginalFile
          type={type}
          name={fileName}
          sizeText={sizeText}
          onOpen={() => setSelection(fileName)}
          page={`source${sourceIndex + 1}_imgPage` as FeedAssetName}
        />
      ) : labels ? (
        <Labels />
      ) : message ? (
        <FeedMessage>
          <RichText text={message.text} onSelect={setSelection} />
        </FeedMessage>
      ) : undefined;
    return {
      id: source.id,
      actor,
      timestamp,
      description: <RichText text={description} onSelect={setSelection} />,
      avatar: (
        <Avatar
          size="lg"
          src={feedAssetUrl(source.avatar as FeedAssetName)}
          label={actor}
          style={{ backgroundColor: source.avatarBackground }}
          status={source.online ? "online" : "offline"}
        />
      ),
      supporting,
      supportingType: fileIndex >= 0 ? "file" : labels ? "labels" : message ? "text" : undefined,
      unread: source.unread && !read.has(source.id),
      onMarkRead: () => markRead(source.id),
      markReadLabel: `Mark ${actor} activity as read`,
      connectorArtwork:
        "connector" in source && source.connector ? (
          <FeedAsset name={source.connector as FeedAssetName} />
        ) : undefined,
    };
  };
  return (
    <section className="preview-section">
      <h2>All sixteen feed-item variants</h2>
      <div className="feed-source-scroll">
        <div className="feed-item-source-grid">
          {feedItemSources.map((source) => {
            const size = source.name.startsWith("Size=sm") ? "sm" : "md";
            const connector = source.name.endsWith("True");
            const supportingType = source.name.includes("Supporting item=File")
              ? "file"
              : source.name.includes("Supporting item=Labels")
                ? "labels"
                : source.name.includes("Supporting item=Text")
                  ? "text"
                  : undefined;
            const actor = "Diepreye Ọ̀rẹ̀kọ́yà";
            const description =
              supportingType === "file"
                ? "Added a file to Marketing site redesign"
                : supportingType === "labels"
                  ? "Added 3 labels to the project Marketing site redesign"
                  : supportingType === "text"
                    ? "Commented in Marketing site redesign"
                    : "Invited Ìbùkúnọlá Abubakar to the team";
            const supporting: ReactNode =
              supportingType === "file" ? (
                <OriginalFile
                  type="pdf"
                  name="Tech requirements.pdf"
                  sizeText="720 KB"
                  onOpen={() => setSelection("Tech requirements.pdf")}
                  page="source0_imgPage"
                />
              ) : supportingType === "labels" ? (
                <Labels />
              ) : supportingType === "text" ? (
                <FeedMessage>
                  “Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tincidunt nunc ipsum
                  tempor purus vitae id.”
                </FeedMessage>
              ) : undefined;
            const connectors: Record<string, FeedAssetName> = {
              md_false: "source0_imgConnector",
              sm_false: "source0_imgConnector1",
              md_file: "source0_imgConnector2",
              sm_file: "source0_imgConnector3",
              md_labels: "source0_imgConnector4",
              sm_labels: "source0_imgConnector5",
              md_text: "source0_imgConnector6",
              sm_text: "source0_imgConnector7",
            };
            return (
              <FeedItem
                key={source.id}
                data-feed-source-id={source.id}
                actor={actor}
                timestamp="2 mins ago"
                avatar={
                  <Avatar
                    size={size === "sm" ? "sm" : "lg"}
                    label={actor}
                    src={feedAssetUrl("source0_imgAvatar")}
                    style={{ backgroundColor: "#cfcbdc" }}
                    status="online"
                  />
                }
                description={<RichText text={description} onSelect={setSelection} />}
                supporting={supporting}
                supportingType={supportingType}
                size={size}
                connector={connector}
                connectorArtwork={
                  connector ? (
                    <FeedAsset
                      name={
                        connectors[`${size}_${supportingType ?? "false"}`] ?? "source0_imgConnector"
                      }
                    />
                  ) : undefined
                }
                unread={!read.has(source.id)}
                onMarkRead={() => markRead(source.id)}
              />
            );
          })}
        </div>
      </div>
      <h2>Six complete activity feeds</h2>
      <div className="feed-source-scroll">
        <div className="feed-layout-source-grid">
          {feedLayoutSources.map((source, index) => (
            <ActivityFeed
              key={source.id}
              data-feed-source-id={source.id}
              label={source.name}
              divider={
                source.name.includes("Connector")
                  ? "connector"
                  : source.name.includes("False")
                    ? "none"
                    : "line"
              }
              items={source.rows.map((row) => makeEntry(row, index))}
            />
          ))}
        </div>
      </div>
      <h2>Live and empty feeds</h2>
      <ActivityFeed
        label="Live activity"
        divider="connector"
        items={[
          makeEntry(feedLayoutSources[0].rows[0], 0),
          {
            id: "dynamic",
            actor: "You",
            timestamp: "Just now",
            avatar: <Avatar label="You" initials="YO" size="lg" />,
            description: "Added a study note",
            supporting: (
              <FeedMessage>
                <label>
                  Note{" "}
                  <input
                    aria-label="Feed note"
                    defaultValue="A longer live entry keeps the connector aligned with its content."
                  />
                </label>
              </FeedMessage>
            ),
            supportingType: "text",
          } satisfies FeedItemProps & { id: string },
        ]}
      />
      <ActivityFeed label="Empty activity" items={[]} />
      <output data-testid="feed-selection">{selection}</output>
    </section>
  );
}
