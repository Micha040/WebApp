import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Toast } from '../components/Toast';
import ChatModal from '../components/ChatModal';
import DrawingCanvas from "../components/DrawingCanvas";

type Player = {
  id: string;
  username: string;
  lobby_id: string;
};

type Lobby = {
  id: string;
  name: string;
  host: string;
};

export default function LobbyView({ username }: { username: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [players, setPlayers] = useState<Player[]>([]);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(
    location.state?.successMessage || null
  );
  const [showChat, setShowChat] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchLobby = async () => {
      const res = await fetch(`http://localhost:3000/lobbys/${id}`);
      const data = await res.json();
      setLobby(data);
    };

    const fetchPlayers = async () => {
      const res = await fetch(`http://localhost:3000/lobbys/${id}/players`);
      const data = await res.json();
      setPlayers(data);
    };

    fetchLobby();
    fetchPlayers();

    const playerChannel = supabase
      .channel(`players-in-lobby-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `lobby_id=eq.${id}`,
        },
        fetchPlayers
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
    };
  }, [id]);

  // Chat-Watching für roten Punkt
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`chat-watch-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `lobby_id=eq.${id}`,
        },
        () => {
          if (!showChat) {
            setHasNewMessages(true);
            console.log("🔴 Neue Nachricht (Chat geschlossen)");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, showChat]);

  const handleLeaveLobby = async () => {
    if (!id || !username) return;

    await fetch(`http://localhost:3000/lobby/${id}/leave/${username}`, {
      method: 'DELETE',
    });

    navigate('/');
  };

  if (!lobby) return <p style={{ color: '#fff', padding: '2rem' }}>Lade Lobby...</p>;

  return (
    <div
      style={{
        padding: '2rem',
        paddingBottom: '6rem',
        color: '#fff',
        fontFamily: 'sans-serif',
        minHeight: '100vh',
        backgroundColor: '#121212',
      }}
    >
      <h1>🏷️ Lobby: {lobby.name}</h1>
      <p>👑 Host: <strong>{lobby.host}</strong></p>

      {/* Spielerliste + Zeichenfläche */}
      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem', height: 'calc(100vh - 300px)' }}>
        {/* Spielerliste */}
        <div style={{ width: '300px', flexShrink: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 0 10px rgba(0,0,0,0.4)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #444' }}>
                <th style={thStyle}>🧑 Spielername</th>
                <th style={thStyle}>🎖️ Rolle</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} style={{ borderBottom: '1px solid #333', backgroundColor: player.username === lobby.host ? '#1f1f1f' : 'inherit' }}>
                  <td style={{ ...tdStyle, fontWeight: player.username === lobby.host ? 'bold' : 'normal' }}>
                    {player.username}
                    {player.username === username && ' (Du)'}
                  </td>
                  <td style={tdStyle}>{player.username === lobby.host ? '👑 Host' : '👤 Spieler'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Zeichenfläche */}
        <div style={{ flex: 1, backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '1rem' }}>
          <DrawingCanvas lobbyId={id} username={username} />
        </div>
      </div>

      {/* Chat-Modal */}
      {showChat && id && (
        <ChatModal
          lobbyId={id}
          username={username}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Footer */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #333',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000,
        }}
      >
        <span style={{ color: '#aaa' }}>🎮 Du bist in: {lobby.name}</span>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => {
              setShowChat(true);
              setHasNewMessages(false);
            }}
            style={{
              backgroundColor: '#2e2e2e',
              color: '#fff',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            💬 Chat öffnen
            {hasNewMessages && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '10px',
                  height: '10px',
                  backgroundColor: 'red',
                  borderRadius: '50%',
                }}
              ></span>
            )}
          </button>
          <button
            onClick={handleLeaveLobby}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#b00020',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            🔙 Zurück zur Übersicht
          </button>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem 1rem',
  background: '#222',
  fontWeight: 'bold',
  color: '#f0f0f0',
};

const tdStyle = {
  padding: '0.6rem 1rem',
  textAlign: 'left' as const,
  color: '#ddd',
};
