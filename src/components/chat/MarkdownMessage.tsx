import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.css";

function splitCitations(text: string, onCitationClick: (index: number) => void) {
  return text.split(/(\[\d+\])/g).map((part, index) => {
    const match = part.match(/^\[(\d+)]$/);
    if (!match) return part;
    const citation = Number(match[1]);
    return (
      <button
        className="citation-marker"
        key={`${part}-${index}`}
        onClick={() => onCitationClick(citation)}
      >
        {part}
      </button>
    );
  });
}

export function MarkdownMessage({
  content,
  onCitationClick
}: {
  content: string;
  onCitationClick: (index: number) => void;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        p: ({ children }) => (
          <p>{typeof children === "string" ? splitCitations(children, onCitationClick) : children}</p>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
