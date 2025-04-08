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

const GameOverView: React.FC = () => {
  const navigate = useNavigate();
  const [winner, setWinner] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  useEffect(() => {
    // Höre auf Spieler-Updates
    socket.on('playersUpdate', (data: Record<string, Player>) => {
      setPlayers(data);
      
      // Prüfe, ob nur noch ein Spieler am Leben ist
      const alivePlayers = Object.values(data).filter(player => player.isAlive);
      if (alivePlayers.length === 1) {
        setWinner(alivePlayers[0]);
        setShowConfetti(true);
      }
    });

    // Höre auf Game-Over-Event
    socket.on('gameOver', (winnerData: Player) => {
      setWinner(winnerData);
      setShowConfetti(true);
    });

    return () => {
      socket.off('playersUpdate');
      socket.off('gameOver');
    };
  }, [navigate]);

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
            {Object.values(players).map((player, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: player.isAlive ? 'rgba(0, 128, 0, 0.3)' : 'rgba(128, 0, 0, 0.3)',
                  borderRadius: '5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      position: 'relative',
                      borderRadius: '50%',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={`/skins/Balls/${player.skin.ball}.png`}
                      alt="ball"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
                    />
                    <img
                      src={`/skins/Eyes/${player.skin.eyes}.png`}
                      alt="eyes"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
                    />
                    <img
                      src={`/skins/Mouths/${player.skin.mouth}.png`}
                      alt="mouth"
                      style={{ 
                        position: 'absolute', 
                        top: '45%', 
                        left: '50%', 
                        width: '60%',
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                    {player.skin.top !== 'none' && (
                      <img
                        src={`/skins/Tops/${player.skin.top}.png`}
                        alt="top"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
                      />
                    )}
                  </div>
                  <span style={{ fontWeight: 'bold' }}>{player.username}</span>
                </div>
                <div>
                  {player.isAlive ? (
                    <span style={{ color: '#4CAF50' }}>Überlebt</span>
                  ) : (
                    <span style={{ color: '#f44336' }}>Eliminiert</span>
                  )}
                </div>
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