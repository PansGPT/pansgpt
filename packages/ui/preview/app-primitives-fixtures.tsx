import { useEffect, useState } from "react";
import { init as initSentry } from "@sentry/react";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  ErrorBoundary,
  Skeleton,
  Toaster,
  UserInitialsAvatar,
  toast,
} from "../src";

function StudySummary({ fail }: { fail: boolean }): React.ReactElement {
  if (fail) throw new Error("Synthetic render failure: private diagnostic details");
  return <p>Study summary is available.</p>;
}

export function AppPrimitivesFixtures(): React.ReactElement {
  const [actions, setActions] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [fail, setFail] = useState(false);
  const [captured, setCaptured] = useState(0);
  const [eventId, setEventId] = useState("");
  const [reporterReady, setReporterReady] = useState(false);
  useEffect(() => {
    // Synthetic workbench errors enter the real SDK pipeline, then are dropped.
    // No event, credential or diagnostic leaves this browser.
    const client = initSentry({
      dsn: "https://public@127.0.0.1/1",
      defaultIntegrations: false,
      sendClientReports: false,
      beforeSend(event) {
        if (event.exception) {
          setCaptured((count) => count + 1);
          setEventId(event.event_id ?? "");
        }
        return null;
      },
    });
    setReporterReady(true);
    return () => {
      void client?.close();
    };
  }, []);
  return (
    <section className="preview-section app-primitives-fixtures" aria-label="Shared app primitives">
      <h2>Shared app primitives</h2>
      <Card role="article" aria-labelledby="study-card-title" data-testid="study-card">
        <CardHeader
          title={<span id="study-card-title">Introduction to Pharmacology</span>}
          supportingText="PHA 201 · 42 pages"
          headingLevel={3}
        />
        <CardContent>
          <p>Last opened yesterday. Continue your study session.</p>
          <p data-testid="long-card-copy">{"pharmacology".repeat(35)}</p>
        </CardContent>
        <CardFooter>
          <a href="#document-opened">Open document</a>
          <Button leadingIcon={null} trailingIcon={null} onClick={() => setActions((n) => n + 1)}>
            Save for later
          </Button>
        </CardFooter>
      </Card>
      <output aria-label="Saved documents">{actions}</output>
      <div className="preview-row" aria-label="Initials avatar examples">
        <UserInitialsAvatar name="Godgive Okeke" size="sm" data-testid="initials-name" />
        <UserInitialsAvatar name="Godgive Okeke" data-testid="initials-duplicate" />
        <UserInitialsAvatar name="Ada" size="lg" data-testid="initials-single" />
        <UserInitialsAvatar name="  " email=" uche@example.invalid " data-testid="initials-email" />
        <UserInitialsAvatar data-testid="initials-empty" />
        <UserInitialsAvatar name="𠮷田 太郎" data-testid="initials-unicode" />
      </div>
      <div
        role="region"
        aria-label="Recent documents"
        aria-busy={!loaded}
        className="atom-loading-demo"
      >
        {loaded ? (
          <p>Document list loaded.</p>
        ) : (
          <>
            <span className="p-sr-only" role="status">
              Loading documents
            </span>
            <Skeleton variant="circle" />
            <Skeleton style={{ width: "65%" }} />
            <Skeleton variant="rectangle" />
            <Skeleton animated={false} />
          </>
        )}
      </div>
      <Button leadingIcon={null} trailingIcon={null} onClick={() => setLoaded(true)}>
        Load documents
      </Button>
      <div className="preview-row">
        <Button
          leadingIcon={null}
          trailingIcon={null}
          onClick={() =>
            toast.success("Note saved", {
              description: "Your study note is ready.",
              duration: Infinity,
              action: { label: "Undo", onClick: () => setActions((n) => n + 1) },
            })
          }
        >
          Show saved message
        </Button>
        <Button
          leadingIcon={null}
          trailingIcon={null}
          onClick={() =>
            toast("Temporary message", {
              duration: 1000,
            })
          }
        >
          Show temporary message
        </Button>
        <Button
          leadingIcon={null}
          trailingIcon={null}
          disabled={!reporterReady}
          onClick={() => setFail(true)}
        >
          Simulate section failure
        </Button>
      </div>
      <Toaster />
      <ErrorBoundary onReset={() => setFail(false)}>
        <StudySummary fail={fail} />
      </ErrorBoundary>
      <output aria-label="Captured errors">{captured}</output>
      <output aria-label="Captured event ID">{eventId}</output>
    </section>
  );
}
