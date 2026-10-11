import { AvatarGroup, AvatarLabelGroup, Button, SlideoutSection } from "../src";
import {
  SlideoutAsset,
  slideoutAssetUrl,
  type SlideoutAssetName,
} from "../src/components/slideout-assets";
function asset(index: number, suffix: string): SlideoutAssetName {
  return `source${index}_img${suffix}` as SlideoutAssetName;
}
export function CalendarEventHeader({
  index,
  mobile,
  onClose,
}: {
  index: number;
  mobile: boolean;
  onClose: () => void;
}): React.ReactElement {
  return (
    <header
      className="slideout-calendar-header p-slideout-header"
      data-breakpoint={mobile ? "mobile" : "desktop"}
    >
      <span className="slideout-calendar-date">
        <span>JAN</span>
        <strong>10</strong>
      </span>
      <h2>Product demo</h2>
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
export function CalendarEventContent({
  index,
  onAction,
}: {
  index: number;
  onAction: (value: string) => void;
}): React.ReactElement {
  return (
    <>
      <SlideoutSection>
        <div className="slideout-calendar-details-heading">
          <h3>Details</h3>
          <span>
            {["Copy01", "Trash01", "Edit01"].map((suffix, position) => (
              <Button
                key={suffix}
                iconOnly
                variant="tertiary"
                aria-label={["Duplicate event", "Delete event", "Edit event"][position] ?? suffix}
                leadingIcon={<SlideoutAsset name={asset(index, suffix)} />}
                onClick={() => onAction(suffix)}
              />
            ))}
          </span>
        </div>
        <ul className="slideout-calendar-details">
          {[
            { icon: "Calendar", text: "Friday, Jan 10, 2025" },
            { icon: "Clock", text: "1:30 PM – 3:30 PM" },
            { icon: "BellRinging01", text: "10 min before" },
          ].map((item) => (
            <li key={item.icon}>
              <SlideoutAsset name={asset(index, item.icon)} />
              {item.text}
            </li>
          ))}
        </ul>
      </SlideoutSection>
      <SlideoutSection title="Organizer">
        <AvatarLabelGroup
          size="md"
          name="Fatimah Ọ̀ṣúntókun"
          supportingText="ngozi@PansGPT.com"
          avatar={{ label: "Fatimah Ọ̀ṣúntókun", src: slideoutAssetUrl(asset(index, "Avatar")) }}
        />
      </SlideoutSection>
      <SlideoutSection title="Attendees">
        <AvatarGroup
          size="md"
          onAdd={() => onAction("Add attendee")}
          addLabel="Add attendee"
          members={[
            ...[0, 1, 2, 3, 4].map((position) => ({
              id: String(position),
              label: `Attendee ${position + 1}`,
              src: slideoutAssetUrl(asset(index, position === 0 ? "Avatar" : `Avatar${position}`)),
            })),
            { id: "or", label: "Orlando", initials: "OR" },
          ]}
        />
        <p className="slideout-calendar-attendance">
          <strong>6 guests</strong>
          <span>5 yes</span>
          <span>1 awaiting</span>
        </p>
      </SlideoutSection>
      <SlideoutSection title="About this event">
        <div className="slideout-calendar-description">
          <p>Sienna is inviting you to a scheduled Zoom meeting.</p>
          <p>Topic: Product demo for the new dashboard and Q&amp;A session.</p>
          <p>
            Join Zoom Meeting:{" "}
            <a href="https://us02web.zoom.us/j/86341969512">
              https://us02web.zoom.us/j/86341969512
            </a>
          </p>
          <p>Meeting ID: 863 4196 9512</p>
        </div>
      </SlideoutSection>
    </>
  );
}
