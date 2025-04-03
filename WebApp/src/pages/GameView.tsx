// GameView.tsx
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";

type Player = {
  x: number;
  y: number;
  username: string;
};

const socket = io(`${import.meta.env.VITE_API_URL}`, {
  withCredentials: true,
  transports: ["websocket"],
});

const GameView: React.FC = () => {
  const { id } = useParams();
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [username, setUsername] = useState<string>("");

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animationRef = useRef<number>(0);

  console.log(id)

  // Hole Username
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      socket.emit("join", { username: storedUsername });
    }
  }, []);

  // Empfange Spieler-Updates
  useEffect(() => {
    const handleUpdate = (data: Record<string, Player>) => {
      setPlayers(data);
    };
  
    socket.on("playersUpdate", handleUpdate);
  
    return () => {
      socket.off("playersUpdate", handleUpdate);
    };
  }, []);
  

  // Tastendruck registrieren
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Bewegung loop
  useEffect(() => {
    const moveLoop = () => {
      let direction = "";

      const { w, a, s, d } = {
        w: keysPressed.current["w"],
        a: keysPressed.current["a"],
        s: keysPressed.current["s"],
        d: keysPressed.current["d"],
      };

      if (w) direction += "up";
      if (s) direction += "down";
      if (a) direction += "left";
      if (d) direction += "right";

      if (direction !== "") {
        socket.emit("move", direction);
      }

      animationRef.current = requestAnimationFrame(moveLoop);
    };

    animationRef.current = requestAnimationFrame(moveLoop);
    return () => cancelAnimationFrame(animationRef.current!);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#222",
      }}
    >
      {Object.keys(players).map((socketId) => {
        const player = players[socketId];
        const isMe = player.username === username;

        return (
          <div
            key={socketId}
            style={{
              position: "absolute",
              left: player.x,
              top: player.y,
              transform: "translate(-50%, -50%)",
              textAlign: "center",
            }}
          >
            {/* Name über dem Kopf */}
            <div
              style={{
                color: "white",
                marginBottom: "4px",
                fontSize: "0.75rem",
              }}
            >
              {player.username}
            </div>

            {/* Spielerball */}
            <div
              style={{
                width: "40px",
                height: "40px",
                background: isMe ? "blue" : "red",
                borderRadius: "50%",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default GameView;
