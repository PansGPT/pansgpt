import { useState } from "react";
import { EmptyState, Illustration, type EmptyStateProps, type IllustrationProps } from "../src";
import { EmptyStateAsset } from "../src/components/empty-state-asset";
import { emptyStateSources } from "./empty-state-source-data";
import { illustrationSources } from "./illustration-source-data";
const variants = {
  Cloud: "cloud",
  Box: "box",
  Documents: "documents",
  "Credit card": "credit-card",
} as const;
export function EmptyStateFixtures(): React.ReactElement {
  const [action, setAction] = useState("No action");
  return (
    <section className="preview-section">
      <h2>Empty-state illustrations</h2>
      <div className="illustration-source-grid">
        {illustrationSources.map(([id, name]) => {
          const match = /Style=(.+), Size=(.+)/.exec(name)!;
          return (
            <div key={id} data-source-id={id}>
              <Illustration
                variant={variants[match[1] as keyof typeof variants]}
                size={match[2] as IllustrationProps["size"]}
              />
            </div>
          );
        })}
      </div>
      <Illustration label="Documents waiting for upload" variant="documents" />
      <h2>Empty states</h2>
      <div className="empty-state-source-grid">
        {[
          ...emptyStateSources.slice(9),
          ...emptyStateSources.slice(6, 9),
          ...emptyStateSources.slice(3, 6),
          ...emptyStateSources.slice(0, 3),
        ].map(([id, name]) => {
          const match = /Icon=(.+), Size=(.+)/.exec(name)!;
          const treatments = {
            "Featured icon": "featured",
            Illustration: "illustration",
            "File type icon": "file",
            "Folder icon": "folder",
          } as const;
          const size = match[2] as NonNullable<EmptyStateProps["size"]>;
          return (
            <EmptyState
              key={id}
              data-source-id={id}
              size={size}
              variant={treatments[match[1] as keyof typeof treatments]}
              title="No projects found"
              supportingText={
                "Your search “Landing page design” did not match any projects. Please try again."
              }
              secondaryAction={{
                label: "Clear search",
                onClick: () => setAction("Cleared search"),
              }}
              primaryAction={{
                label: "New project",
                onClick: () => setAction("Created project"),
                leadingIcon: (
                  <EmptyStateAsset
                    name={
                      size === "lg"
                        ? "featured-lg-imgPlus"
                        : size === "md"
                          ? "featured-md-imgPlus"
                          : "featured-sm-imgPlus"
                    }
                  />
                ),
              }}
            />
          );
        })}
      </div>
      <output aria-live="polite">{action}</output>
      <div className="empty-state-demo">
        <EmptyState
          data-testid="empty-demo"
          title="Nothing uploaded yet"
          supportingText="Add your first document."
          variant="illustration"
          size="lg"
          illustrationVariant="documents"
          decorativePattern={false}
          primaryAction={{ label: "Upload document", onClick: () => setAction("Upload opened") }}
          secondaryAction={{
            label: "Unavailable action",
            disabled: true,
            onClick: () => setAction("Unexpected action"),
          }}
        />
      </div>
      <EmptyState
        data-testid="empty-text-only"
        title="No results"
        showGraphic={false}
        decorativePattern={false}
      />
    </section>
  );
}
