import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { CitationPanel } from "../src/components/chat/CitationPanel";
import { MarkdownMessage } from "../src/components/chat/MarkdownMessage";
import { MessageRow } from "../src/components/chat/MessageRow";

describe("App", () => {
  it("renders the guest welcome experience", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "心理健康小助手" })).toBeInTheDocument();
    expect(screen.getByText("从一个具体的小问题开始")).toBeInTheDocument();
    expect(screen.getByLabelText("消息输入框")).toHaveAttribute("name", "message");
    expect(screen.getByLabelText("搜索历史对话")).toHaveAttribute("name", "conversation-search");
    expect(screen.getByRole("combobox", { name: "主题" })).toHaveAttribute("name", "theme");
  });
});

describe("citations", () => {
  it("reports citation marker clicks", () => {
    const onCitationClick = vi.fn();
    render(<MarkdownMessage content="可以先固定作息。[1]" onCitationClick={onCitationClick} />);

    fireEvent.click(screen.getByRole("button", { name: "[1]" }));
    expect(onCitationClick).toHaveBeenCalledWith(1);
  });

  it("reports citation clicks inside formatted markdown", () => {
    const onCitationClick = vi.fn();
    render(<MarkdownMessage content="**固定作息。[1]**" onCitationClick={onCitationClick} />);

    fireEvent.click(screen.getByRole("button", { name: "[1]" }));
    expect(onCitationClick).toHaveBeenCalledWith(1);
  });

  it("expands the matching source card", async () => {
    render(
      <CitationPanel
        highlightedCitation={1}
        sources={[
          {
            id: "sleep-hygiene-1",
            documentId: "sleep-hygiene",
            index: 1,
            title: "睡眠卫生与日常调整",
            source: "内置心理健康科普知识库",
            excerpt: "固定起床时间有助于建立节律。",
            score: 0.8
          }
        ]}
      />
    );

    expect(await screen.findByText("固定起床时间有助于建立节律。")).toBeInTheDocument();
    expect(screen.getByText(/相关度 80%/)).toBeInTheDocument();
  });

  it("opens and highlights a source when an inline marker is clicked", async () => {
    render(
      <MessageRow
        message={{
          id: "assistant-1",
          role: "assistant",
          createdAt: new Date().toISOString(),
          content: "可以先固定作息。[1]",
          status: "complete",
          sources: [
            {
              id: "sleep-hygiene-1",
              documentId: "sleep-hygiene",
              index: 1,
              title: "睡眠卫生与日常调整",
              source: "内置心理健康科普知识库",
              excerpt: "固定起床时间有助于建立节律。",
              score: 0.8
            }
          ]
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "[1]" }));
    expect(await screen.findByText("固定起床时间有助于建立节律。")).toBeInTheDocument();
  });
});
