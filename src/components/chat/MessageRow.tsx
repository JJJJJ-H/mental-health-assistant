import { lazy, Suspense, useState } from "react";
import type { ChatMessage } from "../../types/chat";
import { MarkdownMessage } from "./MarkdownMessage";

const CitationPanel = lazy(() =>
  import("./CitationPanel").then((module) => ({ default: module.CitationPanel }))
);

export function MessageRow({ message }: { message: ChatMessage }) {
  const [highlightedCitation, setHighlightedCitation] = useState<number>();

  return (
    <article className={`message-row ${message.role}`}>
      <div className="avatar">{message.role === "assistant" ? "AI" : "你"}</div>
      <div className="message-bubble">
        {message.warning && <div className="warning-card">{message.warning}</div>}
        <MarkdownMessage
          content={message.content || (message.status === "streaming" ? "正在思考..." : "")}
          onCitationClick={setHighlightedCitation}
        />
        {message.status === "stopped" && <span className="status-chip">已停止生成</span>}
        {message.status === "error" && <span className="status-chip error">回答失败</span>}
        {!!message.sources?.length && (
          <Suspense fallback={<p className="muted compact">正在加载引用...</p>}>
            <CitationPanel
              sources={message.sources}
              highlightedCitation={highlightedCitation}
            />
          </Suspense>
        )}
      </div>
    </article>
  );
}
