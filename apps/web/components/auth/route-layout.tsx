import "@pansgpt/ui/styles.css";
import "./auth.css";
import { AuthTheme } from "./theme";

export default function AuthRouteLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <AuthTheme>{children}</AuthTheme>;
}
