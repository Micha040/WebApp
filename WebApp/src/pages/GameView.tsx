import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log("✅ Socket verbunden:", socket.id);
  });

type Player = {
  x: number;
  y: number;
  username: string;
  lastInput?: string;
};

type GameViewProps = {
    username: string;
  };
  
  

  export default function GameView({ username }: GameViewProps) {
  const { id } = useParams();
  const [players, setPlayers] = useState<Record<string, Player>>({});


  console.log("👋 username aus localStorage:", username);
    
    console.log("📤 join gesendet mit:", { username });

    useEffect(() => {
        const finalUsername = username || localStorage.getItem("username") || "Spieler";
      
        socket.on("connect", () => {
          console.log("✅ Socket verbunden:", socket.id);
          socket.emit("join", { username });
          socket.emit("join", { username: finalUsername });
        });
      
        const handlePlayersUpdate = (data: Record<string, Player>) => {
          console.log("📦 Spieler empfangen:", data);
          setPlayers(data);
        };
      
        //socket.on("playersUpdate", handlePlayersUpdate);
      
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
          // 🧹 Wichtig: Cleanup!
          socket.off("playersUpdate", handlePlayersUpdate);
          window.removeEventListener("keydown", handleKeyDown);
          socket.disconnect();
        };
      }, []); // <-- nur einmal ausführen!
      
      

  useEffect(() => {
    const handlePlayersUpdate = (data: Record<string, Player>) => {
      console.log("📦 Spieler empfangen:", data);
      setPlayers(data);
    };
  
    socket.on("playersUpdate", handlePlayersUpdate);
  
    return () => {
      socket.off("playersUpdate", handlePlayersUpdate);
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
