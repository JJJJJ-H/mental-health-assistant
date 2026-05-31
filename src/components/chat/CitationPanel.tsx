import { useState } from "react";
import type { CitationSource } from "../../types/chat";

export function CitationPanel({
  sources,
  highlightedCitation
}: {
  sources: CitationSource[];
  highlightedCitation?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="citation-panel">
      <button className="citation-toggle" onClick={() => setExpanded((current) => !current)}>
        参考来源（{sources.length}） <span>{expanded ? "收起" : "展开"}</span>
      </button>
      {expanded && (
        <div className="citation-list">
          {sources.map((source) => (
            <article
              className={`citation-card ${
                source.index === highlightedCitation ? "highlighted" : ""
              }`}
              key={source.id}
            >
              <strong>
                [{source.index}] {source.title}
              </strong>
              <span>{source.source}</span>
              <p>{source.excerpt}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
