import { useState } from "react";
import { useChat } from "../../context/ChatContext";
import type { SuggestedAction } from "../../types/chat";

export function ActionBar({ actions }: { actions: SuggestedAction[] }) {
  const { transferHuman, submitTicket, submitRefund, resumeWithOrder, isGenerating } = useChat();
  const [ticketOpen, setTicketOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundDraft, setRefundDraft] = useState<{ order_id?: string }>({});
  const [ticketType, setTicketType] = useState<"售后" | "投诉" | "咨询" | "">("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [refundReason, setRefundReason] = useState<
    "七天无理由" | "质量问题" | "发错货" | "不想要了" | "其他" | ""
  >("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="action-wrap">
      <div className="action-bar">
        {actions.map((action, index) => {
          if (action.type === "select_order") {
            return (
              <div className="order-cards" key={`select-${index}`}>
                {(action.orders ?? []).map((order) => (
                  <button
                    key={order.order_id}
                    type="button"
                    className="order-card"
                    disabled={isGenerating || busy}
                    onClick={() => void resumeWithOrder(order.order_id)}
                  >
                    <strong>订单 {order.order_id}</strong>
                    <span>{order.status || order.summary || "点击选择"}</span>
                  </button>
                ))}
              </div>
            );
          }
          if (action.type === "transfer_human") {
            return (
              <button
                key={`transfer-${index}`}
                type="button"
                className="action-btn"
                onClick={transferHuman}
              >
                转人工
              </button>
            );
          }
          if (action.type === "create_ticket") {
            return (
              <button
                key={`ticket-${index}`}
                type="button"
                className="action-btn"
                onClick={() => {
                  setError("");
                  setTicketOpen(true);
                }}
              >
                建工单
              </button>
            );
          }
          if (action.type === "refund_form") {
            return (
              <button
                key={`refund-${index}`}
                type="button"
                className="action-btn"
                onClick={() => {
                  setRefundDraft(action.draft ?? {});
                  setError("");
                  setRefundOpen(true);
                }}
              >
                提交退款工单
              </button>
            );
          }
          return null;
        })}
      </div>

      {ticketOpen && (
        <div className="modal-mask" onClick={() => setTicketOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>创建工单</h3>
            <label>
              类别
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value as typeof ticketType)}
              >
                <option value="">请选择</option>
                <option value="售后">售后</option>
                <option value="投诉">投诉</option>
                <option value="咨询">咨询</option>
              </select>
            </label>
            <label>
              描述
              <textarea
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                rows={4}
              />
            </label>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setTicketOpen(false)}>
                取消
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    if (!ticketType) {
                      setError("请选择反馈类别");
                      return;
                    }
                    if (!ticketDesc.trim()) {
                      setError("请填写反馈描述");
                      return;
                    }
                    setBusy(true);
                    try {
                      await submitTicket(ticketType, ticketDesc.trim());
                      setTicketOpen(false);
                      setTicketDesc("");
                      setTicketType("");
                    } catch {
                      setError("工单创建失败,请稍后重试");
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                提交工单
              </button>
            </div>
          </div>
        </div>
      )}

      {refundOpen && (
        <div className="modal-mask" onClick={() => setRefundOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>提交退款</h3>
            <label>
              订单号
              <input value={refundDraft.order_id ?? ""} readOnly />
            </label>
            <label>
              原因
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value as typeof refundReason)}
              >
                <option value="">请选择</option>
                <option value="七天无理由">七天无理由</option>
                <option value="质量问题">质量问题</option>
                <option value="发错货">发错货</option>
                <option value="不想要了">不想要了</option>
                <option value="其他">其他</option>
              </select>
            </label>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setRefundOpen(false)}>
                取消
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    if (!refundDraft.order_id) {
                      setError("缺少订单号");
                      return;
                    }
                    if (!refundReason) {
                      setError("请选择退款原因");
                      return;
                    }
                    setBusy(true);
                    try {
                      await submitRefund(refundDraft.order_id, refundReason);
                      setRefundOpen(false);
                      setRefundReason("");
                    } catch {
                      setError("退款申请失败,请稍后重试");
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
