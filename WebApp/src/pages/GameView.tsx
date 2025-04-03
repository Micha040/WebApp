import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
// import { useParams } from 'react-router-dom';

type Player = {
  x: number;
  y: number;
  username: string;
  health: number;
};

type Bullet = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
};

const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  transports: ['websocket'],
});

const GameView: React.FC = () => {
  // const { id } = useParams();
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [username, setUsername] = useState<string>('');

  

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animationFrame = useRef<number>(0);
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [showPlayerList, setShowPlayerList] = useState(false);


  // Hole Username und joine Socket
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      socket.emit('join', { username: storedUsername });
    }
  }, []);

  // Spielerpositionen empfangen
  useEffect(() => {
    socket.on('playersUpdate', (data: Record<string, Player>) => {
      setPlayers(data);
    });
    return () => {
      socket.off('playersUpdate');
    };
  }, []);

  // Bewegung & Schießen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.key === 'Tab') {
        e.preventDefault(); // Verhindert Browser-Fokuswechsel
        setShowPlayerList(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      if (e.key === 'Tab') {
        setShowPlayerList(false);
      }
    };

    const move = () => {
      const directions: string[] = [];

      if (keysPressed.current['w']) directions.push('up');
      if (keysPressed.current['a']) directions.push('left');
      if (keysPressed.current['s']) directions.push('down');
      if (keysPressed.current['d']) directions.push('right');

      if (directions.length > 0) {
        socket.emit('move', directions);
      }

      // Update Bullets
      setBullets((prev) =>
        prev
          .map((b) => ({ ...b, x: b.x + b.vx, y: b.y + b.vy }))
          .filter((b) => b.x > 0 && b.x < window.innerWidth && b.y > 0 && b.y < window.innerHeight)
      );

      animationFrame.current = requestAnimationFrame(move);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = () => {
      const currentPlayer = Object.values(players).find(p => p.username === username);
      if (!currentPlayer) return;

      const dx = mousePos.current.x - currentPlayer.x;
      const dy = mousePos.current.y - currentPlayer.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const speed = 6;

      const vx = (dx / len) * speed;
      const vy = (dy / len) * speed;

      socket.emit("bulletFired", {
        x: currentPlayer.x,
        y: currentPlayer.y,
        vx,
        vy,
      }
    );

    // console.log("🚀 Bullet abgeschickt:", {
    //   x: currentPlayer.x,
    //   y: currentPlayer.y,
    //   vx,
    //   vy,
    // });
      

      // const newBullet: Bullet = {
      //   id: crypto.randomUUID(),
      //   x: currentPlayer.x,
      //   y: currentPlayer.y,
      //   vx,
      //   vy,
      // };

      // setBullets((prev) => [...prev, newBullet]);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    animationFrame.current = requestAnimationFrame(move);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrame.current);
    };
  }, [players, username]);

  useEffect(() => {
    socket.on("bulletSpawned", (bullet: Bullet) => {
      setBullets((prev) => [...prev, bullet]);
    });
  
    return () => {
      socket.off("bulletSpawned");
    };
  }, []);

  const [ping, setPing] = useState<number | null>(null);

useEffect(() => {
  let interval: number;

  const measurePing = () => {
    const start = Date.now();
    socket.emit('pingTest', () => {
      const duration = Date.now() - start;
      setPing(duration);
    });
  };

  interval = window.setInterval(measurePing, 2000); // alle 2s messen

  return () => clearInterval(interval);
}, []);

  
  

return (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      background: '#222',
    }}
  >
    {/* Spieler-Render */}
    {Object.entries(players).map(([socketId, player]) => (
      <div
        key={socketId}
        style={{
          position: 'absolute',
          left: player.x,
          top: player.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Name über dem Kopf */}
        <div
          style={{
            color: 'white',
            fontSize: '0.7rem',
            textAlign: 'center',
            marginBottom: 4,
          }}
        >
          {player.username}
        </div>

        {/* Spielfigur */}
        <div
          style={{
            width: '40px',
            height: '40px',
            background: player.username === username ? 'blue' : 'red',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.8rem',
          }}
        />

        {/* Lebensbalken */}
        <div
          style={{
            marginTop: 6,
            width: 40,
            height: 6,
            backgroundColor: '#444',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${player.health ?? 100}%`,
              height: '100%',
              backgroundColor:
                (player.health ?? 100) > 50
                  ? 'limegreen'
                  : (player.health ?? 100) > 20
                  ? 'orange'
                  : 'red',
              transition: 'width 0.1s ease-in-out',
            }}
          />
        </div>
      </div>
    ))}

    {/* Bullets */}
    {bullets.map((b) => (
      <div
        key={b.id}
        style={{
          position: 'absolute',
          left: b.x,
          top: b.y,
          width: '10px',
          height: '10px',
          backgroundColor: 'yellow',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    ))}

    {/* Spieler-Übersicht bei gedrücktem Tab */}
    {showPlayerList && (
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '10px',
          zIndex: 9999,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.6)',
          minWidth: '250px',
          textAlign: 'center',
          fontSize: '0.9rem',
        }}
      >
        <strong>Spieler online:</strong>
        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0 0' }}>
          {Object.values(players).map((player) => (
            <li key={player.username}>{player.username}</li>
          ))}
        </ul>

        <div style={{ marginTop: '10px', fontSize: '0.8rem', opacity: 0.9 }}>
          Ping: {ping !== null ? `${ping} ms` : '–'}
        </div>
      </div>
    )}
  </div>
);

  
};

export default GameView;
