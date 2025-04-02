
// GameView.tsx
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';

type Player = {
  x: number;
  y: number;
  username: string;
};

const socket = io("http://localhost:3000");

const GameView: React.FC = () => {
  const { id } = useParams(); // Lobby-ID, falls benötigt
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [username, setUsername] = useState<string>("");

  // Hole den Usernamen (z. B. aus dem localStorage)
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      // Sende "join", damit der Server den Spieler registriert
      socket.emit("join", { username: storedUsername });
      console.log(id)
    }
  }, []);

  //.
  // Empfange Updates der Spielerpositionen vom Server
  useEffect(() => {
    socket.on("playersUpdate", (data: Record<string, Player>) => {
      setPlayers(data);
    });

    return () => {
      socket.off("playersUpdate");
    };
  }, []);

  // WASD-Tasten abfangen und "move" Event senden
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let direction = "";
      switch (e.key.toLowerCase()) {
        case "w":
          direction = "up";
          break;
        case "a":
          direction = "left";
          break;
        case "s":
          direction = "down";
          break;
        case "d":
          direction = "right";
          break;
        default:
          return;
      }
      socket.emit("move", direction);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#222' }}>
      {Object.keys(players).map((socketId) => {
        const player = players[socketId];
        return (
          <div
            key={socketId}
            style={{
              position: 'absolute',
              left: player.x,
              top: player.y,
              width: '40px',
              height: '40px',
              background: player.username === username ? 'blue' : 'red',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '0.8rem'
            }}
          >
            {player.username}
          </div>
        );
      })}
    </div>
  );
};

export default GameView;
