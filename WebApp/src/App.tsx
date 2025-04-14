import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LobbyView from './pages/LobbyView';
import { LobbyList } from './components/LobbyList';
import { Modal } from './components/Modal';
import { supabase } from './supabaseClient';
import JoinLobbyModal from './components/JoinLobbyModal';
import { Toast } from './components/Toast';
import GameView from './pages/GameView';
import GameOverView from './pages/GameOverView';
import './App.css';

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');


  const navigate = useNavigate();
  console.log(lobbyId)

  const handleCreateLobby = async () => {
    if (!username.trim() || !lobbyName.trim()) {
      setError('Bitte gib einen Username und einen Lobby-Namen ein.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/lobby`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          name: lobbyName,
          password: usePassword ? password : null,
        }),
      });

      localStorage.setItem("username", username);
      
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
    
    // console.log("Joining with:", { nameToUse, lobbyId, pw });

    if (!nameToUse.trim()) {
      setError('Username fehlt!');
      return;
    }
  
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/lobby/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: nameToUse, lobbyId, password: pw }),
      });
  
      const data = await res.json();
  
      if (data.error) {
        setToastMessage(data.error);
        setToastType('error');
      } else {
        navigate(`/lobby/${lobbyId}`);
      }
      
    } catch (err) {
      console.error(err);
      setError('Fehler beim Beitreten zur Lobby');
    }
  };
  

  const fetchLobbys = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/lobbys`);
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
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-brand">🎮 Game Lobby</div>
        <div className="navbar-menu">
          <button className="nav-button">Home</button>
          <button className="nav-button">Lobbys</button>
          <button className="nav-button">Profil</button>
          <button className="nav-button login-button">Login</button>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <div className="home-container">
                <div className="sidebar">
                  <h1 className="title">👨 Game Lobby System</h1>
                  <button className="create-button" onClick={() => setShowModal(true)}>
                    ➕ Neue Lobby erstellen
                  </button>
                  {error && <p className="error-message">{error}</p>}
                </div>

                <div className="lobby-section">
                  <h2 className="section-title">Offene Lobbys</h2>
                  <LobbyList lobbys={lobbys} onJoin={handleJoinLobby} />
                </div>

                {showModal && (
                  <Modal title="Neue Lobby erstellen" onClose={() => setShowModal(false)}>
                    <div className="modal-form">
                      <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="modal-input"
                      />
                      <input
                        type="text"
                        placeholder="Lobbyname"
                        value={lobbyName}
                        onChange={(e) => setLobbyName(e.target.value)}
                        className="modal-input"
                      />
                      <label className="checkbox-label">
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
                          className="modal-input"
                        />
                      )}
                      <button className="modal-submit-button" onClick={handleCreateLobby}>
                        Lobby erstellen
                      </button>
                    </div>
                  </Modal>
                )}

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
                      setUsername(enteredUsername);
                      directJoin(selectedLobby.id, pw, enteredUsername);
                      setShowJoinModal(false);
                    }}
                  />
                )}
                {toastMessage && (
                  <Toast
                    message={toastMessage}
                    type={toastType}
                    onClose={() => setToastMessage(null)}
                  />
                )}
              </div>
            }
          />
          <Route path="/lobby/:id" element={<LobbyView username={username} />} />
          <Route path="/game/:id" element={<GameView />} />
          <Route path="/game-over" element={<GameOverView />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
