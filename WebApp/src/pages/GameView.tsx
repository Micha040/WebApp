import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';


export default function GameView({ username }: { username: string }) {
    const { id } = useParams();
  
    return (
      <div style={{ color: "#fff", padding: "2rem" }}>
        <h1>🎮 Spiel läuft!</h1>
        <p>Spiel-ID: {id}</p>
        <p>Du bist: {username}</p>
      </div>
    );
  }
  