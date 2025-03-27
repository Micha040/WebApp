import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Toast } from '../components/Toast';

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

  useEffect(() => {
    if (!id) return;

    const fetchLobby = async () => {
      const lobbyRes = await fetch(`http://localhost:3000/lobbys/${id}`);
      const lobbyData = await lobbyRes.json();
      setLobby(lobbyData);
    };

    const fetchPlayers = async () => {
      const res = await fetch(`http://localhost:3000/lobbys/${id}/players`);
      const data = await res.json();
      setPlayers(data);
    };

    fetchLobby();
    fetchPlayers();

    // Realtime-Update
    const channel = supabase
      .channel(`players-in-lobby-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `lobby_id=eq.${id}`,
        },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleLeaveLobby = async () => {
    if (!id || !username) return;

    try {
      await fetch(`http://localhost:3000/lobby/${id}/leave/${username}`, {
        method: 'DELETE',
      });

      navigate('/');
    } catch (err) {
      console.error('Fehler beim Verlassen der Lobby', err);
    }
  };

  if (!lobby) return <p style={{ padding: '2rem', color: '#fff' }}>Lade Lobby...</p>;

  return (
    <div style={{ padding: '2rem', color: '#fff', fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#121212' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🏷️ Lobby: {lobby.name}</h1>
        <button
          onClick={handleLeaveLobby}
          style={{
            padding: '0.4rem 0.8rem',
            backgroundColor: '#8b0000',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          🔙 Zurück zur Übersicht
        </button>
      </div>

      <p>👑 Host: <strong>{lobby.host}</strong></p>

      <table style={{ marginTop: '2rem', width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #444' }}>
            <th style={thStyle}>🧑 Spielername</th>
            <th style={thStyle}>🎖️ Rolle</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr
              key={player.id}
              style={{
                borderBottom: '1px solid #333',
                backgroundColor: player.username === lobby.host ? '#1f1f1f' : 'inherit',
              }}
            >
              <td style={{ ...tdStyle, fontWeight: player.username === lobby.host ? 'bold' : 'normal' }}>
                {player.username}
              </td>
              <td style={tdStyle}>
                {player.username === lobby.host ? '👑 Host' : '👤 Spieler'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ Toast */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}

const thStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem 1rem',
  background: '#1a1a1a',
};

const tdStyle = {
  padding: '0.6rem 1rem',
};
