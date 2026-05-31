import { useChat } from "../../context/ChatContext";

const suggestions = [
  "最近总是睡不好，可以怎样调整作息？",
  "压力很大时，有哪些温和的缓解方式？",
  "焦虑情绪出现时，我可以先做什么？",
  "什么时候应该考虑寻求专业帮助？"
];

export function WelcomePanel() {
  const { sendMessage } = useChat();

  return (
    <div className="welcome-panel">
      <p className="eyebrow">温和、清晰、有边界</p>
      <h2>从一个具体的小问题开始</h2>
      <p className="muted">
        我会结合内置心理健康科普资料回答，并在适用时标注来源。这里不是诊断工具。
      </p>
      <div className="suggestion-grid">
        {suggestions.map((suggestion) => (
          <button key={suggestion} onClick={() => void sendMessage(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
