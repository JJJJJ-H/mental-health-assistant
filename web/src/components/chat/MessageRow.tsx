import { lazy, Suspense, useState } from "react";
import type { ChatMessage } from "../../types/chat";
import { ActionBar } from "./ActionBar";
import { InterruptPanel } from "./InterruptPanel";
import { MarkdownMessage } from "./MarkdownMessage";

const CitationPanel = lazy(() =>
  import("./CitationPanel").then((module) => ({ default: module.CitationPanel }))
);

export function MessageRow({
  message,
  onSizeChange
}: {
  message: ChatMessage;
  onSizeChange?: () => void;
}) {
  const [highlightedCitation, setHighlightedCitation] = useState<number>();

  return (
    <article className={`message-row ${message.role}`}>
      <div className="avatar">{message.role === "assistant" ? "客" : "你"}</div>
      <div className="message-bubble">
        {!!message.tools?.length && (
          <div className="tool-badges">
            {message.tools.map((tool, index) => (
              <div className="tool-badge" key={`${tool.name}-${index}`}>
                调用了 {tool.name}
              </div>
            ))}
          </div>
        )}
        {message.interrupt ? (
          <InterruptPanel interrupt={message.interrupt} />
        ) : (
          <MarkdownMessage
            content={message.content || (message.status === "streaming" ? "正在思考..." : "")}
            onCitationClick={setHighlightedCitation}
          />
        )}
        {message.status === "stopped" && <span className="status-chip">已停止生成</span>}
        {message.status === "error" && <span className="status-chip error">回答失败</span>}
        {!!message.sources?.length && (
          <Suspense fallback={<p className="muted compact">正在加载引用...</p>}>
            <CitationPanel
              sources={message.sources}
              highlightedCitation={highlightedCitation}
              onSizeChange={onSizeChange}
            />
          </Suspense>
        )}
        {!!message.actions?.length && <ActionBar actions={message.actions} />}
      </div>
    </article>
  );
}
