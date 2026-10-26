import { Skeleton } from "@pansgpt/ui/auth";
import { AuthFrame } from "./frame";
export function AuthLoading(): React.ReactElement {
  return (
    <AuthFrame title="Getting things ready" description="One moment, please.">
      <div role="status" aria-label="Loading" className="auth-loading">
        <Skeleton style={{ height: 44 }} />
        <Skeleton style={{ height: 44 }} />
        <Skeleton style={{ height: 44 }} />
      </div>
    </AuthFrame>
  );
}
