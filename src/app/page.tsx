"use client";

import { useState, useRef, useEffect } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { Button, Form, Spinner } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loginRequest } from "./authConfig";
import styles from "./page.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;

    const userMessage: Message = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const tokenResponse = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });

      const res = await fetch("/api/ClaudeAgent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
        body: JSON.stringify({ Prompt: prompt }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply},
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `${data.error.appCustomCode}: ${data.error.detail}` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Failed to reach the server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {isAuthenticated ? (
          <div className={styles.chatContainer}>
            <div className={styles.chatMessages}>
              {messages.length === 0 && (
                <p className={styles.emptyState}>
                  Start a conversation with the AI Agent.
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={
                    msg.role === "user"
                      ? styles.userMessage
                      : styles.assistantMessage
                  }
                >
                  <div className={styles.messageBubble}>
                    <strong>{msg.role === "user" ? "You" : "Agent"}</strong>
                    {msg.role === "assistant" ? (
                      <div className={styles.markdownContent}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className={styles.assistantMessage}>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className={styles.chatInput}>
              <Form.Control
                as="textarea"
                rows={1}
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <Button
                variant="primary"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        ) : (
          <p>Please sign in to continue.</p>
        )}
      </main>
    </div>
  );
}
