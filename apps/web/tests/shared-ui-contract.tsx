// Compiled by the web typecheck: exercise the shared package from a real consumer.
import {
  Card,
  CardContent,
  CardFooter,
  ErrorBoundary,
  Skeleton,
  ThemeProvider,
  Toaster,
  UserInitialsAvatar,
} from "@pansgpt/ui";

export function SharedUiContract(): React.ReactElement {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Card>
          <CardContent>
            <UserInitialsAvatar name="Ada Okeke" />
            <Skeleton />
          </CardContent>
          <CardFooter>Study materials</CardFooter>
        </Card>
      </ErrorBoundary>
      <Toaster />
    </ThemeProvider>
  );
}
