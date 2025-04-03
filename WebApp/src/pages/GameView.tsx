import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';

type Player = {
  x: number;
  y: number;
  username: string;
};

type Bullet = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  transports: ['websocket'],
});

const GameView: React.FC = () => {
  const { id } = useParams();
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [username, setUsername] = useState<string>('');

  console.log(id)

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animationFrame = useRef<number>(0);
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
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
      });
      

      const newBullet: Bullet = {
        id: crypto.randomUUID(),
        x: currentPlayer.x,
        y: currentPlayer.y,
        vx,
        vy,
      };

      setBullets((prev) => [...prev, newBullet]);
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
    </div>
  );
};

export default GameView;
