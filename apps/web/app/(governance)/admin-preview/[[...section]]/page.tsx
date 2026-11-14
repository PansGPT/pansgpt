import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GovernancePreview } from "@/components/governance/preview";
export default function AdminPreviewPage(): React.ReactElement {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <Suspense fallback={<p>Opening sample workspace…</p>}>
      <GovernancePreview />
    </Suspense>
  );
}
