export function StudyArt({
  kind,
}: {
  kind: "renal" | "case" | "recall" | "notes" | "document" | "pills" | "calculations" | "books";
}): React.ReactElement {
  return (
    <svg viewBox="0 0 320 120" className="dashboard-study-art" aria-hidden="true" focusable="false">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {kind === "pills" ? (
          <>
            <g transform="rotate(-28 160 60)">
              <rect
                x="65"
                y="26"
                width="90"
                height="33"
                rx="16"
                fill="currentColor"
                fillOpacity=".15"
              />
              <path d="M110 27v31" />
              <rect x="166" y="65" width="88" height="33" rx="16" />
              <path d="M210 66v31" />
            </g>
            <circle cx="196" cy="30" r="16" fill="currentColor" fillOpacity=".2" />
            <path d="m187 30h18" />
            <circle cx="105" cy="92" r="13" />
            <path d="m96 92h18" />
          </>
        ) : kind === "calculations" ? (
          <>
            <rect
              x="86"
              y="5"
              width="124"
              height="111"
              rx="3"
              fill="currentColor"
              fillOpacity=".06"
            />
            <path d="M102 25h70m-70 17h91m-91 18h49m-49 18h77m-77 18h58m54-2 30-70 8 4-30 70-11 12 3-16Z" />
            <path d="m122 54 10 10m0-10-10 10m31-5h17m-12-8v16" />
          </>
        ) : kind === "books" ? (
          <>
            <rect
              x="64"
              y="18"
              width="183"
              height="24"
              rx="4"
              fill="currentColor"
              fillOpacity=".16"
            />
            <rect x="81" y="49" width="177" height="24" rx="4" />
            <rect
              x="57"
              y="80"
              width="186"
              height="24"
              rx="4"
              fill="currentColor"
              fillOpacity=".12"
            />
            <path d="M83 18v24m15 7v24m-24 7v24m31-76h91m-77 31h103m-108 31h89" />
          </>
        ) : kind === "renal" ? (
          <>
            <path d="M145 24c-10-17-38-10-48 10-12 25-1 64 22 66 18 2 30-14 17-26-9-8-5-15 2-23 10-11 12-20 7-27ZM175 24c10-17 38-10 48 10 12 25 1 64-22 66-18 2-30-14-17-26 9-8 5-15-2-23-10-11-12-20-7-27Z" />
            <path d="M159 15v93m4-93v93m-4-61-29-9m29 14-32 10m36-15 28-9m-28 14 31 10m-55 14 16 12m28-12-16 12" />
          </>
        ) : kind === "case" ? (
          <>
            <rect x="127" y="15" width="66" height="22" rx="4" />
            <path d="M160 37v13M83 50h154M83 50v17m77-17v17m77-17v17" />
            <rect x="54" y="67" width="58" height="21" rx="4" />
            <rect x="131" y="67" width="58" height="21" rx="4" />
            <rect x="208" y="67" width="58" height="21" rx="4" />
            <path d="M83 88v16m77-16v16m77-16v16M140 26h40M65 78h36m42 0h34m43 0h34" />
          </>
        ) : kind === "recall" ? (
          <>
            <rect x="98" y="24" width="129" height="73" rx="5" transform="rotate(12 160 60)" />
            <rect x="89" y="24" width="129" height="73" rx="5" transform="rotate(-8 154 60)" />
            <path d="m144 46 20 20m0-20-20 20m-34 22 28-4m-12-25 5-1m49 15 5-1" />
          </>
        ) : kind === "notes" ? (
          <>
            <rect x="74" y="17" width="172" height="90" rx="7" />
            <path d="M74 36h172m-160-9h2m7 0h2m7 0h2m30 23h90m-90 16h67m-67 16h90m-90 16h48" />
            <rect x="97" y="44" width="11" height="11" rx="2" />
            <rect x="97" y="60" width="11" height="11" rx="2" />
            <rect x="97" y="76" width="11" height="11" rx="2" />
          </>
        ) : (
          <>
            <path d="M80 15h72c12 0 16 6 16 13v73c-12-8-28-9-88-3V15Zm160 0h-72v86c12-8 28-9 72-3V15Z" />
            <path d="M95 33h43m-43 13h51m-51 13h39m-39 13h48m40-39h40m-40 13h43m-43 13h33m-33 13h42" />
          </>
        )}
      </g>
    </svg>
  );
}
