import { useEffect, useState } from 'react';

function App() {
  const [username, setUsername] = useState<string>('');
  const [lobbyName, setLobbyName] = useState<string>('');
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [lobbys, setLobbys] = useState<any[]>([]);

  const handleCreateLobby = async () => {
    if (!username.trim() || !lobbyName.trim()) {
      setError('Bitte gib einen Username und einen Lobby-Namen ein.');
      return;
    }

    setError('');
    try {
      const response = await fetch('http://localhost:3000/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name: lobbyName }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setLobbyId(data.lobbyId);
        setLobbyName('');
        fetchLobbys(); // aktualisiere Liste
      }
    } catch (err) {
      console.error(err);
      setError('Fehler beim Erstellen der Lobby');
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
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#fff', backgroundColor: '#121212', minHeight: '100vh' }}>
      <h1>👨‍💻 Lobby-System</h1>

      <div style={{ marginBottom: '1rem' }}>
        <label>Username:</label><br />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: '0.5rem', fontSize: '1rem', width: '200px' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Lobby-Name:</label><br />
        <input
          type="text"
          value={lobbyName}
          onChange={(e) => setLobbyName(e.target.value)}
          style={{ padding: '0.5rem', fontSize: '1rem', width: '200px' }}
        />
      </div>

      <button
        onClick={handleCreateLobby}
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
        Lobby erstellen
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {lobbyId && (
        <div style={{ marginTop: '2rem' }}>
          <h2>🎉 Lobby erstellt!</h2>
          <p>Lobby-ID: <strong>{lobbyId}</strong></p>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h2>🧾 Offene Lobbys</h2>
        {lobbys.length === 0 ? (
          <p>Keine Lobbys vorhanden.</p>
        ) : (
          <ul>
            {lobbys.map((lobby) => (
              <li key={lobby.id} style={{ marginBottom: '1rem' }}>
                🏷️ <strong>{lobby.name}</strong><br />
                👤 {lobby.host}<br />
                🕒 {lobby.created_at
                  ? new Date(lobby.created_at).toLocaleString()
                  : 'Kein Datum'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
