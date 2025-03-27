import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LobbyView from './pages/LobbyView';
import { LobbyForm } from './components/LobbyForm';
import { LobbyList } from './components/LobbyList';

function App() {
  const [username, setUsername] = useState('');
  const [lobbyName, setLobbyName] = useState('');
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lobbys, setLobbys] = useState<any[]>([]);

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

              <LobbyForm
                username={username}
                lobbyName={lobbyName}
                setUsername={setUsername}
                setLobbyName={setLobbyName}
                onCreate={handleCreateLobby}
              />

              {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

              {lobbyId && (
                <div style={{ marginTop: '2rem' }}>
                  <h2>🎉 Lobby erstellt!</h2>
                  <p>Lobby-ID: <strong>{lobbyId}</strong></p>
                </div>
              )}
            </div>

            {/* Hauptbereich */}
            <div style={{ flex: '2', padding: '2rem' }}>
              <h2>🧾 Offene Lobbys</h2>
              <LobbyList lobbys={lobbys} onJoin={handleJoinLobby} />
            </div>
          </div>
        }
      />
      <Route path="/lobby/:id" element={<LobbyView username={username} />} />
    </Routes>
  );
}

export default App;
