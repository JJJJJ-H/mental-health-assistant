import { Children, cloneElement, isValidElement, type ReactNode } from "react";
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

function renderCitations(children: ReactNode, onCitationClick: (index: number) => void): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return splitCitations(child, onCitationClick);
    }
    if (!isValidElement<{ children?: ReactNode }>(child) || child.props.children === undefined) {
      return child;
    }
    return cloneElement(child, {
      children: renderCitations(child.props.children, onCitationClick)
    });
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
        p: ({ children }) => <p>{renderCitations(children, onCitationClick)}</p>,
        li: ({ children }) => <li>{renderCitations(children, onCitationClick)}</li>
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
