import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

type Player = {
  x: number;
  y: number;
  username: string;
  lastInput?: string;
};

export default function GameView() {
  const { id } = useParams();
  const [players, setPlayers] = useState<Record<string, Player>>({});

  useEffect(() => {
    const username = localStorage.getItem("username") || "Spieler";

    socket.emit("join", { username });

    socket.on("playersUpdate", (data: Record<string, Player>) => {
      setPlayers(data);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      const directionMap: Record<string, string> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };

      const direction = directionMap[e.key];
      if (direction) {
        socket.emit("move", direction);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      socket.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#121212",
        overflow: "hidden",
      }}
    >
      {Object.entries(players).map(([id, player]) => (
        <div
          key={id}
          style={{
            position: "absolute",
            left: player.x,
            top: player.y,
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#fff",
              fontSize: "12px",
              marginBottom: "4px",
            }}
          >
            {player.username}
          </div>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: "cyan",
              border: "1px solid #fff",
            }}
          />
          <div
            style={{
              color: "#aaa",
              fontSize: "10px",
              marginTop: "2px",
            }}
          >
            {player.lastInput || "-"}
          </div>
        </div>
      ))}
    </div>
  );
}
