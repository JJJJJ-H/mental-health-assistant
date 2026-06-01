import { useEffect, useMemo, useRef } from "react";
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
import {
  findFirstChangedMessageIndex,
  isNearListBottom
} from "./messageListScroll";

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
  const previousMessagesRef = useRef(messages);
  const previousConversationIdRef = useRef(activeConversation?.id);
  const shouldFollowOutputRef = useRef(true);

  useEffect(() => {
    const previousMessages = previousMessagesRef.current;
    const conversationChanged =
      previousConversationIdRef.current !== activeConversation?.id;
    const firstChangedIndex = conversationChanged
      ? 0
      : findFirstChangedMessageIndex(previousMessages, messages);

    previousMessagesRef.current = messages;
    previousConversationIdRef.current = activeConversation?.id;

    if (conversationChanged || messages.length > previousMessages.length) {
      shouldFollowOutputRef.current = true;
    }
    if (firstChangedIndex === undefined) return;

    const lastPossiblyStaleIndex = Math.max(
      previousMessages.length,
      messages.length
    );
    for (let index = firstChangedIndex; index < lastPossiblyStaleIndex; index += 1) {
      cacheRef.current.clear(index, 0);
    }
    listRef.current?.recomputeRowHeights(firstChangedIndex);

    if (!shouldFollowOutputRef.current || messages.length === 0) return;
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToRow(messages.length - 1);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeConversation?.id, messages]);

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
    shouldFollowOutputRef.current = isNearListBottom({
      clientHeight,
      scrollHeight,
      scrollTop
    });
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
