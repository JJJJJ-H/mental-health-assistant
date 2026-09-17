import { useEffect, useMemo, useRef, useState } from "react";
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
  type ListRowProps,
  type OnScrollParams
} from "react-virtualized";
import { useChat } from "../../context/ChatContext";
import { MessageRow } from "./MessageRow";

export function MessageList() {
  const { activeConversation } = useChat();
  const messages = useMemo(
    () => activeConversation?.messages ?? [],
    [activeConversation?.messages]
  );
  const listRef = useRef<List>(null);
  const cacheRef = useRef(
    new CellMeasurerCache({ defaultHeight: 180, fixedWidth: true })
  );
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    cacheRef.current.clearAll();
    listRef.current?.recomputeRowHeights();
    if (isNearBottom) listRef.current?.scrollToRow(messages.length - 1);
  }, [isNearBottom, messages]);

  const rowRenderer = ({ index, key, parent, style }: ListRowProps) => (
    <CellMeasurer
      cache={cacheRef.current}
      columnIndex={0}
      key={key}
      parent={parent}
      rowIndex={index}
    >
      {({ measure, registerChild }) => (
        <div ref={registerChild} style={style}>
          <MessageRow message={messages[index]!} onSizeChange={measure} />
        </div>
      )}
    </CellMeasurer>
  );

  const handleScroll = ({ clientHeight, scrollHeight, scrollTop }: OnScrollParams) => {
    setIsNearBottom(scrollHeight - scrollTop - clientHeight < 96);
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
            deferredMeasurementCache={cacheRef.current}
            rowHeight={cacheRef.current.rowHeight}
            rowRenderer={rowRenderer}
            onScroll={handleScroll}
            overscanRowCount={3}
            scrollToAlignment="end"
          />
        )}
      </AutoSizer>
    </div>
  );
}
