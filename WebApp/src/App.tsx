import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LobbyView from './pages/LobbyView';
import { LobbyList } from './components/LobbyList';
import { Modal } from './components/Modal';
import { supabase } from './supabaseClient';
import JoinLobbyModal from './components/JoinLobbyModal';

function App() {
  const [username, setUsername] = useState('');
  const [lobbyName, setLobbyName] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lobbys, setLobbys] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<any | null>(null);

  const navigate = useNavigate();

  const handleCreateLobby = async () => {
    if (!username.trim() || !lobbyName.trim()) {
      setError('Bitte gib einen Username und einen Lobby-Namen ein.');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          name: lobbyName,
          password: usePassword ? password : null,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setLobbyId(data.lobbyId);
        setLobbyName('');
        setPassword('');
        fetchLobbys();
        navigate(`/lobby/${data.lobbyId}`, {
          state: { successMessage: '🎉 Lobby erstellt!' },
        });
        setShowModal(false);
      }
    } catch (err) {
      console.error(err);
      setError('Fehler beim Erstellen der Lobby');
    }
  };

  const handleJoinLobby = (lobby: any) => {
    setSelectedLobby(lobby);
    setShowJoinModal(true);
  };
  

  const directJoin = async (lobbyId: string, pw?: string, user?: string) => {
    const nameToUse = user || username;
    
    console.log("Joining with:", { nameToUse, lobbyId, pw });

    if (!nameToUse.trim()) {
      setError('Username fehlt!');
      return;
    }
  
    try {
      const res = await fetch('http://localhost:3000/lobby/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: nameToUse, lobbyId, password: pw }),
      });
  
      const data = await res.json();
  
      if (data.error) {
        setError(data.error);
      } else {
        navigate(`/lobby/${lobbyId}`);
      }
    } catch (err) {
      console.error(err);
      setError('Fehler beim Beitreten zur Lobby');
    }
  };
  

  const fetchLobbys = async () => {
    const res = await fetch('http://localhost:3000/lobbys');
    const data = await res.json();
    setLobbys(data);
  };

  useEffect(() => {
    fetchLobbys();
    const channel = supabase
      .channel('lobby-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbys' }, fetchLobbys)
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
          <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#121212', color: '#fff' }}>
            <div style={{ flex: 1, padding: '2rem', maxWidth: '400px', backgroundColor: '#1e1e1e' }}>
              <h1>👨‍💻 Lobby-System</h1>

              <button onClick={() => setShowModal(true)}>➕ Lobby erstellen</button>

              {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>

            <div style={{ flex: 2, padding: '2rem' }}>
              <h2>🧾 Offene Lobbys</h2>
              <LobbyList lobbys={lobbys} onJoin={handleJoinLobby} />
            </div>

            {/* Create Lobby Modal */}
            {showModal && (
              <Modal title="Neue Lobby erstellen" onClose={() => setShowModal(false)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Lobbyname"
                    value={lobbyName}
                    onChange={(e) => setLobbyName(e.target.value)}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={usePassword}
                      onChange={(e) => setUsePassword(e.target.checked)}
                    />
                    Passwortschutz aktivieren
                  </label>
                  {usePassword && (
                    <input
                      type="password"
                      placeholder="Passwort"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  )}
                  <button onClick={handleCreateLobby}>✅ Lobby erstellen</button>
                </div>
              </Modal>
            )}

            {/* Join Lobby Modal */}
            {showJoinModal && selectedLobby && (
              <JoinLobbyModal
              lobby={selectedLobby}
              username={username}
              onClose={() => {
                setShowJoinModal(false);
                setSelectedLobby(null);
              }}
              onSubmit={(enteredUsername, pw) => {
                if (!selectedLobby) return;
              
                console.log("selectedLobby", selectedLobby);

                setUsername(enteredUsername); // speichern für später
                directJoin(selectedLobby, pw, enteredUsername);
                setShowJoinModal(false);
              }}
              
            />
            
            )}
          </div>
        }
      />
      <Route path="/lobby/:id" element={<LobbyView username={username} />} />
    </Routes>
  );
}

export default App;
