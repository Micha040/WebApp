import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const corsOptions = {
  origin: ["https://web-app-red-nine.vercel.app"], // 👈 dein Vercel-Frontend
  methods: ["GET", "POST"],
  credentials: true, // 👈 wichtig für WebSocket-Kompatibilität
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// ✅ Lobby erstellen
app.post("/lobby", async (req, res) => {
  const { username, name, password } = req.body;

  if (
    !username ||
    typeof username !== "string" ||
    !name ||
    typeof name !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "Ungültiger Username oder Lobbyname" });
  }

  const lobbyId = randomUUID();

  // 1. Lobby erstellen
  const { error: lobbyError } = await supabase
    .from("lobbys")
    .insert([{ id: lobbyId, host: username, name, password }]);

  if (lobbyError) {
    console.error("❌ Supabase-Fehler (Lobby erstellen):", lobbyError);
    return res.status(500).json({ error: lobbyError.message });
  }

  // 2. Host als Spieler hinzufügen UND direkt ID zurückbekommen
  const { data: insertedPlayer, error: playerInsertError } = await supabase
    .from("players")
    .insert([{ username, lobby_id: lobbyId }])
    .select("id")
    .single();

  if (playerInsertError) {
    console.error(
      "❌ Supabase-Fehler (Host als Spieler hinzufügen):",
      playerInsertError
    );
    return res.status(500).json({ error: playerInsertError.message });
  }

  // 3. Leeren Skin für Host anlegen
  const { error: skinError } = await supabase.from("skins").insert([
    {
      player_id: insertedPlayer.id,
      lobby_id: lobbyId,
      top: "none",
      ball: "RedBall",
      eyes: "Eyes_Standart",
      mouth: "Mouth_Smile",
    },
  ]);

  if (skinError) {
    console.error("❌ Supabase-Fehler (Skin erstellen):", skinError);
    return res.status(500).json({ error: skinError.message });
  }

  res.json({ lobbyId });
});

// ✅ Lobby beitreten
app.post("/lobby/join", async (req, res) => {
  const { username, lobbyId, password } = req.body;

  // 1. Hole die Lobby mit Passwort + max_players
  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbys")
    .select("id, password, max_players")
    .eq("id", lobbyId)
    .single();

  if (lobbyError || !lobby) {
    return res.status(404).json({ error: "Lobby nicht gefunden" });
  }

  // 2. Prüfe Passwort, falls gesetzt
  if (lobby.password && lobby.password !== password) {
    return res.status(401).json({ error: "Falsches Passwort" });
  }

  // 3. Zähle, wie viele Spieler schon in der Lobby sind
  const { count, error: countError } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("lobby_id", lobbyId);

  if (countError) {
    return res.status(500).json({ error: "Fehler beim Zählen der Spieler" });
  }

  if (count !== null && count >= lobby.max_players) {
    return res.status(400).json({ error: "Lobby ist voll" });
  }

  // 4. Füge den Spieler hinzu
  const { data: insertedPlayer, error: insertError } = await supabase
    .from("players")
    .insert([{ username, lobby_id: lobbyId }])
    .select("id") // wir brauchen die id für die Skin-Verknüpfung
    .single();

  if (insertError) {
    return res.status(500).json({ error: "Fehler beim Beitritt zur Lobby" });
  }

  const playerId = insertedPlayer.id;

  // 5. Prüfe, ob bereits ein Skin für diesen Spieler existiert
  const { data: existingSkin, error: skinCheckError } = await supabase
    .from("skins")
    .select("id")
    .eq("player_id", playerId)
    .maybeSingle();

  if (skinCheckError) {
    console.error("❌ Fehler beim Skin-Check:", skinCheckError.message);
    // Fehler loggen, aber Spieler trotzdem reinlassen
  }

  // 6. Wenn kein Skin vorhanden, neuen Standard-Skin einfügen
  if (!existingSkin) {
    const { error: skinInsertError } = await supabase.from("skins").insert([
      {
        player_id: insertedPlayer.id,
        lobby_id: lobbyId,
        top: "none",
        ball: "RedBall",
        eyes: "Eyes_Standart",
        mouth: "Mouth_Smile",
      },
    ]);

    if (skinInsertError) {
      console.error(
        "❌ Fehler beim Erstellen des Skins:",
        skinInsertError.message
      );
      // ebenfalls nicht blockieren
    }
  }

  res.status(200).json({ message: "Beigetreten" });
});

// ✅ Spieler aus Lobby entfernen
app.delete("/lobby/:id/leave/:username", async (req, res) => {
  const { id, username } = req.params;

  const { error } = await supabase
    .from("players")
    .delete()
    .eq("lobby_id", id)
    .eq("username", username);

  if (error) {
    return res
      .status(500)
      .json({ error: "Fehler beim Entfernen des Spielers" });
  }

  // Wenn keine Spieler mehr übrig -> Lobby löschen
  const { data: remainingPlayers } = await supabase
    .from("players")
    .select("*")
    .eq("lobby_id", id);

  if (remainingPlayers?.length === 0) {
    await supabase.from("lobbys").delete().eq("id", id);
  }

  res.json({ success: true });
});

// ✅ Alle offenen Lobbys holen
app.get("/lobbys", async (_req, res) => {
  const { data, error } = await supabase
    .from("lobbys")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// ✅ Einzelne Lobby holen
app.get("/lobbys/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("lobbys")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(404).json({ error: "Lobby nicht gefunden" });

  res.json(data);
});

// ✅ Spieler in Lobby
app.get("/lobbys/:id/players", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("lobby_id", id);

  if (error)
    return res.status(500).json({ error: "Fehler beim Abrufen der Spieler" });

  res.json(data);
});

// ✅ Nachrichten holen
app.get("/messages/:lobbyId", async (req, res) => {
  const { lobbyId } = req.params;

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("lobby_id", lobbyId)
    .order("created_at", { ascending: true });

  if (error)
    return res.status(500).json({ error: "Fehler beim Laden der Nachrichten" });

  res.json(data);
});

// ✅ Nachricht schreiben
app.post("/messages", async (req, res) => {
  const { username, lobbyId, content } = req.body;

  if (!username || !lobbyId || !content) {
    return res.status(400).json({ error: "Ungültige Nachrichtendaten" });
  }

  const { error } = await supabase
    .from("messages")
    .insert([{ username, lobby_id: lobbyId, content }]);

  if (error) {
    return res
      .status(500)
      .json({ error: "Fehler beim Speichern der Nachricht" });
  }

  res.json({ success: true });
});

// ✅ Zeichnungen empfangen
app.post("/drawings", async (req, res) => {
  const { lobbyId, x, y, color, thickness } = req.body;

  if (!lobbyId || x === undefined || y === undefined) {
    return res.status(400).json({ error: "Ungültige Zeichen-Daten" });
  }

  const { error } = await supabase
    .from("drawings")
    .insert([{ lobby_id: lobbyId, x, y, color, thickness }]);

  if (error) {
    return res
      .status(500)
      .json({ error: "Fehler beim Speichern der Zeichnung" });
  }

  res.json({ success: true });
});

// ✅ Zeichnungen abrufen
app.get("/drawings/:lobbyId", async (req, res) => {
  const { lobbyId } = req.params;

  const { data, error } = await supabase
    .from("drawings")
    .select("*")
    .eq("lobby_id", lobbyId)
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({ error: "Fehler beim Laden der Zeichnungen" });
  }

  res.json(data);
});

// PATCH /lobbys/:id/settings
app.patch("/lobbys/:id/settings", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { error } = await supabase.from("lobbys").update(updates).eq("id", id);

  if (error) {
    console.error("Fehler beim Aktualisieren der Lobby-Einstellungen", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

app.delete("/lobby/:lobbyId/kick/:username", async (req, res) => {
  const { lobbyId, username } = req.params;

  // Spieler aus der Datenbank entfernen
  const { error } = await supabase
    .from("players")
    .delete()
    .match({ lobby_id: lobbyId, username });

  if (error) {
    return res.status(500).json(error);
  }

  // 🔴 Realtime-Broadcast an alle Clients in der Lobby
  await supabase.channel(`lobby-${lobbyId}`).send({
    type: "broadcast",
    event: "player-kicked",
    payload: {
      username,
    },
  });

  res.status(200).json({ message: `${username} wurde gekickt` });
});

app.get("/lobby/:lobbyId/host", async (req, res) => {
  const { lobbyId } = req.params;

  const { data, error } = await supabase
    .from("lobbys")
    .select("host")
    .eq("id", lobbyId)
    .single();

  if (error) {
    return res.status(500).json({ error: "Host konnte nicht geladen werden" });
  }

  res.json({ host: data.host });
});

app.post("/lobby/start", async (req, res) => {
  const { lobbyId, username, skin } = req.body;

  console.log("📥 Empfangen:", { lobbyId, username });
  console.log("🔧 Skin-Daten empfangen:", JSON.stringify(skin, null, 2));

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("username", username)
    .eq("lobby_id", lobbyId)
    .single();

  if (playerError || !player) {
    console.error("❌ Spieler nicht gefunden:", playerError?.message);
    return res.status(404).json({ error: "Spieler nicht gefunden" });
  }

  const { ball, eyes, mouth, top } = skin;

  const { error: updateError } = await supabase
    .from("skins")
    .update({ ball, eyes, mouth, top })
    .eq("player_id", player.id);

  if (updateError) {
    console.error("❌ Fehler beim Skin-Update:", updateError.message);
    return res
      .status(500)
      .json({ error: "Skin konnte nicht aktualisiert werden" });
  }

  // ✅ NEU: Spiel in Tabelle eintragen
  const { error: gameError } = await supabase.from("games").insert([
    {
      lobby_id: lobbyId,
      status: "active",
      start_time: new Date().toISOString(),
    },
  ]);

  if (gameError) {
    console.error("❌ Fehler beim Erstellen des Spiels:", gameError.message);
    return res
      .status(500)
      .json({ error: "Spiel konnte nicht gestartet werden" });
  }

  console.log("✅ Spiel erstellt + Skin gespeichert!");
  await supabase.channel(`lobby-${lobbyId}`).send({
    type: "broadcast",
    event: "game-started",
    payload: { message: "Das Spiel wurde gestartet", lobbyId },
  });

  res
    .status(200)
    .json({ message: "Spiel wurde gestartet und Skin gespeichert" });
});

//
//
//
//
//
//
//
//
//

import http from "http";
import { Server } from "socket.io";

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://web-app-red-nine.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Spielerliste nach socket.id
const connectedPlayers: Record<
  string,
  { x: number; y: number; username: string; health: number }
> = {};

type Bullet = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
};

const bullets: Bullet[] = [];

io.on("connection", (socket) => {
  console.log("🟢 Neue Socket-Verbindung:", socket.id); // ← ganz oben
  console.log(`🟢 Spieler verbunden: ${socket.id}`);

  socket.onAny((event, ...args) => {
    console.log(`📡 [SOCKET EVENT] ${event}`, args);
  });

  socket.on("join", (data: { username: string }) => {
    console.log("📡 Spieler gejoint (empfangen):", data.username);
    connectedPlayers[socket.id] = {
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      username: data.username,
      health: 100,
    };
    io.emit("playersUpdate", connectedPlayers);
  });

  socket.on("move", (directions: string[]) => {
    const player = connectedPlayers[socket.id];
    if (!player) return;

    const speed = 4;

    if (directions.includes("up")) player.y -= speed;
    if (directions.includes("down")) player.y += speed;
    if (directions.includes("left")) player.x -= speed;
    if (directions.includes("right")) player.x += speed;

    io.emit("playersUpdate", connectedPlayers);
  });

  // socket.on("shoot", ({ x, y, dx, dy }) => {
  //   const id = crypto.randomUUID();
  //   const bullet: Bullet = { id, x, y, dx, dy };
  //   bullets.push(bullet);
  //   io.emit("bulletFired", bullet);
  // });

  socket.on("bulletFired", (bulletData) => {
    const id = crypto.randomUUID();
    const bullet: Bullet = {
      id,
      x: bulletData.x,
      y: bulletData.y,
      vx: bulletData.vx,
      vy: bulletData.vy,
      ownerId: socket.id,
    };
    bullets.push(bullet);

    io.emit("bulletSpawned", bullet);
  });

  socket.on("disconnect", () => {
    delete connectedPlayers[socket.id];
    io.emit("playersUpdate", connectedPlayers);
  });

  socket.on("pingTest", (cb) => {
    cb(); // sofortige Antwort
  });
});

// Kollisionen prüfen & Leben abziehen
setInterval(() => {
  bullets.forEach((bullet, index) => {
    for (const [socketId, player] of Object.entries(connectedPlayers)) {
      // 👉 Eigene Kugel trifft nicht
      if (bullet.ownerId === socketId) continue;

      const dx = player.x - bullet.x;
      const dy = player.y - bullet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const hit =
        bullet.x > player.x - 20 &&
        bullet.x < player.x + 20 &&
        bullet.y > player.y - 20 &&
        bullet.y < player.y + 20;

      if (hit) {
        player.health = Math.max(player.health - 1, 0);
        bullets.splice(index, 1);
        console.log(
          `💥 ${player.username} wurde getroffen! HP: ${player.health}`
        );
        io.emit("playersUpdate", connectedPlayers);
      }
    }
  });
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server + WebSocket läuft auf http://localhost:${PORT}`);
});
