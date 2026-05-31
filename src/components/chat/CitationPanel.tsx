import { useEffect, useState } from "react";
import type { CitationSource } from "../../types/chat";

export function CitationPanel({
  sources,
  highlightedCitation,
  onSizeChange
}: {
  sources: CitationSource[];
  highlightedCitation?: number;
  onSizeChange?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (highlightedCitation !== undefined) setExpanded(true);
  }, [highlightedCitation]);

  useEffect(() => {
    onSizeChange?.();
  }, [expanded, onSizeChange]);

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
              <span>
                {source.source} · 相关度 {Math.round(source.score * 100)}%
              </span>
              <p>{source.excerpt}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
