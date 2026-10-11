import { useRef, useState } from "react";
import { Button, FileDropzone, FileUpload, FileUploadItem, type UploadQueueItem } from "../src";

const sourceHint = "SVG, PNG, JPG or GIF (max. 800x400px)";
function queue(variant: "bar" | "fill"): UploadQueueItem[] {
  return [
    {
      id: "pdf",
      fileName: "Tech design requirements.pdf",
      fileType: "pdf",
      sizeLabel: variant === "bar" ? "200 KB of 200 KB" : "200 KB",
      status: "complete",
      progress: 100,
    },
    {
      id: "mp4",
      fileName: variant === "bar" ? "Dashboard recording.mp4" : "Dashboard prototype.mp4",
      fileType: "mp4",
      sizeLabel: variant === "bar" ? "6.4 MB of 16 MB" : "16 MB",
      progress: variant === "bar" ? 40.29 : 40,
      progressLabel: "40%",
    },
    {
      id: "fig",
      fileName: "Dashboard prototype FINAL.fig",
      fileType: "fig",
      sizeLabel: variant === "bar" ? "3.4 MB of 4.2 MB" : "4.2 MB",
      progress: variant === "bar" ? 80.58 : 80,
      progressLabel: "80%",
    },
  ];
}

export function UploadFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const nextId = useRef(0);
  const [selections, setSelections] = useState(0);
  return (
    <section className="preview-section" aria-labelledby="upload-fixtures-title">
      <h2 id="upload-fixtures-title">File uploads</h2>
      <p>
        Source dropzone, file-row and composed queue variants. Upload state is supplied by the
        caller.
      </p>
      <div className="upload-source-grid">
        {(["default", "hover", "disabled"] as const).map((state) => (
          <div className="upload-fixture-scroll" key={state}>
            <div className="upload-base-fixture" data-state={state} style={{ width: 512 }}>
              <p>{state}</p>
              <FileDropzone
                state={state}
                hint={sourceHint}
                onFilesSelected={() => setAction(state)}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="upload-source-grid">
        {(["bar", "fill"] as const).flatMap((variant) =>
          (["file-type", "simple"] as const).flatMap((iconType) =>
            (["uploading", "complete", "error"] as const).map((status) => {
              const value =
                status === "complete"
                  ? 100
                  : status === "error"
                    ? 0
                    : variant === "fill"
                      ? 70
                      : iconType === "simple"
                        ? 80
                        : 10.07;
              return (
                <div className="upload-fixture-scroll" key={`${variant}-${iconType}-${status}`}>
                  <div
                    className="upload-item-fixture"
                    data-variant={variant}
                    data-icon-type={iconType}
                    data-status={status}
                    style={{ width: 512 }}
                  >
                    <p>
                      {variant} / {iconType} / {status}
                    </p>
                    <FileUploadItem
                      fileName="Tech design requirements.pdf"
                      sizeLabel={
                        variant === "fill"
                          ? "200 KB"
                          : status === "complete"
                            ? "200 KB of 200 KB"
                            : status === "error"
                              ? "0 KB of 200 KB"
                              : iconType === "simple"
                                ? "160 KB of 200 KB"
                                : "20 KB of 200 KB"
                      }
                      progress={value}
                      progressLabel={`${Math.round(value)}%`}
                      variant={variant}
                      iconType={iconType}
                      status={status}
                      announceError={false}
                      onRetry={() => setAction(`${variant}/${iconType}/retry`)}
                      onRemove={() => setAction(`${variant}/${iconType}/remove`)}
                    />
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
      <div className="upload-source-grid">
        {(["bar", "fill"] as const).flatMap((variant) =>
          (["desktop", "mobile"] as const).flatMap((breakpoint) =>
            [true, false].map((queued) => (
              <div className="upload-fixture-scroll" key={`${variant}-${breakpoint}-${queued}`}>
                <div
                  className="upload-composed-fixture"
                  data-variant={variant}
                  data-breakpoint={breakpoint}
                  data-queued={String(queued)}
                  style={{ width: breakpoint === "desktop" ? 512 : 343 }}
                >
                  <p>
                    {variant} / {breakpoint} / {queued ? "queued" : "empty"}
                  </p>
                  <FileUpload
                    variant={variant}
                    hint={sourceHint}
                    items={queued ? queue(variant) : []}
                    onFilesSelected={() => setAction("source selection")}
                    onRemove={(id) => setAction(`remove/${id}`)}
                    onRetry={(id) => setAction(`retry/${id}`)}
                  />
                </div>
              </div>
            ))
          )
        )}
      </div>
      <output aria-label="Last upload action">{action}</output>
      <div
        className="upload-interactive-example"
        role="group"
        aria-label="Interactive upload example"
      >
        <p>Demo: PDF files up to 1 KB; progress buttons simulate engine events.</p>
        <FileUpload
          accept=".pdf"
          maxBytes={1024}
          inputLabel="Demo upload files"
          hint="PDF, up to 1 KB"
          items={items}
          onFilesSelected={(files) => {
            setSelections((count) => count + 1);
            setItems((current) => [
              ...current,
              ...files.map((file) => ({
                id: `demo-${++nextId.current}`,
                fileName: file.name,
                sizeLabel: `${file.size} bytes`,
                progress: 0,
              })),
            ]);
          }}
          onRemove={(id) => setItems((current) => current.filter((item) => item.id !== id))}
          onRetry={(id) =>
            setItems((current) =>
              current.map((item) =>
                item.id === id ? { ...item, status: "uploading", progress: 0 } : item
              )
            )
          }
        />
        <output aria-label="Selection events">{selections}</output>
        <Button
          leadingIcon={null}
          trailingIcon={null}
          disabled={!items.length}
          onClick={() =>
            setItems((current) => current.map((item) => ({ ...item, status: "error" })))
          }
        >
          Simulate failure
        </Button>
        <Button
          leadingIcon={null}
          trailingIcon={null}
          disabled={!items.length}
          onClick={() =>
            setItems((current) =>
              current.map((item) => ({ ...item, status: "complete", progress: 100 }))
            )
          }
        >
          Simulate completion
        </Button>
      </div>
    </section>
  );
}
