import { useChat } from "../../context/ChatContext";

export function Sidebar() {
  const {
    visibleConversations,
    activeConversationId,
    searchQuery,
    theme,
    sidebarCollapsed,
    createConversation,
    selectConversation,
    deleteConversation,
    clearAllConversations,
    setSearchQuery,
    setTheme,
    toggleSidebar
  } = useChat();

  return (
    <aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-header">
        <div>
          <strong>对话记录</strong>
          <span>保存在当前浏览器</span>
        </div>
        <button className="icon-button" aria-label="收起侧栏" onClick={toggleSidebar}>
          ×
        </button>
      </div>
      <button className="primary-button full-width" onClick={createConversation}>
        + 新建对话
      </button>
      <input
        className="search-input"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="搜索历史对话"
        aria-label="搜索历史对话"
      />
      <div className="conversation-list">
        {visibleConversations.length === 0 ? (
          <p className="muted compact">暂无历史记录</p>
        ) : (
          visibleConversations.map((conversation) => (
            <article
              className={`conversation-item ${
                conversation.id === activeConversationId ? "active" : ""
              }`}
              key={conversation.id}
            >
              <button onClick={() => selectConversation(conversation.id)}>
                <strong>{conversation.title}</strong>
                <span>{new Date(conversation.updatedAt).toLocaleDateString()}</span>
              </button>
              <button
                className="delete-button"
                aria-label={`删除 ${conversation.title}`}
                onClick={() => deleteConversation(conversation.id)}
              >
                ×
              </button>
            </article>
          ))
        )}
      </div>
      <div className="sidebar-footer">
        <label>
          主题
          <select value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)}>
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>
        <button
          className="text-button danger"
          onClick={() => {
            if (window.confirm("确定清空全部本地对话吗？")) clearAllConversations();
          }}
        >
          清空全部记录
        </button>
      </div>
    </aside>
  );
}
