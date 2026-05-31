import { useEffect, useMemo, useRef } from "react";
import { AutoSizer, List, type ListRowProps } from "react-virtualized";
import { useChat } from "../../context/ChatContext";
import { MessageRow } from "./MessageRow";

export function MessageList() {
  const { activeConversation } = useChat();
  const messages = useMemo(
    () => activeConversation?.messages ?? [],
    [activeConversation?.messages]
  );
  const listRef = useRef<List>(null);

  useEffect(() => {
    listRef.current?.recomputeRowHeights();
    listRef.current?.scrollToRow(messages.length - 1);
  }, [messages]);

  const rowRenderer = ({ index, key, style }: ListRowProps) => (
    <div key={key} style={style}>
      <MessageRow message={messages[index]!} />
    </div>
  );

  const rowHeight = ({ index }: { index: number }) => {
    const message = messages[index];
    if (!message) return 160;
    const textRows = Math.max(1, Math.ceil(message.content.length / 48));
    const sourceRows = message.sources?.length ?? 0;
    return Math.max(160, 108 + textRows * 28 + sourceRows * 132);
  };

  return (
    <div className="message-list" aria-label="对话消息">
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            rowCount={messages.length}
            rowHeight={rowHeight}
            rowRenderer={rowRenderer}
            overscanRowCount={3}
            scrollToAlignment="end"
          />
        )}
      </AutoSizer>
    </div>
  );
}
