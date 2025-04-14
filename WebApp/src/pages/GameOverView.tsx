import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

// Socket-Verbindung außerhalb der Komponente erstellen
const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  transports: ['websocket'],
});

type Player = {
  username: string;
  health: number;
  isAlive: boolean;
  skin: {
    ball: string;
    eyes: string;
    mouth: string;
    top: string;
  };
};

type FinalGameState = {
  username: string;
  isAlive: boolean;
}[];

type GameOverData = {
  winner: Player | null;
  finalGameState: FinalGameState;
  isGameFinished: boolean;
};

const GameOverView: React.FC = () => {
  const navigate = useNavigate();
  const [finalGameState, setFinalGameState] = useState<FinalGameState>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);

  useEffect(() => {
    socket.on('gameOver', (data: GameOverData) => {
      setFinalGameState(data.finalGameState);
      setWinner(data.winner);
      setIsGameFinished(data.isGameFinished);
    });

    return () => {
      socket.off('gameOver');
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: 'white',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '2rem',
        borderRadius: '10px',
        maxWidth: '600px',
        width: '100%',
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          color: winner ? '#4CAF50' : '#f44336'
        }}>
          {isGameFinished 
            ? winner 
              ? `${winner.username} hat gewonnen!` 
              : 'Spiel beendet'
            : 'Du bist gestorben!'}
        </h1>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {finalGameState.map((player, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                marginBottom: '0.5rem',
                borderRadius: '5px',
              }}
            >
              <span>{player.username}</span>
              <span style={{
                color: player.isAlive ? '#4CAF50' : '#f44336',
                fontWeight: 'bold'
              }}>
                {player.isAlive ? 'Überlebt' : 'Gestorben'}
              </span>
            </div>
          ))}
        </div>

        {!isGameFinished && (
          <p style={{ 
            textAlign: 'center', 
            marginTop: '2rem',
            color: '#aaa'
          }}>
            Warte auf das Ende des Spiels...
          </p>
        )}

        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '2rem',
            padding: '10px 20px',
            backgroundColor: '#4a9eff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            width: '100%',
            fontSize: '1rem',
          }}
        >
          Zurück zur Startseite
        </button>
      </div>
    </div>
  );
};

export default GameOverView; 