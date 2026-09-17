import { useState, type KeyboardEvent } from "react";
import { useChat } from "../../context/ChatContext";

export function Composer() {
  const [input, setInput] = useState("");
  const { isGenerating, sendMessage, stopGeneration } = useChat();

  const submit = () => {
    const value = input.trim();
    if (!value) return;
    setInput("");
    void sendMessage(value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          id="message"
          name="message"
          className="monitor-block"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题，Enter 发送，Shift + Enter 换行"
          aria-label="消息输入框"
          rows={2}
        />
        {isGenerating ? (
          <button className="stop-button" onClick={stopGeneration}>
            停止
          </button>
        ) : (
          <button className="primary-button" onClick={submit}>
            发送
          </button>
        )}
      </div>
    </div>
  );
}
