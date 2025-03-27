type LobbyFormProps = {
    username: string;
    lobbyName: string;
    setUsername: (name: string) => void;
    setLobbyName: (name: string) => void;
    onCreate: () => void;
  };
  
  export function LobbyForm({
    username,
    lobbyName,
    setUsername,
    setLobbyName,
    onCreate,
  }: LobbyFormProps) {
    return (
      <>
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
          onClick={onCreate}
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
      </>
    );
  }
  