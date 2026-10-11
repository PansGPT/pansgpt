import { useEffect, useState, type ReactNode } from "react";
import {
  Avatar,
  AudioPlaybackReference,
  AudioPlayer,
  FeedAttachment,
  Message,
  MessageActionButton,
  MessageActionPanel,
  MessageBubble,
  MessageComposer,
  MessageImage,
  MessageLink,
  MessageReaction,
  MessageReply,
  MessageStatusIcon,
  MessageTypingIndicator,
  VideoActionsBar,
  VideoOverlayAction,
  VideoPlayerSurface,
  type MessagePanelAction,
  type MessageType,
} from "../src";
import {
  MessageAsset,
  messageAssetUrl,
  type MessageAssetName,
} from "../src/components/message-assets";
import { messageSources } from "./message-source-data";
import { messagePrimitiveSources } from "./message-primitive-source-data";

export function MessageFixtures(): React.ReactElement {
  const [selection, setSelection] = useState("");
  const [reactions, setReactions] = useState<ReadonlySet<string>>(new Set());
  const [messages, setMessages] = useState<readonly string[]>([]);
  const [audioSrc, setAudioSrc] = useState("");
  const [failSend, setFailSend] = useState(false);
  useEffect(
    () => () => {
      if (audioSrc) URL.revokeObjectURL(audioSrc);
    },
    [audioSrc]
  );
  const action =
    (label: string): (() => void) =>
    () =>
      setSelection(label);
  const panelActions: MessagePanelAction[] = ["Stars02", "Edit04", "RefreshCcw02", "Copy01"].map(
    (name, index) => ({
      id: name,
      label: ["Improve message", "Edit message", "Retry message", "Copy message"][index] ?? name,
      icon: <MessageAsset name={`primitive2_img${name}` as MessageAssetName} />,
      onAction: action(name),
    })
  );
  const react = (key: string, pressed: boolean): void =>
    setReactions((previous) => {
      const next = new Set(previous);
      if (pressed) next.add(key);
      else next.delete(key);
      return next;
    });
  const sourceAsset = (index: number, suffix: string): MessageAssetName =>
    `variant${index}_img${suffix}` as MessageAssetName;
  const sourceMessage = (source: (typeof messageSources)[number], index: number): ReactNode => {
    const sourceType = source.name.match(/Type=([^,]+)/)?.[1] ?? "Message";
    const types: Record<string, MessageType> = {
      File: "file",
      Audio: "audio",
      Video: "video",
      Image: "image",
      Writing: "writing",
      Message: "text",
      "Message reply": "reply",
      "Link minimal": "link-minimal",
      "Link preview": "link-preview",
    };
    const type = types[sourceType] ?? "text";
    const sent = source.name.includes("Sent=True");
    const hasActions = source.name.includes("Actions panel=True");
    const texts: readonly string[] = source.texts;
    let content: ReactNode;
    if (type === "writing") content = <MessageTypingIndicator animate={false} />;
    else if (type === "file")
      content = (
        <MessageBubble>
          <FeedAttachment
            type={sent ? "pdf" : "jpg"}
            name={texts[2] ?? ""}
            sizeText={texts[3]}
            icon={
              <span
                className="p-file-type-icon"
                data-file-type={sent ? "pdf" : "jpg"}
                aria-hidden="true"
              >
                <span className="p-file-type-page">
                  <MessageAsset name={sourceAsset(index, "Page")} />
                </span>
                <span className="p-file-type-label">{sent ? "PDF" : "JPG"}</span>
              </span>
            }
            onOpen={action(texts[2] ?? "File")}
          />
        </MessageBubble>
      );
    else if (type === "audio")
      content = (
        <MessageBubble>
          <AudioPlaybackReference />
        </MessageBubble>
      );
    else if (type === "image")
      content = (
        <MessageImage
          src={messageAssetUrl(sourceAsset(index, "Image43"))}
          alt="Clouds above a green hillside"
          name={texts[2] ?? ""}
          sizeText={texts[3]}
          onOpen={action(texts[2] ?? "Image")}
        />
      );
    else if (type === "video")
      content = (
        <VideoPlayerSurface label="Video message preview" size="sm">
          <img
            className="p-video-poster"
            src={messageAssetUrl(sourceAsset(index, "SizeSmPlayingFalse"))}
            alt="Clouds above a green hillside"
          />
          <VideoOverlayAction small onClick={action("Play video")} />
          <VideoActionsBar
            size="sm"
            playing={false}
            currentTime={0}
            duration={28}
            volume={1}
            onTogglePlay={action("Play video")}
            onSeek={action("Seek video")}
            onVolumeChange={action("Volume")}
            onMuteChange={action("Mute video")}
            onSpeedChange={action("Speed")}
            onFullscreen={action("Fullscreen")}
            canFullscreen
          />
        </VideoPlayerSurface>
      );
    else if (type.startsWith("link"))
      content = (
        <MessageBubble>
          <MessageLink
            href="https://www.PansGPT.com"
            preview={
              type === "link-preview"
                ? messageAssetUrl(sourceAsset(index, "OpenGraphImage"))
                : undefined
            }
            previewAlt="PansGPT preview"
            title={type === "link-minimal" ? texts[2]?.trim() : undefined}
            description={type === "link-minimal" ? texts[3] : undefined}
            icon={
              type === "link-minimal" ? (
                <MessageAsset name={sourceAsset(index, "Link03")} />
              ) : undefined
            }
          />
        </MessageBubble>
      );
    else
      content = (
        <MessageBubble>
          {type === "reply" ? (
            <>
              <MessageReply onOpen={action("Open replied message")}>{texts[2]}</MessageReply>
              {texts[3]}
            </>
          ) : (
            texts[2]
          )}
        </MessageBubble>
      );
    return (
      <Message
        key={source.id}
        data-message-source-id={source.id}
        type={type}
        sent={sent}
        actor={texts[0]}
        timestamp={texts[1]}
        avatar={
          !sent ? (
            <Avatar
              size="md"
              label={texts[0] ?? ""}
              src={messageAssetUrl(sourceAsset(index, "Avatar"))}
            />
          ) : undefined
        }
        status={sent ? <MessageStatusIcon status="read" /> : undefined}
        actions={
          hasActions ? (
            <MessageActionPanel
              actions={panelActions.map((item, itemIndex) => ({
                ...item,
                icon: (
                  <MessageAsset
                    name={sourceAsset(
                      index,
                      itemIndex === 1 && ["file", "audio", "image", "video"].includes(type)
                        ? "DownloadCloud02"
                        : (["Stars02", "Edit04", "RefreshCcw02", "Copy01"][itemIndex] ?? "Copy01")
                    )}
                  />
                ),
              }))}
              reference
            />
          ) : undefined
        }
        reactions={
          type === "writing" || hasActions ? undefined : (
            <>
              <MessageReaction
                label="Heart"
                pressed={reactions.has(`${index}-heart`)}
                onPressedChange={(pressed) => react(`${index}-heart`, pressed)}
                emoji={
                  <MessageAsset className="p-message-emoji" name={sourceAsset(index, "Emoji")} />
                }
              />
              <MessageReaction
                label="Okay"
                count={2}
                pressed={reactions.has(`${index}-okay`)}
                onPressedChange={(pressed) => react(`${index}-okay`, pressed)}
                emoji={
                  <MessageAsset className="p-message-emoji" name={sourceAsset(index, "Emoji1")} />
                }
              />
            </>
          )
        }
      >
        {content}
      </Message>
    );
  };
  const composers = messagePrimitiveSources[3].variants;
  return (
    <section className="preview-section">
      <h2>All thirty-three message variants</h2>
      <div className="message-source-scroll">
        <div className="message-source-grid">{messageSources.map(sourceMessage)}</div>
      </div>
      <h2>Reactions, actions and delivery states</h2>
      <div className="message-primitive-grid">
        {messagePrimitiveSources[0].variants.map((source) => (
          <MessageReaction
            key={source.id}
            data-message-source-id={source.id}
            label="Heart"
            count={source.name.endsWith("True") ? 2 : undefined}
          />
        ))}
        <MessageActionPanel data-message-source-id="9206:591554" actions={panelActions} reference />
        {messagePrimitiveSources[2].variants.map((source) => (
          <MessageActionButton
            key={source.id}
            data-message-source-id={source.id}
            label="Message action"
            referenceState={source.name.endsWith("Hover") ? "hover" : "default"}
            onClick={action(source.name)}
          />
        ))}
        {messagePrimitiveSources[4].variants.map((source) => (
          <MessageStatusIcon
            key={source.id}
            data-message-source-id={source.id}
            status={
              source.name.includes("Unread")
                ? "unread"
                : source.name.includes("Failed")
                  ? "failed"
                  : "read"
            }
            readAt="2:20 PM"
            referenceState={source.name.endsWith("Hover") ? "hover" : "default"}
          />
        ))}
      </div>
      <h2>Three composers</h2>
      <div className="message-composer-grid">
        {composers.map((source) => (
          <MessageComposer
            key={source.id}
            data-message-source-id={source.id}
            label={source.name}
            variant={
              source.name.includes("Advanced")
                ? "advanced"
                : source.name.includes("Textarea")
                  ? "textarea"
                  : "minimal"
            }
            contextAvatar={<MessageAsset name="primitive4_imgAvatar" />}
            contextLabel="Olivia"
            onContextChange={action("Context")}
            onShortcuts={action("Shortcuts")}
            onRecord={action("Record")}
            onAttach={action("Attach")}
            onEmoji={action("Emoji")}
            onSend={(message) => {
              setMessages((previous) => [...previous, message]);
            }}
          />
        ))}
      </div>
      <h2>Live messaging</h2>
      <label>
        <input
          type="checkbox"
          checked={failSend}
          onChange={(event) => setFailSend(event.currentTarget.checked)}
        />
        Simulate send failure
      </label>
      <MessageComposer
        label="Live message"
        variant="textarea"
        onSend={async (message) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (failSend) throw new Error("Message was not delivered. Retry sending.");
          setMessages((previous) => [...previous, message]);
        }}
        onAttach={action("Attach")}
        onRecord={action("Record")}
        onEmoji={action("Emoji")}
      />
      <div role="log" aria-label="Sent messages">
        {messages.map((message, index) => (
          <Message
            key={index}
            actor="You"
            sent
            timestamp="Just now"
            status={<MessageStatusIcon status="read" />}
          >
            <MessageBubble>{message}</MessageBubble>
          </Message>
        ))}
      </div>
      <h2>Live native audio</h2>
      <input
        type="file"
        accept="audio/*"
        aria-label="Choose local audio"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) setAudioSrc(URL.createObjectURL(file));
        }}
      />
      {audioSrc && <AudioPlayer src={audioSrc} label="Local audio player" />}
      <output data-testid="message-selection">{selection}</output>
    </section>
  );
}
