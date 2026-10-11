import {
  Button,
  SegmentedControl,
  SlideoutFooter,
  SlideoutHeader,
  SlideoutSurface,
  Tabs,
} from "../src";
import { SlideoutAsset, type SlideoutAssetName } from "../src/components/slideout-assets";
import {
  AssistantIntroHeader,
  AssistantPrompts,
  SlideoutChatContent,
  SlideoutComposer,
} from "./slideout-chat-content";
import { CalendarEventContent, CalendarEventHeader } from "./slideout-calendar-content";
import { SlideoutListContent } from "./slideout-list-content";
import { SlideoutProfileContent, SlideoutProfileHeader } from "./slideout-profile-content";

export function SlideoutApplicationPanel({
  id,
  name,
  index,
  onAction,
}: {
  id: string;
  name: string;
  index: number;
  onAction: (value: string) => void;
}): React.ReactElement {
  const mobile = name.includes("Mobile");
  const type = name.match(/Type=([^,]+)/)?.[1] ?? "Messages";
  const assistant = type.startsWith("A.I. assistant");
  const intro = type.endsWith("intro");
  const chat = type === "Message chat";
  const profile = type === "User profile" || type === "User settings";
  const settings = type === "User settings";
  const tabs = type === "Messages" || chat;
  const title = profile
    ? settings
      ? ""
      : "Freelancer"
    : chat
      ? "Message"
      : type === "Labels"
        ? "Add labels to project"
        : type;
  const header = (
    <SlideoutHeader
      title={title}
      description={
        type === "Messages"
          ? "Lorem ipsum dolor sit amet."
          : type === "Labels"
            ? "Labels help organize projects."
            : chat
              ? "Group chat"
              : undefined
      }
      breakpoint={mobile ? "mobile" : "desktop"}
      closeIcon={<SlideoutAsset name={`source${index}_imgXClose` as SlideoutAssetName} />}
      onClose={() => onAction("Close")}
      tabs={
        tabs ? (
          <Tabs
            label="Conversation sections"
            variant="minimal"
            size="sm"
            fullWidth
            items={["Recent", "Groups", "Archive"].map((label) => ({
              value: label,
              label,
              content: null,
            }))}
          />
        ) : undefined
      }
    />
  );
  const footer =
    assistant || chat ? (
      <SlideoutFooter className="slideout-composer-footer">
        <SlideoutComposer
          index={index}
          advanced={assistant}
          textarea={assistant && !intro && mobile}
          label={assistant ? "Message assistant" : "Message team"}
          onAction={onAction}
        />
      </SlideoutFooter>
    ) : type === "Messages" ||
      type === "Notifications" ||
      type === "User profile" ? undefined : type === "Calendar event" ? (
      <SlideoutFooter className="slideout-calendar-footer">
        <span>Going?</span>
        <SegmentedControl
          label="Event attendance"
          defaultValue="yes"
          items={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "maybe", label: "Maybe" },
          ]}
          onValueChange={onAction}
        />
      </SlideoutFooter>
    ) : (
      <SlideoutFooter>
        <Button
          variant="secondary"
          size="md"
          leadingIcon={null}
          trailingIcon={null}
          onClick={() => onAction("Cancel")}
        >
          Cancel
        </Button>
        <Button
          size="md"
          leadingIcon={null}
          trailingIcon={null}
          onClick={() =>
            onAction(settings ? "Save changes" : type === "Team members" ? "Add members" : "Apply")
          }
        >
          {settings ? "Save changes" : type === "Team members" ? "Add members" : "Apply"}
        </Button>
      </SlideoutFooter>
    );
  return (
    <SlideoutSurface
      data-slideout-source-id={id}
      data-slideout-type={type}
      breakpoint={mobile ? "mobile" : "desktop"}
      label={name}
      header={
        assistant ? (
          intro ? (
            <AssistantIntroHeader index={index} mobile={mobile} onClose={() => onAction("Close")} />
          ) : null
        ) : type === "Calendar event" ? (
          <CalendarEventHeader index={index} mobile={mobile} onClose={() => onAction("Close")} />
        ) : chat ? null : profile ? (
          <>
            {header}
            <SlideoutProfileHeader
              index={index}
              mobile={mobile}
              settings={settings}
              onAction={onAction}
            />
          </>
        ) : (
          header
        )
      }
      footer={footer}
    >
      {assistant ? (
        intro ? (
          <AssistantPrompts index={index} onAction={onAction} />
        ) : (
          <SlideoutChatContent index={index} assistant onAction={onAction} />
        )
      ) : chat ? (
        <>
          {header}
          <SlideoutChatContent index={index} assistant={false} onAction={onAction} />
        </>
      ) : profile ? (
        <SlideoutProfileContent type={type} index={index} />
      ) : type === "Calendar event" ? (
        <CalendarEventContent index={index} onAction={onAction} />
      ) : (
        <SlideoutListContent type={type} index={index} onAction={onAction} />
      )}
    </SlideoutSurface>
  );
}
