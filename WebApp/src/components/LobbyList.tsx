// type Lobby = {
//     id: string;
//     name: string;
//     host: string;
//     created_at?: string;
//   };
  
  
  export function LobbyList({ lobbys, onJoin }: { lobbys: any[], onJoin: (lobby: any) => void }) {
    if (lobbys.length === 0) {
      return <p className="no-lobbies">Keine Lobbys vorhanden.</p>;
    }
  
    return (
      <div className="lobby-table-container">
        <table className="lobby-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Host</th>
              <th>Erstellt</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {lobbys.map((lobby) => (
              <tr key={lobby.id}>
                <td>
                  {lobby.name}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {lobby.has_password ? '🔒' : '🔓'}
                </td>
                <td>{lobby.host}</td>
                <td>
                  {lobby.created_at
                    ? new Date(lobby.created_at).toLocaleString()
                    : 'Kein Datum'}
                </td>
                <td>
                  <button
                    onClick={() => onJoin(lobby)}
                    className="join-button"
                  >
                    Beitreten
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  // einfache Styles
  const thStyle = {
    textAlign: 'left' as const,
    padding: '0.75rem 1rem',
    fontWeight: 'bold',
    backgroundColor: '#1b1b1b',
  };
  
  const tdStyle = {
    padding: '0.6rem 1rem',
  };
  