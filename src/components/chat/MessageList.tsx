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
    listRef.current?.scrollToRow(messages.length - 1);
  }, [messages]);

  const rowRenderer = ({ index, key, style }: ListRowProps) => (
    <div key={key} style={style}>
      <MessageRow message={messages[index]!} />
    </div>
  );

  return (
    <div className="message-list" aria-label="对话消息">
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            rowCount={messages.length}
            rowHeight={220}
            rowRenderer={rowRenderer}
            overscanRowCount={3}
            scrollToAlignment="end"
          />
        )}
      </AutoSizer>
    </div>
  );
}
