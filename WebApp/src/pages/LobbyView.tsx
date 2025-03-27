import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Toast } from '../components/Toast';
import ChatModal from '../components/ChatModal';

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

  const [settings, setSettings] = useState({
    roundTime: 60,
    maxPlayers: 8,
    difficulty: 'normal',
    allowHints: true,
  });

  const isHost = username === lobby?.host;

  const fetchPlayers = async () => {
    const res = await fetch(`http://localhost:3000/lobbys/${id}/players`);
    const data = await res.json();
    setPlayers(data);
    
  };

  // Spieler- und Lobby-Daten laden
  useEffect(() => {
    if (!id) return;

    const fetchLobby = async () => {
      const lobbyRes = await fetch(`http://localhost:3000/lobbys/${id}`);
      const lobbyData = await lobbyRes.json();
      setLobby(lobbyData);
    
      setSettings({
        roundTime: lobbyData.round_time,
        maxPlayers: lobbyData.max_players,
        difficulty: lobbyData.difficulty,
        allowHints: lobbyData.allow_hints,
      });
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
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
    };
  }, [id]);

  const handleSettingChange = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  
    if (isHost && id) {
      await fetch(`http://localhost:3000/lobbys/${id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [key === 'roundTime' ? 'round_time' : key === 'maxPlayers' ? 'max_players' : key === 'allowHints' ? 'allow_hints' : key]: value,
        }),
      });
    }
  };

  useEffect(() => {
    if (!id) return;
  
    const channel = supabase
      .channel(`lobby-settings-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'lobbys',
        filter: `id=eq.${id}`,
      }, (payload) => {
        const updated = payload.new;
        setSettings({
          roundTime: updated.round_time,
          maxPlayers: updated.max_players,
          difficulty: updated.difficulty,
          allowHints: updated.allow_hints,
        });
      })
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);  
  
  useEffect(() => {
    if (!id) return;
  
    const channel = supabase
      .channel(`lobby-${id}`)
      .on('broadcast', { event: 'player-kicked' }, (payload) => {
        const kickedUser = payload.payload.username;
  
        if (kickedUser === username) {
          alert("Du wurdest vom Host entfernt.");
          navigate("/");
        }
      })
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, username, navigate]);
  
  
  

  // 🔴 Nachrichten-Indikator: hört auf neue Nachrichten, auch wenn Chat geschlossen ist
  useEffect(() => {
    if (!id) return;

    const messageChannel = supabase
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
            console.log("🔴 Neue Nachricht empfangen (Chat geschlossen)");
            setHasNewMessages(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [id, showChat]);

  const kickPlayer = async (playerUsername: string) => {
    if (!id) return;
  
    const res = await fetch(`http://localhost:3000/lobby/${id}/kick/${playerUsername}`, {
      method: 'DELETE',
    });
  
    if (res.ok) {
      // Broadcast an alle Clients
      await supabase.channel(`lobby-${id}`).send({
        type: 'broadcast',
        event: 'player-kicked',
        payload: { username: playerUsername },
      });
  
      // ✅ Spielerliste neu laden, damit der Host die Änderung sofort sieht
      fetchPlayers();
    } else {
      console.error("Kick fehlgeschlagen");
    }
  };
  
  

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
      <h1>Lobby: {lobby.name}</h1>
      <p>👑 Host: <strong>{lobby.host}</strong></p>

      <table
        style={{
          margin: '2rem auto',
          width: '100%',
          maxWidth: '600px',
          borderCollapse: 'collapse',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 0 10px rgba(0,0,0,0.4)',
        }}
      >
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
                {player.username === username && ' (Du)'}
              </td>
              <td style={tdStyle}>
                {player.username === lobby.host ? '👑 Host' : '👤 Spieler'}
              </td>

              {/* Kick-Button nur sichtbar für Host und nicht bei sich selbst */}
              {isHost && (
                <td style={tdStyle}>
                  {player.username !== username && (
                    <button
                    onClick={() => {
                      const confirmKick = confirm(`Willst du ${player.username} wirklich kicken?`);
                      if (!confirmKick) return;
                    
                      kickPlayer(player.username);
                    }}                    
                      style={{
                        backgroundColor: '#8b0000',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.3rem 0.6rem',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      🚫 Kick
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Einstellungen */}
      <div style={{
    backgroundColor: '#1a1a1a',
    padding: '1.5rem',
    borderRadius: '10px',
    boxShadow: '0 0 10px rgba(0,0,0,0.3)',
    marginTop: '2rem',
    maxWidth: '500px',
  }}>
          <h2>⚙️ Einstellungen</h2>

          <div style={{ opacity: isHost ? 1 : 0.5, pointerEvents: isHost ? 'auto' : 'none', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <label>
              ⏱️ Rundenzeit (Sekunden):
              <input
                type="number"
                value={settings.roundTime}
                onChange={(e) => handleSettingChange('roundTime', Number(e.target.value))}
                style={{
                  backgroundColor: '#2c2c2c',
                  color: '#fff',
                  border: '1px solid #555',
                  padding: '0.5rem',
                  borderRadius: '5px',
                  width: '100%',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.border = '1px solid #888'}
                onBlur={(e) => e.currentTarget.style.border = '1px solid #555'}
              />
            </label>

            <label>
              👥 Max. Spieler:
              <input
                type="number"
                value={settings.maxPlayers}
                onChange={(e) => handleSettingChange('maxPlayers', Number(e.target.value))}
                style={{
                  backgroundColor: '#2c2c2c',
                  color: '#fff',
                  border: '1px solid #555',
                  padding: '0.5rem',
                  borderRadius: '5px',
                  width: '100%',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.border = '1px solid #888'}
                onBlur={(e) => e.currentTarget.style.border = '1px solid #555'}
              />
            </label>

            <label>
              🎮 Schwierigkeit:
              <select
                value={settings.difficulty}
                onChange={(e) => handleSettingChange('difficulty', e.target.value)}
                style={{
                  backgroundColor: '#2c2c2c',
                  color: '#fff',
                  border: '1px solid #555',
                  padding: '0.5rem',
                  borderRadius: '5px',
                  width: '100%',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.border = '1px solid #888'}
                onBlur={(e) => e.currentTarget.style.border = '1px solid #555'}
              >
                <option value="easy">Einfach</option>
                <option value="normal">Normal</option>
                <option value="hard">Schwer</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🧠 Tipps erlauben:
              </span>

              <div
                onClick={() => isHost && handleSettingChange('allowHints', !settings.allowHints)}
                style={{
                  width: '50px',
                  height: '32px',
                  backgroundColor: settings.allowHints ? '#4caf50' : '#444',
                  borderRadius: '4px', // 🔷 Eckig statt rund
                  position: 'relative',
                  cursor: isHost ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.3s',
                  opacity: isHost ? 1 : 0.5,
                  border: '1px solid #666', // wie Input-Felder
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: settings.allowHints ? '26px' : '3px',
                    width: '22px',
                    height: '26px',
                    borderRadius: '3px',
                    backgroundColor: '#fff',
                    transition: 'left 0.3s',
                    boxShadow: 'inset 0 0 2px rgba(0,0,0,0.2)',
                  }}
                />
              </div>
            </label>


          </div>
        </div>

      {/* ✅ Chat-Modal */}
      {showChat && id && (
        <ChatModal
          lobbyId={id}
          username={username}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* ✅ Toast */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* ✅ Sticky Footer mit Chat-Indikator */}
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
              setHasNewMessages(false); // zurücksetzen beim Öffnen
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
