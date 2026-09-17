import { ChatProvider } from "./context/ChatContext";
import { AppShell } from "./components/layout/AppShell";
import "./styles/global.css";
import "./styles/app.css";

export default function App() {
  return (
    <ChatProvider>
      <AppShell />
    </ChatProvider>
  );
}
