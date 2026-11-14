import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GovernanceEntry } from "@/components/governance/workspace";
export default async function PlatformPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}): Promise<React.ReactElement> {
  const { section } = await params;
  if (section && section.length !== 1) notFound();
  return (
    <Suspense fallback={<div className="gov-gate">Opening workspace…</div>}>
      <GovernanceEntry portal="super-admin" section={section?.[0]} />
    </Suspense>
  );
}
