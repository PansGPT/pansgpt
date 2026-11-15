import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Maximize2, Scissors } from "lucide-react";
import "@/components/reader/reader.css";

/**
 * Next.js route-level loading boundary for the PDF reader.
 * Shows the real reader chrome (header + toolbar skeleton) immediately so the
 * user sees a contextual shell instead of the generic grey workspace skeleton.
 */
export default function ReaderLoading(): React.ReactElement {
  return (
    <div className="reader-route">
      <div className="reader-workspace" data-ready="false">
        <header className="reader-header t-panel-slide" data-open="true">
          <span className="reader-back" aria-hidden="true">
            <ArrowLeft size={18} />
          </span>
          <div className="reader-heading">
            <div className="reader-heading-skeleton" aria-hidden="true" />
            <div
              className="reader-heading-skeleton reader-heading-skeleton--sub"
              aria-hidden="true"
            />
          </div>
        </header>
        <div className="reader-body">
          <section className="reader-document-panel" aria-label="Document reader">
            <div className="reader-toolbar t-panel-slide" data-open="true">
              <div className="reader-tool-start">
                <button type="button" disabled aria-label="Snip" title="Snip">
                  <Scissors size={19} />
                  <span>Snip</span>
                </button>
              </div>
              <div className="reader-page-controls">
                <button type="button" disabled aria-label="Previous page">
                  <ChevronLeft size={17} />
                </button>
                <span className="reader-mobile-page-counter" aria-hidden="true">
                  <span>— / —</span>
                </span>
                <button type="button" disabled aria-label="Next page">
                  <ChevronRight size={17} />
                </button>
              </div>
              <div className="reader-tool-end">
                <button type="button" disabled aria-label="Full screen" title="Full screen">
                  <Maximize2 size={18} />
                </button>
              </div>
            </div>
            <div className="reader-canvas-area">
              <div className="reader-empty" role="status">
                <Loader2 size={24} className="animate-spin text-primary-500" />
                <p>Opening your document…</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
