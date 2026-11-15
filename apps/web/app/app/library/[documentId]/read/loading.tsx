import { Loader2 } from "lucide-react";
import "@/components/reader/reader.css";

export default function ReaderLoading(): React.ReactElement {
  return (
    <div className="reader-route">
      <div className="reader-empty" role="status">
        <Loader2 size={24} />
        <p>Opening your document…</p>
      </div>
    </div>
  );
}
