import { useState } from "react";
import {
  AudioPlaybackReference,
  Avatar,
  Button,
  FeedAttachment,
  Message,
  MessageActionPanel,
  MessageBubble,
  MessageComposer,
  MessageReply,
  MessageStatusIcon,
  MessageTypingIndicator,
  type MessagePanelAction,
} from "../src";
import {
  SlideoutAsset,
  slideoutAssetUrl,
  type SlideoutAssetName,
} from "../src/components/slideout-assets";
import assistantMark from "../assets/slideout-assistant-mark.png";
function asset(index: number, suffix: string): SlideoutAssetName {
  return `source${index}_img${suffix}` as SlideoutAssetName;
}
export function AssistantMark(): React.ReactElement {
  return (
    <span className="slideout-assistant-mark" aria-hidden="true">
      <img src={typeof assistantMark === "string" ? assistantMark : assistantMark.src} alt="" />
    </span>
  );
}
export function AssistantIntroHeader({
  mobile,
  onClose,
  index,
}: {
  mobile: boolean;
  onClose: () => void;
  index: number;
}): React.ReactElement {
  return (
    <header
      className="p-slideout-header slideout-assistant-intro-header"
      data-breakpoint={mobile ? "mobile" : "desktop"}
    >
      <AssistantMark />
      <div>
        <h2>
          <span>Hi Olivia,</span>Welcome back! How can I help?
        </h2>
        <p>
          I’m here to help tackle your tasks. Choose from the prompts below or tell me what you
          need!
        </p>
      </div>
      <Button
        iconOnly
        variant="tertiary"
        className="p-slideout-close"
        aria-label="Close panel"
        leadingIcon={<SlideoutAsset name={asset(index, "XClose")} />}
        onClick={onClose}
      />
    </header>
  );
}
export function AssistantPrompts({
  index,
  onAction,
}: {
  index: number;
  onAction: (value: string) => void;
}): React.ReactElement {
  return (
    <div className="slideout-assistant-prompts">
      {[
        { label: "Create image", icon: "ImageUser" },
        { label: "Analyze data", icon: "BarChart04" },
        { label: "Make a plan", icon: "Zap" },
        { label: "Summarize text", icon: "File02" },
        { label: "Help me write", icon: "Edit04" },
        { label: "More", icon: "Stars02" },
      ].map((item) => (
        <Button
          key={item.label}
          variant="secondary"
          className="slideout-prompt-button"
          leadingIcon={<SlideoutAsset name={asset(index, item.icon)} />}
          trailingIcon={null}
          onClick={() => onAction(item.label)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
export function SlideoutComposer({
  index,
  advanced,
  textarea = false,
  label,
  onAction,
}: {
  index: number;
  advanced: boolean;
  textarea?: boolean;
  label: string;
  onAction: (value: string) => void;
}): React.ReactElement {
  return (
    <MessageComposer
      variant={textarea ? "textarea" : advanced ? "advanced" : "minimal"}
      label={label}
      contextLabel="Olivia"
      contextAvatar={advanced ? <SlideoutAsset name={asset(index, "Avatar")} /> : undefined}
      onSend={(message) => onAction(`Sent: ${message}`)}
      onAttach={() => onAction("Attach")}
      onShortcuts={() => onAction("Shortcuts")}
      onRecord={() => onAction("Record")}
      onContextChange={() => onAction("Context")}
    />
  );
}
export function SlideoutChatContent({
  index,
  assistant,
  onAction,
}: {
  index: number;
  assistant: boolean;
  onAction: (value: string) => void;
}): React.ReactElement {
  const [draftEdit, setDraftEdit] = useState("");
  const actions: MessagePanelAction[] = ["Stars02", "Edit04", "RefreshCcw02", "Copy01"].map(
    (suffix) => ({
      id: suffix,
      label:
        suffix === "Edit04"
          ? "Edit message"
          : suffix === "Copy01"
            ? "Copy message"
            : suffix === "RefreshCcw02"
              ? "Retry message"
              : "Improve message",
      icon: <SlideoutAsset name={asset(index, suffix)} />,
      onAction: () => {
        if (suffix === "Edit04") setDraftEdit("Edit selected message");
        onAction(suffix);
      },
    })
  );
  const avatar = (suffix: string, name: string): React.ReactElement => (
    <Avatar size="md" src={slideoutAssetUrl(asset(index, suffix))} label={name} status="online" />
  );
  return (
    <div className="slideout-chat-messages" data-assistant={assistant}>
      {assistant ? (
        <>
          <div className="slideout-assistant-chat-header">
            <AssistantMark />
            <Button
              iconOnly
              variant="tertiary"
              className="p-slideout-close"
              aria-label="Close panel"
              leadingIcon={<SlideoutAsset name={asset(index, "XClose")} />}
              onClick={() => onAction("Close")}
            />
          </div>
          <Message actor="Assistant" aria-label="Assistant greeting" showHeader={false}>
            <MessageBubble>Welcome back! How can I help?</MessageBubble>
          </Message>
          <Message
            actor="You"
            sent
            showHeader={false}
            aria-label="Your schedule request"
            actions={<MessageActionPanel actions={actions} reference />}
          >
            <MessageBubble>
              I’ve got a lunch meeting with Sarah tomorrow at noon. Can you adjust my schedule to
              fit this in?
            </MessageBubble>
          </Message>
          <Message actor="Assistant" showHeader={false} aria-label="Assistant recommendation">
            <MessageBubble>Okay! Here’s what I recommend:</MessageBubble>
          </Message>
          <div className="slideout-calendar-recommendations">
            {[
              { name: "Sync with Rhea", recommendation: "move to 1:30 PM." },
              { name: "Strategy session with Sienna", recommendation: "move to Thursday at 3 PM." },
            ].map((item) => (
              <div key={item.name}>
                <SlideoutAsset name={asset(index, "GCalendar")} />
                <span>
                  <button type="button" onClick={() => onAction(item.name)}>
                    {item.name}
                  </button>{" "}
                  {item.recommendation}
                </span>
              </div>
            ))}
          </div>
          <Message actor="Assistant" showHeader={false} aria-label="Assistant confirmation">
            <MessageBubble>
              Shall I update your calendar and notify Sienna and the team?
            </MessageBubble>
          </Message>
          <div className="slideout-assistant-confirm">
            <Button
              variant="link-gray"
              leadingIcon={null}
              trailingIcon={null}
              onClick={() => onAction("Cancel")}
            >
              Cancel
            </Button>
            <Button
              variant="link-color"
              leadingIcon={null}
              trailingIcon={null}
              onClick={() => onAction("Yes, update")}
            >
              Yes, update
            </Button>
          </div>
          <Message actor="You" sent showHeader={false} aria-label="Your schedule correction">
            <MessageBubble>
              Yes, but can we do the strategy session on Friday instead?
            </MessageBubble>
          </Message>
          <Message type="audio" actor="You" sent showHeader={false} aria-label="Your audio message">
            <MessageBubble>
              <AudioPlaybackReference />
            </MessageBubble>
          </Message>
          <MessageTypingIndicator animate={false} />
        </>
      ) : (
        <>
          <Message
            type="audio"
            actor="Foláshadé Chukwuma"
            timestamp="Thursday 10:16am"
            avatar={avatar("Avatar", "Foláshadé Chukwuma")}
          >
            <MessageBubble>
              <AudioPlaybackReference />
            </MessageBubble>
          </Message>
          <Message
            actor="Ìbùkúnọlá Abubakar"
            timestamp="Thursday 11:40am"
            avatar={avatar("Avatar1", "Ìbùkúnọlá Abubakar")}
          >
            <MessageBubble>Hey team, I’ve finished with the requirements doc!</MessageBubble>
          </Message>
          <Message
            type="file"
            actor="Ìbùkúnọlá Abubakar"
            timestamp="Thursday 11:40am"
            avatar={avatar("Avatar1", "Ìbùkúnọlá Abubakar")}
          >
            <MessageBubble>
              <FeedAttachment
                name="Tech requirements.pdf"
                sizeText="1.2 MB"
                onOpen={() => onAction("Tech requirements.pdf")}
              />
            </MessageBubble>
          </Message>
          <Message
            actor="You"
            sent
            timestamp="Thursday 11:41am"
            status={<MessageStatusIcon status="read" />}
          >
            <MessageBubble>Awesome! Thanks.</MessageBubble>
          </Message>
          <Message
            actor="Ọ̀rẹ́fúnmi Àrẹ̀gbẹ́ṣọ́lá"
            timestamp="Thursday 11:44am"
            avatar={avatar("Avatar2", "Ọ̀rẹ́fúnmi Àrẹ̀gbẹ́ṣọ́lá")}
            actions={<MessageActionPanel actions={actions} reference />}
          >
            <MessageBubble>Good timing—was just looking at this.</MessageBubble>
          </Message>
          <div className="slideout-chat-date">Today</div>
          <Message
            actor="Olúwadámilọ́lá Buhari"
            timestamp="Friday 2:20pm"
            avatar={avatar("Avatar3", "Olúwadámilọ́lá Buhari")}
          >
            <MessageBubble>Hey Olivia, can you please review the latest design?</MessageBubble>
          </Message>
          <Message
            actor="You"
            sent
            timestamp="Friday 2:20pm"
            status={<MessageStatusIcon status="unread" />}
          >
            <MessageBubble>Sure thing, I’ll have a look today.</MessageBubble>
          </Message>
        </>
      )}
      {draftEdit && <MessageReply>{draftEdit}</MessageReply>}
    </div>
  );
}
