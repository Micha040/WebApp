import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
//test
const GameOverView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [winner, setWinner] = useState<Player | null>(null);
  const [finalGameState, setFinalGameState] = useState<FinalGameState>([]);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  useEffect(() => {
    // Hole die Daten aus der Navigation
    const gameData = location.state;
    if (gameData) {
      console.log("Empfangene Spieldaten:", gameData);
      setWinner(gameData.winner);
      setFinalGameState(gameData.finalGameState);
      setShowConfetti(true);

      // Speichere die Spieldaten nur für eingeloggte Benutzer
      const saveGameData = async () => {
        try {
          // Überprüfe zuerst, ob der Gewinner ein eingeloggter Benutzer ist
          console.log("Winner ID:", gameData.winner.id);
          console.log("Winner Data:", gameData.winner);
          
          if (!gameData.winner.id || gameData.winner.id === 'guest') {
            console.log('Spielhistorie wird nicht gespeichert - Gewinner ist nicht eingeloggt');
            return;
          }

          const gameHistoryData = {
            winner_id: gameData.winner.id,
            winner_username: gameData.winner.username,
            duration: gameData.duration || 0,
            player_count: gameData.finalGameState.length,
            difficulty: gameData.settings?.difficulty || 'normal',
            players: gameData.finalGameState.map((player: any, index: number) => ({
              id: player.id === 'guest' ? null : player.id,
              username: player.username,
              placement: player.placement || index + 1
            })),
            settings: gameData.settings || {
              roundTime: 0,
              maxPlayers: gameData.finalGameState.length,
              allowHints: false
            }
          };

          console.log("Sende Spieldaten an Server:", gameHistoryData);

          const response = await fetch(`${import.meta.env.VITE_API_URL}/games/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(gameHistoryData)
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Fehler beim Speichern der Spielhistorie:', errorData);
          }
        } catch (err) {
          console.error('Fehler beim Speichern der Spielhistorie:', err);
        }
      };

      saveGameData();
    }

    // Höre auf Game-Over-Event
    socket.on('gameOver', (data: { winner: Player, finalGameState: FinalGameState }) => {
      console.log("Game Over Event empfangen:", data);
      setWinner(data.winner);
      setFinalGameState(data.finalGameState);
      setShowConfetti(true);
    });

    return () => {
      socket.off('gameOver');
    };
  }, [location.state]);

  // Funktion zum Zurückkehren zur Startseite
  const handleReturnToHome = () => {
    navigate('/');
  };

  // Konfetti-Effekt
  useEffect(() => {
    if (showConfetti) {
      // Hier könnte ein Konfetti-Effekt implementiert werden
      // z.B. mit einer Bibliothek wie react-confetti
    }
  }, [showConfetti]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#111',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Hintergrund-Animation */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, #222 0%, #111 100%)',
          zIndex: -1,
        }}
      >
        {/* Animierte Partikel */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 5 + 2 + 'px',
              height: Math.random() * 5 + 2 + 'px',
              backgroundColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 0.5 + 0.5})`,
              borderRadius: '50%',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Hauptinhalt */}
      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          borderRadius: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
          maxWidth: '800px',
          width: '90%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontSize: '3rem',
            marginBottom: '20px',
            color: '#ffd700',
            textShadow: '0 0 10px rgba(255, 215, 0, 0.7)',
          }}
        >
          Spiel beendet!
        </h1>

        {winner ? (
          <>
            <div
              style={{
                margin: '30px auto',
                width: '150px',
                height: '150px',
                position: 'relative',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '5px solid #ffd700',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.7)',
              }}
            >
              {/* Gewinner-Skin */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  imageRendering: 'pixelated',
                }}
              >
                <img
                  src={`/skins/Balls/${winner.skin.ball}.png`}
                  alt="ball"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
                />
                <img
                  src={`/skins/Eyes/${winner.skin.eyes}.png`}
                  alt="eyes"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
                />
                <img
                  src={`/skins/Mouths/${winner.skin.mouth}.png`}
                  alt="mouth"
                  style={{ 
                    position: 'absolute', 
                    top: '45%', 
                    left: '50%', 
                    width: '60%',
                    transform: 'translate(-50%, -50%)'
                  }}
                />
                {winner.skin.top !== 'none' && (
                  <img
                    src={`/skins/Tops/${winner.skin.top}.png`}
                    alt="top"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
                  />
                )}
              </div>
            </div>

            <h2
              style={{
                fontSize: '2.5rem',
                marginBottom: '20px',
                color: '#ffd700',
                textShadow: '0 0 10px rgba(255, 215, 0, 0.7)',
              }}
            >
              {winner.username} hat gewonnen!
            </h2>

            <p
              style={{
                fontSize: '1.2rem',
                marginBottom: '30px',
                color: '#ccc',
              }}
            >
              Herzlichen Glückwunsch! Du hast alle anderen Spieler besiegt und das Spiel gewonnen.
            </p>
          </>
        ) : (
          <p
            style={{
              fontSize: '1.5rem',
              marginBottom: '30px',
              color: '#ccc',
            }}
          >
            Warte auf das Ende des Spiels...
          </p>
        )}

        <div
          style={{
            marginTop: '30px',
            padding: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '10px',
          }}
        >
          <h3
            style={{
              fontSize: '1.5rem',
              marginBottom: '15px',
              color: '#ffd700',
            }}
          >
            Spieler-Statistiken
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
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
        </div>

        {/* Button zum Zurückkehren zur Startseite */}
        <button
          onClick={handleReturnToHome}
          style={{
            marginTop: '30px',
            padding: '12px 24px',
            backgroundColor: '#4a9eff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.2rem',
            cursor: 'pointer',
            transition: 'background-color 0.3s, transform 0.2s',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#3a8eef';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#4a9eff';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Zurück zur Startseite
        </button>
      </div>

      {/* CSS für Animationen */}
      <style>
        {`
          @keyframes float {
            0% {
              transform: translateY(0) translateX(0);
            }
            25% {
              transform: translateY(-20px) translateX(10px);
            }
            50% {
              transform: translateY(0) translateX(20px);
            }
            75% {
              transform: translateY(20px) translateX(10px);
            }
            100% {
              transform: translateY(0) translateX(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default GameOverView; 