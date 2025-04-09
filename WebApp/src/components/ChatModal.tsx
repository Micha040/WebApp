import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { Modal } from "./Modal";

type Message = {
  id: string;
  username: string;
  content: string;
  created_at: string;
};

type ChatModalProps = {
  lobbyId: string;
  username: string;
  onClose: () => void;
};

export default function ChatModal({ lobbyId, username, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/messages/${lobbyId}`); 
    const data = await res.json();
    setMessages(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await fetch(`${import.meta.env.VITE_API_URL}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lobbyId, username, content: newMessage }),
    });

    setNewMessage("");
    fetchMessages(); // ⬅Manuell neu laden nach dem Senden
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  useEffect(() => {
    fetchMessages();
  
    const channel = supabase
      .channel("chat-" + lobbyId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);
  

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Modal title="💬 Lobby-Chat" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "400px", width: "100%", maxWidth: "500px" }}>
        <div style={{ flex: 1, overflowY: "auto", background: "#2c2c2c", padding: "1rem", borderRadius: "8px" }}>
          {messages.map((msg) => {
            const isOwn = msg.username === username;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isOwn ? 'flex-end' : 'flex-start',
                  marginBottom: '0.5rem',
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '0.5rem 1rem',
                    borderRadius: '1rem',
                    backgroundColor: isOwn ? '#4a90e2' : '#333',
                    color: '#fff',
                    textAlign: isOwn ? 'right' : 'left',
                  }}
                >
                    <div style={{ fontSize: '0.8rem', color: isOwn ? '#ddd' : '#aaa', marginBottom: '2px' }}>
                     {isOwn ? `${username} (Du)` : msg.username}
                    </div>

                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <input
          type="text"
          placeholder="Nachricht eingeben..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            padding: "0.5rem",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#1e1e1e",
            color: "#fff",
          }}
        />
      </div>
    </Modal>
  );
}
