import { useChat } from "../../context/ChatContext";

const suggestions = [
  "订单 1001 的物流到哪了",
  "七天无理由退货怎么操作？",
  "运费险怎么理赔？",
  "我想申请退款"
];

export function WelcomePanel() {
  const { sendMessage } = useChat();

  return (
    <div className="welcome-panel">
      <p className="eyebrow">查物流 · 答政策 · 退款工单</p>
      <h2>有什么可以帮您？</h2>
      <p className="muted">电商智能客服，支持订单物流查询、FAQ 检索引用，以及退款/工单流程。</p>
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
