import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Toast } from '../components/Toast';
import ChatModal from '../components/ChatModal';
import SkinEditor from '../components/SkinEditor';

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

  const [host, setHost] = useState<string | null>(null);
  const isHost = host !== null && username === host;
  const [currentSkin, setCurrentSkin] = useState<{
    ball: string;
  eyes: string;
  mouth: string;
  top: string;
  } | null>(null);
  



  useEffect(() => {
    if (!id) return;
  
    fetch(`${import.meta.env.VITE_API_URL}/lobby/${id}/host`) 
      .then((res) => res.json())
      .then((data) => setHost(data.host))
      .catch((err) => console.error("Fehler beim Laden des Hosts", err));
  }, [id]);

  const fetchPlayers = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/lobbys/${id}/players`); 
    const data = await res.json();
    setPlayers(data);
    
  };

  // Spieler- und Lobby-Daten laden
  useEffect(() => {
    if (!id) return;

    const fetchLobby = async () => {
      const lobbyRes = await fetch(`${import.meta.env.VITE_API_URL}/lobbys/${id}`);
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
      await fetch(`${import.meta.env.VITE_API_URL}/lobbys/${id}/settings`, { 
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

  useEffect(() => {
    if (!id) return;
  
    const channel = supabase
      .channel(`lobby-${id}`)
      .on('broadcast', { event: 'game-started' }, (payload) => {
        console.log("🎮 Spielstart-Broadcast empfangen:", payload.payload);
        navigate(`/game/${id}`); // 🔁 Route zum Spiel
      })
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate]);
  
  const kickPlayer = async (playerUsername: string) => {
    if (!id) return;
  
    const res = await fetch(`${import.meta.env.VITE_API_URL}/lobby/${id}/kick/${playerUsername}`, { 
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
      await fetch(`${import.meta.env.VITE_API_URL}/lobby/${id}/leave/${username}`, { 
        method: 'DELETE',
      });

      navigate('/');
    } catch (err) {
      console.error('Fehler beim Verlassen der Lobby', err);
    }
  };

  if (!lobby) return <p style={{ padding: '2rem', color: '#fff' }}>Lade Lobby...</p>;

  const handleStartGame = async () => {
  console.log("🟢 handleStartGame wurde aufgerufen!");

  if (!id || !username || !currentSkin) {
    console.log("⚠️ Abbruch wegen fehlender Daten:", { id, username, currentSkin });
    return;
  }

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/lobby/start`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lobbyId: id,
        username,
        skin: currentSkin,
      }),
    });

    const data = await res.json();
    console.log("✅ Antwort vom Server:", data);
  } catch (err) {
    console.error("❌ Fehler beim Starten des Spiels:", err);
  }
};

  
  

  return (
    <div
      style={{
        padding: '2rem',
        paddingBottom: '6rem',
        color: '#fff',
        width: '100%',
        fontFamily: 'sans-serif',
        minHeight: '100vh',
        backgroundColor: '#121212', //121212
      }}
    >
      <h1>Lobby: {lobby.name}</h1>
      <p>👑 Host: <strong>{lobby.host}</strong></p>
  
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '2rem',
          marginTop: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Linke Spalte */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Spielertabelle */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 0 10px rgba(0,0,0,0.4)',
              maxHeight: '300px',
              minHeight: '300px',
              display: 'block',
              overflowY: 'auto',
            }}
          >
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#222' }}>
              <tr>
                <th style={thStyle}>🧑 Spielername</th>
                <th style={thStyle}>🎖️ Rolle</th>
                {isHost && <th style={thStyle}>Aktion</th>}
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
          <div
            style={{
              backgroundColor: '#1a1a1a',
              padding: '1.5rem',
              borderRadius: '10px',
              boxShadow: '0 0 10px rgba(0,0,0,0.3)',
              maxWidth: '100%',
            }}
          >
            <h2>⚙️ Einstellungen</h2>
  
            <div
              style={{
                opacity: isHost ? 1 : 0.5,
                pointerEvents: isHost ? 'auto' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                maxWidth: '400px',
              }}
            >
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
                    borderRadius: '4px',
                    position: 'relative',
                    cursor: isHost ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.3s',
                    opacity: isHost ? 1 : 0.5,
                    border: '1px solid #666',
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
        </div>
  
        {/* Rechte Spalte: Skin Editor */}
        <div>
          <div
            style={{
              backgroundColor: '#1a1a1a',
              padding: '1.5rem',
              borderRadius: '10px',
              boxShadow: '0 0 10px rgba(0,0,0,0.3)',
            }}
          >
            <h2>🧍 Skin-Editor</h2>
            <SkinEditor
              lobbyId={id!}
              username={username}
              isHost={isHost}
              onSkinChange={(skin) => setCurrentSkin(skin)} // ✅ Callback-Funktion einfügen
            />

          </div>
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
          backgroundColor: '#1e1e1e', //1e1e1e
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
          onClick={handleStartGame}
              disabled={!isHost}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isHost ? '#007bff' : '#555',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isHost ? 'pointer' : 'not-allowed',
                opacity: isHost ? 1 : 0.6,
              }}
            >
              🎮 Spiel starten
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
              marginRight: '3rem',
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
