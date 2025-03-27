type Lobby = {
    id: string;
    name: string;
    host: string;
    created_at?: string;
  };
  
  
  export function LobbyList({ lobbys, onJoin }: { lobbys: any[], onJoin: (lobby: any) => void }) {
    if (lobbys.length === 0) {
      return <p>Keine Lobbys vorhanden.</p>;
    }
  
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #444' }}>
              <th style={thStyle}>🏷️ Name</th>
              <th style={thStyle}>👤 Host</th>
              <th style={thStyle}>🕒 Erstellt</th>
              <th style={thStyle}>🎮 Aktion</th>
            </tr>
          </thead>
          <tbody>
            {lobbys.map((lobby) => (
              <tr key={lobby.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={tdStyle}>{lobby.name}</td>
                <td style={tdStyle}>{lobby.host}</td>
                <td style={tdStyle}>
                  {lobby.created_at
                    ? new Date(lobby.created_at).toLocaleString()
                    : 'Kein Datum'}
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => onJoin(lobby)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.9rem',
                      backgroundColor: '#333',
                      color: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
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
  
  // 🔧 einfache Styles
  const thStyle = {
    textAlign: 'left' as const,
    padding: '0.75rem 1rem',
    fontWeight: 'bold',
    backgroundColor: '#1b1b1b',
  };
  
  const tdStyle = {
    padding: '0.6rem 1rem',
  };
  