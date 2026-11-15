"use client";
import { useMemo } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import type { GovernanceRole } from "@pansgpt/types";
import { createGovernanceDemo } from "@/lib/governance-demo";
import { GovernanceWorkspace } from "./workspace";
export function GovernancePreview(): React.ReactElement {
  const query = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const requested = query.get("role");
  const role: GovernanceRole =
    requested === "super_admin" || requested === "standard" || requested === "lecturer"
      ? requested
      : "senior";
  const adapter = useMemo(() => createGovernanceDemo(role), [role]);
  return (
    <>
      <div className="gov-preview-role">
        <label>
          Sample role{" "}
          <select
            aria-label="Sample role"
            value={role}
            onChange={(event) => router.push(`/admin-preview?role=${event.target.value}`)}
          >
            <option value="senior">Senior administrator</option>
            <option value="standard">Standard administrator</option>
            <option value="super_admin">Platform administrator</option>
            <option value="lecturer">Lecturer</option>
          </select>
        </label>
      </div>
      <GovernanceWorkspace
        key={role}
        adapter={adapter}
        demo
        section={path.split("/")[2] || "overview"}
      />
    </>
  );
}
