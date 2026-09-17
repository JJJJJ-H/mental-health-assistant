import { useChat } from "../../context/ChatContext";

export function Sidebar() {
  const {
    serverList,
    activeConversation,
    searchQuery,
    theme,
    sidebarCollapsed,
    createConversation,
    selectServerConversation,
    setSearchQuery,
    setTheme,
    toggleSidebar
  } = useChat();

  return (
    <aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-header">
        <div>
          <strong>对话记录</strong>
          <span>服务端会话</span>
        </div>
        <button className="icon-button" aria-label="收起侧栏" onClick={toggleSidebar}>
          ×
        </button>
      </div>
      <button className="primary-button full-width" onClick={createConversation}>
        + 新建对话
      </button>
      <input
        id="conversation-search"
        name="conversation-search"
        className="search-input"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="搜索历史会话"
        aria-label="搜索历史会话"
      />
      <div className="conversation-list">
        {serverList.length === 0 ? (
          <p className="muted compact">暂无历史记录</p>
        ) : (
          serverList.map((item) => (
            <article
              className={`conversation-item ${
                activeConversation?.serverId === item.id ? "active" : ""
              }`}
              key={item.id}
            >
              <button onClick={() => void selectServerConversation(item.id)}>
                <strong>
                  #{item.id}
                  {item.has_summary ? " · 已摘要" : ""}
                </strong>
                <span>{item.preview}</span>
              </button>
            </article>
          ))
        )}
      </div>
      <div className="sidebar-footer">
        <label>
          主题
          <select
            id="theme"
            name="theme"
            value={theme}
            onChange={(event) => setTheme(event.target.value as typeof theme)}
          >
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>
        <a className="text-button" href="http://127.0.0.1:8000/admin" target="_blank" rel="noreferrer">
          打开管理后台
        </a>
        <a
          className="text-button"
          href={import.meta.env.VITE_MONITOR_DASHBOARD_URL ?? "http://localhost:5173"}
          target="_blank"
          rel="noreferrer"
        >
          打开监控看板
        </a>
      </div>
    </aside>
  );
}
