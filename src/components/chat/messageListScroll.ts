import type { ChatMessage } from "../../types/chat";

const BOTTOM_FOLLOW_THRESHOLD_PX = 96;

export function isNearListBottom({
  clientHeight,
  scrollHeight,
  scrollTop
}: {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}): boolean {
  return scrollHeight - scrollTop - clientHeight < BOTTOM_FOLLOW_THRESHOLD_PX;
}

export function findFirstChangedMessageIndex(
  previous: ChatMessage[],
  current: ChatMessage[]
): number | undefined {
  const sharedLength = Math.min(previous.length, current.length);
  for (let index = 0; index < sharedLength; index += 1) {
    if (previous[index] !== current[index]) {
      return index;
    }
  }

  return previous.length === current.length ? undefined : sharedLength;
}
