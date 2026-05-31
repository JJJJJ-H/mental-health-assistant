import { Composer } from "../chat/Composer";
import { MessageList } from "../chat/MessageList";
import { WelcomePanel } from "../chat/WelcomePanel";
import { Sidebar } from "../sidebar/Sidebar";
import { useChat } from "../../context/ChatContext";

export function AppShell() {
  const { activeConversation, createConversation, toggleSidebar } = useChat();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="chat-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={toggleSidebar} aria-label="打开菜单">
            ☰
          </button>
          <div>
            <p className="eyebrow">Mental Health Agent</p>
            <h1>心理健康小助手</h1>
          </div>
          <button className="secondary-button" onClick={createConversation}>
            新建对话
          </button>
        </header>

        <section className="chat-content">
          {activeConversation?.messages.length ? <MessageList /> : <WelcomePanel />}
        </section>

        <Composer />
        <footer className="disclaimer">
          内容仅用于心理健康科普，不能替代专业诊断或治疗。若存在紧急安全风险，请立即联系当地急救服务或可信赖的专业机构。
        </footer>
      </main>
    </div>
  );
}
