import "@pansgpt/ui/styles.css";
import "@/components/governance/governance.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Administration · PansGPT",
  robots: { index: false, follow: false },
};
export default function GovernanceLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
