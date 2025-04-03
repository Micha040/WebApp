import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';

type Player = {
  x: number;
  y: number;
  username: string;
};

const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  transports: ['websocket'],
});

const GameView: React.FC = () => {
  const { id } = useParams();
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [username, setUsername] = useState<string>('');

  console.log(id)

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animationFrame = useRef<number>(0);

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

  // Key-Events + Bewegung per Loop
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

      animationFrame.current = requestAnimationFrame(move);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    animationFrame.current = requestAnimationFrame(move);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrame.current);
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
          {/* Spielername über dem Kreis */}
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
          >
            {/* Optional Inhalt im Kreis */}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GameView;
