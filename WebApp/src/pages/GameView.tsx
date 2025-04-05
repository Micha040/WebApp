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

type Chest = {
  id: string;
  x: number;
  y: number;
  opened: boolean;
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
  const [chests, setChests] = useState<Chest[]>([
    { id: 'chest-1', x: 300, y: 300, opened: false },
    { id: 'chest-2', x: 600, y: 400, opened: false },
  ]);
  const [nearChestId, setNearChestId] = useState<string | null>(null);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animationFrame = useRef<number>(0);
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [ping, setPing] = useState<number | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      socket.emit('join', { username: storedUsername });
    }
  }, []);

  useEffect(() => {
    socket.on('playersUpdate', (data: Record<string, Player>) => {
      console.log("🔁 Spieler-Update empfangen:", data);
      setPlayers(data);
    });
    return () => {
      socket.off('playersUpdate');
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.key === 'Tab') {
        e.preventDefault();
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

      socket.on('chestsUpdate', (updatedChests: Chest[]) => {
        setChests(updatedChests);
      });
      

      setBullets((prev) =>
        prev
          .map((b) => ({ ...b, x: b.x + b.vx, y: b.y + b.vy }))
          .filter((b) => b.x > 0 && b.x < window.innerWidth && b.y > 0 && b.y < window.innerHeight)
      );

      // ✅ Chest-Nähe prüfen
      const currentPlayer = Object.values(players).find(p => p.username === username);
      if (currentPlayer) {
        const near = chests.find(
          (chest) =>
            !chest.opened &&
            Math.hypot(chest.x - currentPlayer.x, chest.y - currentPlayer.y) < 50
        );
        setNearChestId(near?.id || null);
      }

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
    };

    const handleChestOpen = () => {
      if (nearChestId) {
        socket.emit("openChest", nearChestId);
        setChests((prev) =>
          prev.map((chest) =>
            chest.id === nearChestId ? { ...chest, opened: true } : chest
          )
        );
        setNearChestId(null);
      }
    };

    // const handleChestOpen = () => {
    //   if (nearChestId) {
    //     socket.emit("openChest", nearChestId); // 🔥 Synchronisiert mit Server
    //     setNearChestId(null);
    //   }
    // };
    

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    // „E“ gedrückt halten zum Öffnen
    const interval = setInterval(() => {
      if (keysPressed.current['e']) {
        handleChestOpen();
      }
    }, 100);

    animationFrame.current = requestAnimationFrame(move);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrame.current);
      clearInterval(interval);
    };
  }, [players, username, chests, nearChestId]);

  useEffect(() => {
    socket.on("bulletSpawned", (bullet: Bullet) => {
      setBullets((prev) => [...prev, bullet]);
    });

    return () => {
      socket.off("bulletSpawned");
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const start = Date.now();
      socket.emit('pingTest', () => {
        const duration = Date.now() - start;
        setPing(duration);
      });
    }, 2000);

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
          {/* Name */}
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

          {/* Kreis */}
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

      {/* Truhen */}
        {chests.filter((c) => !c.opened).map((c) => (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              left: c.x,
              top: c.y,
              width: 30,
              height: 30,
              backgroundColor: 'sienna',
              border: '2px solid #000',
              transform: 'translate(-50%, -50%)',
              borderRadius: 4,
            }}
          />
        ))}


      {/* Hinweis zum Öffnen */}
      {nearChestId && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '1rem',
          }}
        >
          Halte <strong>E</strong> zum Öffnen der Truhe
        </div>
      )}

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
