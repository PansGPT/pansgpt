"use client";

import { ErrorBoundary as SentryErrorBoundary } from "@sentry/react";
import type { ComponentProps } from "react";
import { Button } from "./button";

export type ErrorBoundaryProps = Pick<
  ComponentProps<typeof SentryErrorBoundary>,
  "children" | "fallback" | "onError" | "onReset" | "beforeCapture"
>;

/** Uses the app's Sentry client. The fallback never displays raw exception data. */
export function ErrorBoundary({ fallback, ...props }: ErrorBoundaryProps): React.ReactElement {
  return (
    <SentryErrorBoundary
      {...props}
      showDialog={false}
      fallback={
        fallback ??
        (({ resetError }) => (
          <div role="alert" className="p-error-fallback">
            <strong>Something went wrong</strong>
            <p>We couldn’t display this section. Try again to continue.</p>
            <Button autoFocus leadingIcon={null} trailingIcon={null} onClick={resetError}>
              Try again
            </Button>
          </div>
        ))
      }
    />
  );
}
