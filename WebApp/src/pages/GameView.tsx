import { useEffect, useState } from "react";

export default function GameView() {
  const [lastKey, setLastKey] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setLastKey(e.key);
      console.log("🎮 Taste gedrückt:", e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div style={{ color: "white", padding: "2rem" }}>
      <h2>🎮 Game läuft</h2>
      <p>Letzte gedrückte Taste: {lastKey}</p>
    </div>
  );
}
