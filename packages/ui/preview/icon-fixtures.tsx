import { useState } from "react";
import { FigmaIcon, figmaIconNames, figmaIcons } from "../src";

const pageSize = 48;

export function IconFixtures(): React.ReactElement {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const filtered = figmaIconNames.filter((name) =>
    `${name} ${figmaIcons[name].nodeId}`.toLowerCase().includes(query.toLowerCase().trim())
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  return (
    <section className="preview-section icon-library" aria-labelledby="icon-library-title">
      <h2 id="icon-library-title">Original icon library</h2>
      <p>1,173 original masters. Source colors and intrinsic dimensions are preserved.</p>
      <label>
        Search icons{" "}
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
      </label>
      <p role="status">{filtered.length} icons found</p>
      <div className="icon-library-grid">
        {filtered.slice(current * pageSize, (current + 1) * pageSize).map((name) => (
          <figure key={name} data-icon-name={name}>
            <div className="icon-source-canvas">
              <FigmaIcon name={name} label={name} />
            </div>
            <figcaption>
              {name}
              <br />
              <a
                href={`https://www.figma.com/design/upwm9MZsrE4V0XAIj3wWAw/PansGPT?node-id=${figmaIcons[name].nodeId.replace(":", "-")}`}
              >
                Source {figmaIcons[name].nodeId}
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
      {filtered.length === 0 && <p>No matching icons.</p>}
      <nav aria-label="Icon library pages">
        <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>
          Previous icons
        </button>
        <span>
          Page {current + 1} of {pages}
        </span>
        <button type="button" disabled={current + 1 === pages} onClick={() => setPage(current + 1)}>
          Next icons
        </button>
      </nav>
    </section>
  );
}
