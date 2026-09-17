import { useChat } from "../../context/ChatContext";
import type { InterruptPayload, OrderOption, TicketPreview } from "../../types/chat";

export function InterruptPanel({ interrupt }: { interrupt: InterruptPayload }) {
  const { resumeWithOrder, resumeWithConfirm, isGenerating } = useChat();

  if (interrupt.kind === "confirm_ticket") {
    const preview = (interrupt.preview ?? {}) as TicketPreview;
    return (
      <div className="interrupt-panel">
        <p>请确认是否提交工单：</p>
        <div className="ticket-preview">
          <div>类型：{String(preview.ticket_type ?? "-")}</div>
          <div>描述：{String(preview.description ?? "-")}</div>
        </div>
        <div className="action-bar">
          <button
            type="button"
            className="primary-button"
            disabled={isGenerating}
            onClick={() => void resumeWithConfirm(true)}
          >
            确认提交
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={isGenerating}
            onClick={() => void resumeWithConfirm(false)}
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  const orders: OrderOption[] =
    "orders" in interrupt && Array.isArray(interrupt.orders)
      ? (interrupt.orders as OrderOption[])
      : [];
  return (
    <div className="interrupt-panel">
      <p>请选择要查询的订单：</p>
      <div className="order-cards">
        {orders.map((order) => (
          <button
            key={order.order_id}
            type="button"
            className="order-card"
            disabled={isGenerating}
            onClick={() => void resumeWithOrder(order.order_id)}
          >
            <strong>订单 {order.order_id}</strong>
            <span>{String(order.status || order.summary || "点击选择")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
