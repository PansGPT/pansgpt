import "@pansgpt/ui/styles.css";
import "@/components/shell/shell.css";
import { AppShell } from "@/components/shell/app-shell";
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <AppShell>{children}</AppShell>;
}
