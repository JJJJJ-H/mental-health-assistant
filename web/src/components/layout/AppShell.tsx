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
            <p className="eyebrow">MewHelp Agent</p>
            <h1>智能客服</h1>
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
          演示系统仅供课程与工程实践，订单/退款结果为测试数据，不构成真实业务承诺。
        </footer>
      </main>
    </div>
  );
}
