import type { ChatMessage, PromptPayload, RetrievedSource } from "../types";

const BASE_PROMPT = `你是“心理健康小助手”，面向用户提供谨慎、清晰的心理健康科普信息。
你的回答只能作为教育参考，不能替代专业诊断、心理咨询或医疗治疗。
不要对用户下诊断，不要擅自推荐药物剂量，不要夸大确定性。
如果资料不足，请坦诚说明局限，并建议用户在需要时寻求合格专业人士帮助。`;

const NO_SOURCE_GUIDANCE =
  "当前没有足够相关的知识库资料。回答时应明确说明这一点，并仅提供一般性、保守的科普信息。";

const CRISIS_GUIDANCE =
  "用户表达可能涉及紧急安全风险。请优先提醒：如有伤害自己或他人的想法、计划或行为，应立即联系当地急救服务、前往附近医疗机构急诊，或请可信赖的亲友陪伴并协助联系专业机构。不要仅依赖聊天工具。";

export function buildPrompt(
  messages: ChatMessage[],
  sources: RetrievedSource[],
  crisisRisk: boolean
): PromptPayload {
  const sourceSection =
    sources.length > 0
      ? sources
          .map(
            (item) =>
              `[${item.index}] ${item.title}（${item.source}）\n${item.excerpt}`
          )
          .join("\n\n")
      : NO_SOURCE_GUIDANCE;

  const citationInstruction =
    sources.length > 0
      ? "引用知识库内容时，请在对应句末使用 [1]、[2] 这样的编号标注来源。"
      : "不要伪造引用编号。";

  const system = [
    BASE_PROMPT,
    citationInstruction,
    "## 参考资料",
    sourceSection,
    crisisRisk ? `## 紧急安全提示\n${CRISIS_GUIDANCE}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, messages, sources };
}
