import { useState } from "react";
import { Button, Notification, notificationTypes, type NotificationType } from "../src";
import {
  notificationAssetUrl,
  type NotificationAssetName,
} from "../src/components/notification-assets";

const content: Record<
  NotificationType,
  { title: string; description: string; action: string; secondary?: string }
> = {
  "primary-icon": {
    title: "We’ve just released a new update!",
    description: "Check out the all new dashboard view. Pages and exports now load faster.",
    action: "Changelog",
    secondary: "Dismiss",
  },
  image: {
    title: "We’ve just released a new update!",
    description: "Check out the all new dashboard view. Pages and exports now load faster.",
    action: "Changelog",
    secondary: "Dismiss",
  },
  avatar: {
    title: "Katherine Moss",
    description: "I’ve finished adding my notes. Happy for us to review whenever you’re ready!",
    action: "Reply",
    secondary: "Dismiss",
  },
  "gray-icon": {
    title: "Version 1.4.1 is now available",
    description: "Includes the all new dashboard view. Pages and exports will now load faster.",
    action: "Install now",
    secondary: "Later",
  },
  "error-icon": {
    title: "This project has been unpublished",
    description: "Removing all users has unpublished this project. Add users to republish.",
    action: "Undo action",
  },
  "warning-icon": {
    title: "This project has been unpublished",
    description: "Removing all users has unpublished this project. Add users to republish.",
    action: "Undo action",
  },
  "success-icon": {
    title: "Successfully updated profile",
    description: "Your changes have been saved and your profile is live. Your team can make edits.",
    action: "View changes",
    secondary: "Dismiss",
  },
  "no-icon": {
    title: "Updates have been made to your profile",
    description: "Your team has made changes to your company profile since you last logged in.",
    action: "View changes",
    secondary: "Dismiss",
  },
  progress: {
    title: "Uploading ‘website-FINAL06.fig’",
    description: "Please wait while we upload your file.",
    action: "Upload another",
    secondary: "Cancel",
  },
};

function background(type: NotificationType, mobile: boolean): NotificationAssetName {
  if (type === "image")
    return mobile ? "imgTypeImageBreakpointMobile" : "imgTypeImageBreakpointDesktop";
  if (type === "progress")
    return mobile
      ? "imgTypeProgressIndicatorBreakpointMobile"
      : "imgTypeProgressIndicatorBreakpointDesktop";
  if (["gray-icon", "avatar", "no-icon"].includes(type)) {
    if (!mobile) return "imgTypeGrayIconBreakpointDesktop";
    return type === "gray-icon"
      ? "imgTypeGrayIconBreakpointMobile"
      : type === "avatar"
        ? "imgTypeAvatarBreakpointMobile"
        : "imgTypeNoIconBreakpointMobile";
  }
  return mobile ? "imgTypePrimaryIconBreakpointMobile" : "imgTypePrimaryIconBreakpointDesktop";
}

export function NotificationFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
  const [open, setOpen] = useState(true);
  const [progress, setProgress] = useState(60);
  return (
    <section className="preview-section" aria-labelledby="notification-fixtures-title">
      <h2 id="notification-fixtures-title">Notifications</h2>
      <p>Nine types across desktop and mobile, with original source-preview backgrounds.</p>
      <div className="notification-fixtures">
        {(["desktop", "mobile"] as const).flatMap((breakpoint) =>
          notificationTypes.map((type) => {
            const data = content[type];
            const mobile = breakpoint === "mobile";
            const title =
              mobile && type === "gray-icon" ? "We’ve just released a new update!" : data.title;
            return (
              <div className="notification-fixture-scroll" key={`${type}-${breakpoint}`}>
                <p>
                  {type} / {breakpoint}
                </p>
                <div
                  className="notification-source-frame"
                  data-type={type}
                  data-breakpoint={breakpoint}
                  style={{ width: mobile ? 375 : type === "image" ? 544 : 504 }}
                >
                  <img
                    className="notification-source-background"
                    src={notificationAssetUrl(background(type, mobile))}
                    alt=""
                  />
                  <Notification
                    type={type}
                    breakpoint={breakpoint}
                    title={title}
                    description={data.description}
                    timeLabel={type === "avatar" ? "2 mins ago" : undefined}
                    avatarLabel="Katherine Moss"
                    progress={60}
                    announcement="off"
                    action={{
                      label: data.action,
                      onClick: () => setAction(`${type}/${breakpoint}/${data.action}`),
                    }}
                    secondaryAction={
                      data.secondary
                        ? {
                            label: data.secondary,
                            onClick: () => setAction(`${type}/${breakpoint}/${data.secondary}`),
                          }
                        : undefined
                    }
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
      <output aria-label="Last notification action">{action}</output>
      <div className="notification-controlled-example">
        <Button leadingIcon={null} trailingIcon={null} onClick={() => setOpen(true)}>
          Show controlled notification
        </Button>
        <Button leadingIcon={null} trailingIcon={null} onClick={() => setProgress(100)}>
          Finish upload
        </Button>
        <Notification
          type="progress"
          title="Uploading study notes"
          description="Progress comes from the upload engine."
          open={open}
          onOpenChange={setOpen}
          progress={progress}
          action={{ label: "View file", onClick: () => setAction("view-file") }}
        />
      </div>
      <Notification
        title="Error announcement example"
        type="error-icon"
        showActions={false}
        showClose={false}
      />
    </section>
  );
}
