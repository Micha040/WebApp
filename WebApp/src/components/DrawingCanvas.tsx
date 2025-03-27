import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

type DrawingCanvasProps = {
  lobbyId: string;
  username: string;
};

type Stroke = {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  username: string;
};

export default function DrawingCanvas({ lobbyId, username }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#4a90e2");
  const [size, setSize] = useState(4);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;
    }

    fetchExistingStrokes();
    const channel = supabase
      .channel("realtime-drawings")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "drawings",
        filter: `lobby_id=eq.${lobbyId}`,
      }, (payload) => {
        const raw = payload.new;
        const stroke: Stroke = {
            id: raw.id,
            x: raw.x,
            y: raw.y,
            color: raw.color,
            size: raw.size,
            username: raw.username,
        };

        drawDot(stroke);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const fetchExistingStrokes = async () => {
    const { data, error } = await supabase
      .from("drawings")
      .select("*")
      .eq("lobby_id", lobbyId)
      .order("created_at", { ascending: true });

    if (data) {
        data.forEach((raw: any) => {
            const stroke: Stroke = {
              id: raw.id,
              x: raw.x,
              y: raw.y,
              color: raw.color,
              size: raw.size,
              username: raw.username,
            };
            drawDot(stroke);
          });
          
    } else {
      console.error("Fehler beim Laden der Zeichnung:", error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    handleDraw(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleDraw = async (e: React.MouseEvent) => {
    if (!isDrawing || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const stroke: Omit<Stroke, "id"> = {
      x,
      y,
      color,
      size,
      username,
    };

    await supabase.from("drawings").insert({
      ...stroke,
      lobby_id: lobbyId,
    });
  };

  const drawDot = (stroke: Stroke) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(stroke.x, stroke.y, stroke.size, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", backgroundColor: "#1a1a1a", borderRadius: "8px", cursor: "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleDraw}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: "0.5rem" }}>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input
          type="range"
          min={1}
          max={10}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
