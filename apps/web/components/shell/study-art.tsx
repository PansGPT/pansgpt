export function StudyArt({
  kind,
  variant = "square",
}: {
  kind: "renal" | "case" | "recall" | "notes" | "document" | "pills" | "calculations" | "books";
  variant?: "square" | "banner";
}): React.ReactElement {
  const isBanner = variant === "banner";
  const viewBox = isBanner ? "0 0 320 120" : "0 0 120 120";
  const transform = isBanner ? "translate(100, 0)" : undefined;

  return (
    <svg viewBox={viewBox} className="dashboard-study-art" aria-hidden="true" focusable="false">
      <g
        transform={transform}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {kind === "pills" ? (
          <>
            {/* Ground shadow & grass tuft */}
            <ellipse
              cx="60"
              cy="112"
              rx="34"
              ry="3.5"
              fill="currentColor"
              fillOpacity=".12"
              stroke="none"
            />
            <path d="M52 110l-3-8m9 8l-1-10m8 10l3-7m-10 7l5-9" strokeWidth="1.8" />
            {/* Center post */}
            <rect
              x="57"
              y="10"
              width="6"
              height="100"
              rx="1.5"
              fill="currentColor"
              fillOpacity=".15"
            />
            {/* Conical finial at top */}
            <path d="M60 2l-4 8h8z" fill="currentColor" fillOpacity=".3" />
            <circle cx="60" cy="10" r="3.5" fill="currentColor" fillOpacity=".3" />
            {/* Sign 1: Industry (right arrow) */}
            <path d="M60 18h36l7 6.5-7 6.5H60z" fill="currentColor" fillOpacity=".1" />
            <text
              x="64"
              y="27.5"
              fill="currentColor"
              stroke="none"
              fontSize="6.5"
              fontWeight="700"
              letterSpacing="0.2"
            >
              INDUSTRY
            </text>
            {/* Sign 2: Research (left arrow) */}
            <path d="M60 33H22l-7 6.5 7 6.5h38z" fill="currentColor" fillOpacity=".1" />
            <text
              x="18"
              y="42.5"
              fill="currentColor"
              stroke="none"
              fontSize="6.5"
              fontWeight="700"
              letterSpacing="0.2"
            >
              RESEARCH
            </text>
            {/* Sign 3: Clinical (right arrow) */}
            <path d="M60 48h34l7 6.5-7 6.5H60z" fill="currentColor" fillOpacity=".1" />
            <text
              x="64"
              y="57.5"
              fill="currentColor"
              stroke="none"
              fontSize="6.5"
              fontWeight="700"
              letterSpacing="0.2"
            >
              CLINICAL
            </text>
            {/* Sign 4: Eurlic (left arrow) */}
            <path d="M60 63H26l-7 6.5 7 6.5h34z" fill="currentColor" fillOpacity=".1" />
            <text
              x="22"
              y="72.5"
              fill="currentColor"
              stroke="none"
              fontSize="6.5"
              fontWeight="700"
              letterSpacing="0.2"
            >
              EURLIC
            </text>
            {/* Sign 5: Public Health (right block) */}
            <rect
              x="60"
              y="78"
              width="38"
              height="15"
              rx="2"
              fill="currentColor"
              fillOpacity=".1"
            />
            <text
              x="64"
              y="85"
              fill="currentColor"
              stroke="none"
              fontSize="5.5"
              fontWeight="700"
              letterSpacing="0.2"
            >
              PUBLIC
            </text>
            <text
              x="64"
              y="91"
              fill="currentColor"
              stroke="none"
              fontSize="5.5"
              fontWeight="700"
              letterSpacing="0.2"
            >
              HEALTH
            </text>
          </>
        ) : kind === "calculations" ? (
          <>
            {/* Target with concentric rings */}
            <circle cx="40" cy="62" r="30" fill="currentColor" fillOpacity=".04" />
            <circle cx="40" cy="62" r="21" fill="currentColor" fillOpacity=".06" />
            <circle cx="40" cy="62" r="12" fill="currentColor" fillOpacity=".1" />
            <circle cx="40" cy="62" r="4" fill="currentColor" fillOpacity=".3" />
            {/* Arrow into bullseye */}
            <path d="M70 32L42 60" strokeWidth="2.2" />
            <path d="M70 32l-3-6m3 6l6 3" strokeWidth="1.8" />
            {/* Clipboard checklist */}
            <rect
              x="64"
              y="36"
              width="46"
              height="62"
              rx="4"
              fill="currentColor"
              fillOpacity=".06"
            />
            <rect x="78" y="32" width="18" height="8" rx="2" fill="currentColor" fillOpacity=".2" />
            {/* Checkbox 1 */}
            <rect x="70" y="46" width="6" height="6" rx="1.5" />
            <path d="M71 49l1.5 1.5 2.5-2.5" strokeWidth="1.5" />
            <line x1="80" y1="49" x2="102" y2="49" />
            {/* Checkbox 2 */}
            <rect x="70" y="58" width="6" height="6" rx="1.5" />
            <path d="M71 61l1.5 1.5 2.5-2.5" strokeWidth="1.5" />
            <line x1="80" y1="61" x2="100" y2="61" />
            {/* Checkbox 3 */}
            <rect x="70" y="70" width="6" height="6" rx="1.5" />
            <path d="M71 73l1.5 1.5 2.5-2.5" strokeWidth="1.5" />
            <line x1="80" y1="73" x2="103" y2="73" />
            {/* Checkbox 4 */}
            <rect x="70" y="82" width="6" height="6" rx="1.5" />
            <path d="M71 85l1.5 1.5 2.5-2.5" strokeWidth="1.5" />
            <line x1="80" y1="85" x2="98" y2="85" />
          </>
        ) : kind === "document" ? (
          <>
            {/* Resume paper */}
            <rect
              x="24"
              y="16"
              width="60"
              height="86"
              rx="4"
              fill="currentColor"
              fillOpacity=".05"
            />
            {/* Profile photo box */}
            <rect
              x="31"
              y="24"
              width="18"
              height="18"
              rx="2.5"
              fill="currentColor"
              fillOpacity=".1"
            />
            <circle cx="40" cy="30" r="3.5" fill="currentColor" fillOpacity=".4" />
            <path d="M34 40c0-3 3-4 6-4s6 1 6 4" fill="currentColor" fillOpacity=".4" />
            {/* Header lines */}
            <line x1="54" y1="28" x2="76" y2="28" strokeWidth="2.2" />
            <line x1="54" y1="34" x2="70" y2="34" strokeWidth="1.4" />
            <line x1="54" y1="39" x2="66" y2="39" strokeWidth="1.4" />
            {/* Section divider */}
            <line x1="31" y1="48" x2="76" y2="48" strokeWidth="1.2" />
            {/* Resume text lines */}
            <line x1="31" y1="56" x2="70" y2="56" />
            <line x1="31" y1="63" x2="64" y2="63" />
            <line x1="31" y1="70" x2="68" y2="70" />
            <line x1="31" y1="77" x2="60" y2="77" />
            <line x1="31" y1="84" x2="66" y2="84" />
            <line x1="31" y1="91" x2="56" y2="91" />
            {/* Magnifying Glass */}
            <circle cx="78" cy="74" r="16" fill="currentColor" fillOpacity=".1" strokeWidth="2" />
            <path d="M70 66a12 12 0 0 1 12 0" strokeWidth="1.2" />
            <line x1="89" y1="85" x2="105" y2="101" strokeWidth="3.5" />
          </>
        ) : kind === "recall" || kind === "books" ? (
          <>
            {/* Bottom book */}
            <rect
              x="22"
              y="90"
              width="76"
              height="16"
              rx="3"
              fill="currentColor"
              fillOpacity=".1"
            />
            <line x1="30" y1="90" x2="30" y2="106" />
            <line x1="35" y1="98" x2="88" y2="98" />
            {/* Top book */}
            <rect
              x="28"
              y="74"
              width="64"
              height="16"
              rx="3"
              fill="currentColor"
              fillOpacity=".08"
            />
            <line x1="36" y1="74" x2="36" y2="90" />
            {/* Bookmark ribbon */}
            <path
              d="M78 78v16l3-2 3 2v-16z"
              fill="currentColor"
              fillOpacity=".25"
              strokeWidth="1.2"
            />
            {/* Planter pot */}
            <path d="M48 54h24l-3 20H51z" fill="currentColor" fillOpacity=".12" />
            <line x1="46" y1="54" x2="74" y2="54" strokeWidth="2" />
            {/* Plant stems and leaves */}
            <path d="M60 54c0-14 3-24 5-32" strokeWidth="2" />
            {/* Top leaf */}
            <path d="M65 22c4-7 12-7 14 0-4 7-12 7-14 0z" fill="currentColor" fillOpacity=".2" />
            {/* Left upper leaf */}
            <path d="M62 30c-7-3-12 2-11 8 6 3 11-2 11-8z" fill="currentColor" fillOpacity=".2" />
            {/* Right middle leaf */}
            <path d="M64 38c7-3 12 2 11 8-6 3-11-2-11-8z" fill="currentColor" fillOpacity=".2" />
            {/* Left lower leaf */}
            <path d="M61 46c-6-2-10 2-9 7 5 3 9-2 9-7z" fill="currentColor" fillOpacity=".2" />
          </>
        ) : kind === "case" ? (
          <>
            {/* Medical clipboard / Chart */}
            <rect
              x="26"
              y="16"
              width="56"
              height="86"
              rx="4"
              fill="currentColor"
              fillOpacity=".06"
            />
            <rect
              x="42"
              y="10"
              width="24"
              height="10"
              rx="2"
              fill="currentColor"
              fillOpacity=".2"
            />
            {/* Cross emblem */}
            <path d="M54 26v8m-4-4h8" strokeWidth="2" />
            {/* Header line */}
            <line x1="34" y1="38" x2="72" y2="38" strokeWidth="1.8" />
            {/* ECG pulse line */}
            <path d="M34 48h8l2-5 3 10 3-8 2 3h20" strokeWidth="1.8" />
            {/* Clinical checklist lines */}
            <line x1="34" y1="58" x2="68" y2="58" />
            <line x1="34" y1="66" x2="62" y2="66" />
            <line x1="34" y1="74" x2="66" y2="74" />
            <line x1="34" y1="82" x2="58" y2="82" />
            <line x1="34" y1="90" x2="64" y2="90" />
            {/* Stethoscope */}
            <path d="M84 34v26c0 14-8 22-18 22s-14-6-14-16v-8" strokeWidth="2" />
            <circle cx="84" cy="30" r="7" fill="currentColor" fillOpacity=".15" strokeWidth="2" />
            <circle cx="84" cy="30" r="2.5" fill="currentColor" stroke="none" />
            <path d="M52 68c-6 4-12 10-12 18m6-14l-6 6" strokeWidth="1.8" />
          </>
        ) : kind === "notes" ? (
          <>
            {/* Open notebook */}
            <rect
              x="24"
              y="16"
              width="68"
              height="88"
              rx="4"
              fill="currentColor"
              fillOpacity=".06"
            />
            {/* Spiral ring binder coils */}
            <circle
              cx="30"
              cy="26"
              r="2.5"
              fill="currentColor"
              fillOpacity=".2"
              strokeWidth="1.4"
            />
            <circle
              cx="30"
              cy="38"
              r="2.5"
              fill="currentColor"
              fillOpacity=".2"
              strokeWidth="1.4"
            />
            <circle
              cx="30"
              cy="50"
              r="2.5"
              fill="currentColor"
              fillOpacity=".2"
              strokeWidth="1.4"
            />
            <circle
              cx="30"
              cy="62"
              r="2.5"
              fill="currentColor"
              fillOpacity=".2"
              strokeWidth="1.4"
            />
            <circle
              cx="30"
              cy="74"
              r="2.5"
              fill="currentColor"
              fillOpacity=".2"
              strokeWidth="1.4"
            />
            <circle
              cx="30"
              cy="86"
              r="2.5"
              fill="currentColor"
              fillOpacity=".2"
              strokeWidth="1.4"
            />
            {/* Highlighted header */}
            <rect
              x="38"
              y="24"
              width="44"
              height="10"
              rx="2"
              fill="currentColor"
              fillOpacity=".18"
              stroke="none"
            />
            <line x1="42" y1="29" x2="78" y2="29" strokeWidth="1.8" />
            {/* Notes with bullet points */}
            <circle cx="41" cy="44" r="1.5" fill="currentColor" stroke="none" />
            <line x1="46" y1="44" x2="84" y2="44" />
            <circle cx="41" cy="54" r="1.5" fill="currentColor" stroke="none" />
            <line x1="46" y1="54" x2="78" y2="54" />
            <circle cx="41" cy="64" r="1.5" fill="currentColor" stroke="none" />
            <line x1="46" y1="64" x2="82" y2="64" />
            <circle cx="41" cy="74" r="1.5" fill="currentColor" stroke="none" />
            <line x1="46" y1="74" x2="74" y2="74" />
            <circle cx="41" cy="84" r="1.5" fill="currentColor" stroke="none" />
            <line x1="46" y1="84" x2="80" y2="84" />
            {/* Highlighter pen */}
            <path
              d="M84 76l14-26 5 2.5-14 26z"
              fill="currentColor"
              fillOpacity=".12"
              strokeWidth="1.6"
            />
            <path
              d="M84 76l-3 5 4.5 2 2.5-5z"
              fill="currentColor"
              fillOpacity=".3"
              strokeWidth="1.4"
            />
          </>
        ) : (
          <>
            {/* Default renal or general monograph */}
            <rect
              x="28"
              y="18"
              width="64"
              height="84"
              rx="4"
              fill="currentColor"
              fillOpacity=".08"
            />
            <path d="M38 32h44m-44 14h44m-44 14h36m-36 14h40m-44 14h28" />
          </>
        )}
      </g>
    </svg>
  );
}
