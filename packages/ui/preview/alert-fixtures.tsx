import { useState } from "react";
import { Alert, alertColors, Button, type AlertColor } from "../src";

export const alertTitles: Record<AlertColor, string> = {
  default: "We’ve just released a new feature",
  brand: "We’ve just released a new feature",
  gray: "We’ve just released a new feature",
  error: "There was a problem with that action",
  warning: "Just to let you know this might be a problem",
  success: "Successfully updated profile",
};

export function AlertFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
  const [open, setOpen] = useState(true);
  return (
    <section className="preview-section" aria-labelledby="alert-fixtures-title">
      <h2 id="alert-fixtures-title">Alerts</h2>
      <p>Six colors, two layouts and both source breakpoints.</p>
      <div className="alert-fixtures">
        {(["floating", "full-width"] as const).flatMap((layout) =>
          (["desktop", "mobile"] as const).flatMap((breakpoint) =>
            alertColors.map((color) => (
              <div className="alert-fixture-scroll" key={`${layout}-${breakpoint}-${color}`}>
                <div
                  className="alert-fixture"
                  data-layout={layout}
                  data-breakpoint={breakpoint}
                  data-color={color}
                  style={{
                    width:
                      breakpoint === "desktop"
                        ? layout === "floating"
                          ? 1216
                          : 1440
                        : layout === "floating"
                          ? 343
                          : 375,
                  }}
                >
                  <p>
                    {color} / {layout} / {breakpoint}
                  </p>
                  <Alert
                    title={alertTitles[color]}
                    color={color}
                    layout={layout}
                    breakpoint={breakpoint}
                    announcement="off"
                    description={
                      layout === "floating" ? (
                        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aliquid pariatur, ipsum dolor."
                      ) : (
                        <>
                          Lorem ipsum dolor sit amet <a href="#alert-fixtures-title">consectetur</a>
                          .
                        </>
                      )
                    }
                    action={{
                      label:
                        color === "error" ||
                        color === "warning" ||
                        (layout === "full-width" && color === "success")
                          ? "Learn more"
                          : "View changes",
                      onClick: () => setAction(`${color}/${layout}/${breakpoint}`),
                    }}
                  />
                </div>
              </div>
            ))
          )
        )}
      </div>
      <output aria-label="Last alert action">{action}</output>
      <div className="alert-controlled-example">
        <Button leadingIcon={null} trailingIcon={null} onClick={() => setOpen(true)}>
          Show controlled alert
        </Button>
        <Alert
          title="Responsive controlled alert"
          layout="full-width"
          open={open}
          onOpenChange={setOpen}
          action={{ label: "View changes", onClick: () => setAction("responsive") }}
          description="Selection and visibility survive viewport changes."
        />
      </div>
      <Alert
        title="Alert without actions"
        showActions={false}
        description="Supporting text can be omitted independently."
        announcement="off"
      />
      <Alert
        title="Alert without supporting text"
        showClose={false}
        action={{ label: "View changes", onClick: () => setAction("compact") }}
        announcement="off"
      />
    </section>
  );
}
