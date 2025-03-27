import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LobbyView from './pages/LobbyView';
import { LobbyList } from './components/LobbyList';
import { Modal } from './components/Modal'; // 🔄 neu
import { supabase } from './supabaseClient';


function App() {
  const [username, setUsername] = useState('');
  const [lobbyName, setLobbyName] = useState('');
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lobbys, setLobbys] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  const handleCreateLobby = async () => {
    if (!username.trim() || !lobbyName.trim()) {
      setError('Bitte gib einen Username und einen Lobby-Namen ein.');
      return;
    }

    setError('');
    try {
      const res = await fetch('http://localhost:3000/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name: lobbyName }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setLobbyId(data.lobbyId);
        setLobbyName('');
        fetchLobbys();
        navigate(`/lobby/${data.lobbyId}`, {
          state: { successMessage: "🎉 Lobby erstellt!" },
        });
        setShowModal(false);
      }
    } catch (err) {
      console.error(err);
      setError('Fehler beim Erstellen der Lobby');
    }
  };

  const handleJoinLobby = async (id: string) => {
    if (!username.trim()) {
      setError('Bitte gib zuerst deinen Username ein!');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/lobby/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, lobbyId: id }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setError('');
        navigate(`/lobby/${id}`);
      }
    } catch (err) {
      console.error(err);
      setError('Fehler beim Beitreten zur Lobby');
    }
  };

  const fetchLobbys = async () => {
    try {
      const res = await fetch('http://localhost:3000/lobbys');
      const data = await res.json();
      setLobbys(data);
    } catch (err) {
      console.error('Fehler beim Laden der Lobbys', err);
    }
  };

  useEffect(() => {
    fetchLobbys();

    // Realtime Lobby-Update
    const channel = supabase
      .channel('lobby-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbys' }, () => {
        fetchLobbys();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              minHeight: '100vh',
              backgroundColor: '#121212',
              color: '#fff',
              fontFamily: 'sans-serif',
            }}
          >
            {/* Sidebar */}
            <div
              style={{
                flex: '1',
                padding: '2rem',
                maxWidth: '400px',
                backgroundColor: '#1e1e1e',
                borderRight: '1px solid #333',
              }}
            >
              <h1>👨‍💻 Lobby-System</h1>

              <button
                onClick={() => setShowModal(true)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '1rem',
                  border: '1px solid white',
                  background: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                ➕ Lobby erstellen
              </button>

              {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

              
            </div>

            {/* Hauptbereich */}
            <div style={{ flex: '2', padding: '2rem' }}>
              <h2>🧾 Offene Lobbys</h2>
              <LobbyList lobbys={lobbys} onJoin={handleJoinLobby} />
            </div>

            {/* Modal */}
            {showModal && (
              <Modal title="Neue Lobby erstellen" onClose={() => setShowModal(false)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label>Username:</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
                    />
                  </div>
                  <div>
                    <label>Lobby-Name:</label>
                    <input
                      type="text"
                      value={lobbyName}
                      onChange={(e) => setLobbyName(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
                    />
                  </div>
                  <button
                    onClick={handleCreateLobby}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#333',
                      color: '#fff',
                      border: '1px solid #888',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    ✅ Lobby erstellen
                  </button>
                </div>
              </Modal>
            )}
          </div>
        }
      />
      <Route path="/lobby/:id" element={<LobbyView username={username} />} />
    </Routes>
  );
}

export default App;
