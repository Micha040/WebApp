import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();

const corsOptions = {
  origin: ["https://web-app-red-nine.vercel.app"],
  methods: ["GET", "POST", "DELETE", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Map-Typen definieren
interface MapLayer {
  data: number[];
  width: number;
  height: number;
  name: string;
}

interface MapData {
  layers: MapLayer[];
  tilewidth: number;
  tileheight: number;
  width: number;
  height: number;
}

interface TiledObject {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  type?: string;
}

interface TiledLayer {
  name: string;
  type: string;
  objects?: TiledObject[];
  data?: number[];
  width: number;
  height: number;
}

interface TiledMap {
  layers: TiledLayer[];
  tilewidth: number;
  tileheight: number;
  width: number;
  height: number;
}

// Lade die Map-Daten
let mapData: TiledMap | null = null;
try {
  const mapPath = path.join(__dirname, "../public/map.json");
  console.log("Versuche Map zu laden von:", mapPath);
  if (fs.existsSync(mapPath)) {
    const rawData = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
    // Stelle sicher, dass die Daten dem TiledMap-Format entsprechen
    mapData = {
      layers: rawData.layers.map((layer: any) => ({
        name: layer.name,
        type: layer.type || "tilelayer",
        objects: layer.objects,
        data: layer.data,
        width: layer.width,
        height: layer.height,
      })),
      tilewidth: rawData.tilewidth,
      tileheight: rawData.tileheight,
      width: rawData.width,
      height: rawData.height,
    };
    console.log("Map erfolgreich geladen");
  } else {
    console.error("Map-Datei nicht gefunden:", mapPath);
    mapData = {
      layers: [],
      tilewidth: 32,
      tileheight: 32,
      width: 30,
      height: 30,
    };
  }
} catch (error) {
  console.error("Fehler beim Laden der Map:", error);
  mapData = {
    layers: [],
    tilewidth: 32,
    tileheight: 32,
    width: 30,
    height: 30,
  };
}

// Hilfsfunktion zur Kollisionsprüfung
function checkCollision(x: number, y: number): boolean {
  if (!mapData) return false;

  const solidLayer = mapData.layers.find((layer) => layer.name === "Solid");
  if (!solidLayer || !solidLayer.data) return false;

  // Konvertiere Weltkoordinaten in Tile-Koordinaten
  const tileX = Math.floor(x / mapData.tilewidth);
  const tileY = Math.floor(y / mapData.tileheight);

  // Prüfe, ob die Position innerhalb der Map liegt
  if (
    tileX < 0 ||
    tileX >= solidLayer.width ||
    tileY < 0 ||
    tileY >= solidLayer.height
  ) {
    return true; // Kollision mit Map-Grenzen
  }

  // Hole den Tile-Index an der Position
  const tileIndex = tileY * solidLayer.width + tileX;
  return solidLayer.data[tileIndex] !== 0; // 0 bedeutet kein Tile
}

// Funktion zum Extrahieren der Spawn-Punkte aus der Map
function getChestSpawnPoints(mapData: TiledMap): { x: number; y: number }[] {
  console.log(
    "Verfügbare Layer:",
    mapData.layers.map((l) => l.name)
  );
  const chestLayer = mapData.layers.find(
    (layer) => layer.name === "ChestSpawns"
  );
  console.log("Gefundener ChestSpawns Layer:", chestLayer);

  if (!chestLayer || !chestLayer.objects) {
    console.log("Keine Spawn-Punkte gefunden!");
    return [];
  }

  console.log("Gefundene Spawn-Punkte:", chestLayer.objects);
  return chestLayer.objects.map((obj) => ({
    x: obj.x,
    y: obj.y,
  }));
}

// Funktion zum Extrahieren der Spieler-Spawn-Punkte aus der Map
function getPlayerSpawnPoints(mapData: TiledMap): { x: number; y: number }[] {
  const playerLayer = mapData.layers.find(
    (layer) => layer.name === "PlayerSpawns"
  );
  console.log("Gefundener PlayerSpawns Layer:", playerLayer);

  if (!playerLayer || !playerLayer.objects) {
    console.log("Keine Spieler-Spawn-Punkte gefunden!");
    return [];
  }

  console.log("Gefundene Spieler-Spawn-Punkte:", playerLayer.objects);
  return playerLayer.objects.map((obj) => ({
    x: obj.x,
    y: obj.y,
  }));
}

// Aktualisiere die Truhen basierend auf den Spawn-Punkten
const spawnPoints = mapData ? getChestSpawnPoints(mapData) : [];
const playerSpawnPoints = mapData ? getPlayerSpawnPoints(mapData) : [];
console.log("Finale Spawn-Punkte:", spawnPoints);
console.log("Finale Spieler-Spawn-Punkte:", playerSpawnPoints);

const chests: Chest[] = spawnPoints.map((point, index) => ({
  id: `chest-${index + 1}`,
  x: point.x,
  y: point.y,
  opened: false,
  items: [],
}));

console.log("Initialisierte Truhen:", chests);

// Lobby erstellen
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
    console.error("Supabase-Fehler (Lobby erstellen):", lobbyError);
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
      "Supabase-Fehler (Host als Spieler hinzufügen):",
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
      ball: "sprite_1",
      eyes: "sprite_1",
      mouth: "sprite_1",
    },
  ]);

  if (skinError) {
    console.error("Supabase-Fehler (Skin erstellen):", skinError);
    return res.status(500).json({ error: skinError.message });
  }

  res.json({ lobbyId });
});

// Lobby beitreten
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
    console.error("Fehler beim Skin-Check:", skinCheckError.message);
    // Fehler loggen, aber Spieler trotzdem reinlassen
  }

  // 6. Wenn kein Skin vorhanden, neuen Standard-Skin einfügen
  if (!existingSkin) {
    const { error: skinInsertError } = await supabase.from("skins").insert([
      {
        player_id: insertedPlayer.id,
        lobby_id: lobbyId,
        top: "none",
        ball: "sprite_1",
        eyes: "sprite_1",
        mouth: "sprite_1",
      },
    ]);

    if (skinInsertError) {
      console.error(
        "Fehler beim Erstellen des Skins:",
        skinInsertError.message
      );
      // ebenfalls nicht blockieren
    }
  }

  await updateLobbyActivity(lobbyId);
  res.status(200).json({ message: "Beigetreten" });
});

// Spieler aus Lobby entfernen
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

  // Prüfe, ob noch Spieler in der Lobby sind
  const { data: remainingPlayers, error: countError } = await supabase
    .from("players")
    .select("*")
    .eq("lobby_id", id);

  if (countError) {
    console.error("Fehler beim Zählen der verbleibenden Spieler:", countError);
    return res.status(500).json({ error: "Fehler beim Zählen der Spieler" });
  }

  // Wenn keine Spieler mehr übrig sind, lösche die Lobby
  if (remainingPlayers.length === 0) {
    const { error: deleteError } = await supabase
      .from("lobbys")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Fehler beim Löschen der Lobby:", deleteError);
      return res.status(500).json({ error: "Fehler beim Löschen der Lobby" });
    }

    console.log(
      `Lobby ${id} wurde automatisch gelöscht, da keine Spieler mehr übrig sind.`
    );
  }

  res.json({ success: true });
});

// Alle offenen Lobbys holen
app.get("/lobbys", async (_req, res) => {
  const { data, error } = await supabase
    .from("lobbys")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// Einzelne Lobby holen
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

// Spieler in Lobby
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

// Nachrichten holen
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

// Nachricht schreiben
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

  await updateLobbyActivity(lobbyId);
  res.json({ success: true });
});

// Zeichnungen empfangen
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

  await updateLobbyActivity(lobbyId);
  res.json({ success: true });
});

// Zeichnungen abrufen
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

  // Realtime-Broadcast an alle Clients in der Lobby
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

  // console.log("Empfangen:", { lobbyId, username });
  // console.log("Skin-Daten empfangen:", JSON.stringify(skin, null, 2));

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("username", username)
    .eq("lobby_id", lobbyId)
    .single();

  if (playerError || !player) {
    console.error("Spieler nicht gefunden:", playerError?.message);
    return res.status(404).json({ error: "Spieler nicht gefunden" });
  }

  const { ball, eyes, mouth, top } = skin;

  const { error: updateError } = await supabase
    .from("skins")
    .update({
      ball: ball.startsWith("sprite_") ? ball : `sprite_${ball}`,
      eyes,
      mouth,
      top,
    })
    .eq("player_id", player.id);

  if (updateError) {
    console.error("Fehler beim Skin-Update:", updateError.message);
    return res
      .status(500)
      .json({ error: "Skin konnte nicht aktualisiert werden" });
  }

  // Spiel in Tabelle eintragen
  const { error: gameError } = await supabase.from("games").insert([
    {
      lobby_id: lobbyId,
      status: "active",
      start_time: new Date().toISOString(),
    },
  ]);

  if (gameError) {
    console.error("Fehler beim Erstellen des Spiels:", gameError.message);
    return res
      .status(500)
      .json({ error: "Spiel konnte nicht gestartet werden" });
  }

  // console.log("Spiel erstellt + Skin gespeichert!");
  await supabase.channel(`lobby-${lobbyId}`).send({
    type: "broadcast",
    event: "game-started",
    payload: { message: "Das Spiel wurde gestartet", lobbyId },
  });

  // Sende die Kisten an alle verbundenen Clients
  io.emit("chestsUpdate", chests);
  console.log("Kisten beim Spielstart gesendet:", chests);

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

// Spielerliste nach socket.id
const connectedPlayers: Record<
  string,
  {
    x: number;
    y: number;
    username: string;
    health: number;
    skin: any;
    shield?: number;
    speedBoost?: number;
    damageBoost?: number;
    isAlive: boolean;
  }
> = {};

type Bullet = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  createdAt: number;
};

const bullets: Bullet[] = [];

io.on("connection", (socket) => {
  // console.log("Neue Socket-Verbindung:", socket.id); // ← ganz oben
  // console.log(`Spieler verbunden: ${socket.id}`);

  // Sende die Kisten sofort bei der Verbindung
  socket.emit("chestsUpdate", chests);
  console.log("Kisten bei Verbindung gesendet:", chests);

  socket.onAny((event, ...args) => {
    // console.log(`[SOCKET EVENT] ${event}`, args);
  });

  socket.on("join", async (data) => {
    // console.log("Spieler gejoint (empfangen):", data.username);

    // Hole Skin-Informationen aus der Datenbank
    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("username", data.username)
      .single();

    if (playerError) {
      console.error("Fehler beim Laden des Spielers:", playerError);
      return;
    }

    const { data: skinData, error: skinError } = await supabase
      .from("skins")
      .select("ball, eyes, mouth, top")
      .eq("player_id", playerData.id)
      .single();

    if (skinError) {
      console.error("Fehler beim Laden des Skins:", skinError);
      return;
    }

    // Wähle einen zufälligen Spawn-Punkt
    const randomSpawnPoint =
      playerSpawnPoints.length > 0
        ? playerSpawnPoints[
            Math.floor(Math.random() * playerSpawnPoints.length)
          ]
        : { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 };

    connectedPlayers[socket.id] = {
      x: randomSpawnPoint.x,
      y: randomSpawnPoint.y,
      username: data.username,
      health: 100,
      skin: skinData,
      isAlive: true,
    };

    io.emit("playersUpdate", connectedPlayers);
  });

  socket.on("move", (directions: string[]) => {
    const player = connectedPlayers[socket.id];
    if (!player || !player.isAlive) return;

    let speed = 4;
    if (player.speedBoost) {
      speed *= 1 + player.speedBoost / 100;
    }

    let dx = 0;
    let dy = 0;

    if (directions.includes("up")) dy -= 1;
    if (directions.includes("down")) dy += 1;
    if (directions.includes("left")) dx -= 1;
    if (directions.includes("right")) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx = dx / length;
      dy = dy / length;
    }

    // Neue Position berechnen
    const newX = player.x + dx * speed;
    const newY = player.y + dy * speed;

    // Kollisionsprüfung
    if (!checkCollision(newX, newY)) {
      player.x = newX;
      player.y = newY;
      io.emit("playersUpdate", connectedPlayers);
    }
  });

  // socket.on("shoot", ({ x, y, dx, dy }) => {
  //   const id = crypto.randomUUID();
  //   const bullet: Bullet = { id, x, y, dx, dy };
  //   bullets.push(bullet);
  //   io.emit("bulletFired", bullet);
  // });

  socket.on("bulletFired", (bulletData) => {
    const player = connectedPlayers[socket.id];
    if (!player || !player.isAlive) return;

    const id = crypto.randomUUID();
    const bullet: Bullet = {
      id,
      x: bulletData.x,
      y: bulletData.y,
      vx: bulletData.vx,
      vy: bulletData.vy,
      ownerId: socket.id,
      createdAt: Date.now(),
    };
    bullets.push(bullet);

    io.emit("bulletSpawned", bullet);
  });

  socket.on(
    "useItem",
    (data: { type: string; value: number; duration?: number }) => {
      const player = connectedPlayers[socket.id];
      if (!player || !player.isAlive) return;

      const now = Date.now();
      const duration = data.duration || 0;

      // Sende den visuellen Effekt an alle Spieler
      io.emit("visualEffect", {
        type: data.type,
        playerId: socket.id,
        endTime: data.type === "heal" ? now + 1000 : now + duration,
      });

      switch (data.type) {
        case "heal":
          player.health = Math.min(100, player.health + data.value);
          console.log(
            `${player.username} hat sich geheilt! +${data.value} HP (neu: ${player.health})`
          );
          break;
        case "shield":
          player.shield = data.value;
          console.log(
            `${player.username} hat einen Schild aktiviert! (${data.value} Schaden blockiert)`
          );
          break;
        case "speed":
          player.speedBoost = data.value;
          console.log(
            `${player.username} hat einen Geschwindigkeitsboost aktiviert! (+${data.value}% Geschwindigkeit)`
          );
          break;
        case "damage":
          player.damageBoost = data.value;
          console.log(
            `${player.username} hat einen Schadensboost aktiviert! (+${data.value}% Schaden)`
          );
          break;
      }

      io.emit("playersUpdate", connectedPlayers);
    }
  );

  socket.on("disconnect", () => {
    delete connectedPlayers[socket.id];
    io.emit("playersUpdate", connectedPlayers);
  });

  socket.on("pingTest", (cb) => {
    cb(); // sofortige Antwort
  });

  socket.on("openChest", (chestId: string) => {
    const player = connectedPlayers[socket.id];
    if (!player || !player.isAlive) return;

    const chest = chests.find((c) => c.id === chestId && !c.opened);
    if (!chest) return;

    const dx = player.x - chest.x;
    const dy = player.y - chest.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 50) {
      chest.opened = true;
      // Generiere zufällige Items für die Truhe
      chest.items = generateRandomItems();

      // Sende sofort ein Update an alle Clients
      io.emit("chestsUpdate", chests);

      // Sende die Items an ALLE Spieler zusammen mit der Truhenposition
      if (chest.items.length > 0) {
        // Berechne für jedes Item eine zufällige Position
        const itemsWithPositions = chest.items.map((item) => {
          const position = calculateItemPosition(chest.x, chest.y);
          return { item, position };
        });

        // Sende die Items sofort
        io.emit("itemsSpawned", itemsWithPositions);
      }

      console.log(
        `${player.username} hat Truhe ${chest.id} geöffnet und ${chest.items.length} Items gefunden`
      );
    }
  });

  socket.on("itemPickedUp", (itemId: string) => {
    // Informiere alle Spieler, dass das Item aufgesammelt wurde
    io.emit("itemRemoved", itemId);
  });

  socket.on("itemDropped", (data: { item: Item; x: number; y: number }) => {
    // Informiere alle Spieler, dass ein neues Item gedroppt wurde
    io.emit("itemDropped", data);
  });
});

// Game Loop für Spieler-Status-Updates
setInterval(() => {
  // Prüfe, ob Spieler gestorben sind
  Object.entries(connectedPlayers).forEach(([socketId, player]) => {
    if (player.health <= 0 && player.isAlive) {
      // Markiere Spieler als nicht mehr am Leben
      connectedPlayers[socketId].isAlive = false;

      // Erstelle eine Kopie des aktuellen Spielerstatus für den Game-Over-Screen
      const currentGameState = Object.entries(connectedPlayers).map(
        ([socketId, player]) => ({
          username: player.username,
          isAlive: player.isAlive,
        })
      );

      // Informiere den gestorbenen Spieler über seinen Tod und den aktuellen Spielstatus
      io.to(socketId).emit("gameOver", {
        winner: null,
        finalGameState: currentGameState,
        isGameFinished: false,
      });
      io.to(socketId).emit("navigateToGameOver", {
        finalGameState: currentGameState,
      });
    }
  });

  // Prüfe, ob nur noch ein Spieler am Leben ist (Spielende)
  const alivePlayers = Object.values(connectedPlayers).filter(
    (player) => player.isAlive
  );
  if (alivePlayers.length === 1 && Object.values(connectedPlayers).length > 1) {
    // Spiel ist vorbei, ein Spieler hat gewonnen
    const winner = alivePlayers[0];

    // Erstelle eine Kopie des finalen Spielerstatus für den Game-Over-Screen
    const finalGameState = Object.entries(connectedPlayers).map(
      ([socketId, player]) => ({
        username: player.username,
        isAlive: player.isAlive,
      })
    );

    // Informiere alle Clients über das Spielende mit dem finalen Status
    io.emit("gameOver", {
      winner,
      finalGameState,
      isGameFinished: true,
    });
    io.emit("navigateToGameOver", {
      winner,
      finalGameState,
      isGameFinished: true,
    });

    // Setze Truhen zurück, damit sie im nächsten Spiel wieder verfügbar sind
    chests.forEach((chest) => {
      chest.opened = false;
    });

    // Informiere alle Clients über die zurückgesetzten Truhen
    io.emit("chestsUpdate", chests);

    // Setze alle Spieler-Status zurück
    Object.values(connectedPlayers).forEach((player) => {
      player.health = 100;
      player.isAlive = true;
      player.shield = undefined;
      player.speedBoost = undefined;
      player.damageBoost = undefined;
    });
  }

  // Sende aktualisierte Spieler-Informationen an alle Clients
  io.emit("playersUpdate", connectedPlayers);
}, 1000);

// Kollisionen prüfen & Leben abziehen
setInterval(() => {
  const now = Date.now();
  let bulletsUpdated = false;

  // Entferne alte Geschosse (älter als 5 Sekunden)
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (now - bullets[i].createdAt > 5000) {
      bullets.splice(i, 1);
      bulletsUpdated = true;
      continue;
    }

    // Aktualisiere Position
    bullets[i].x += bullets[i].vx;
    bullets[i].y += bullets[i].vy;

    // Prüfe Kollision mit Wänden
    if (checkCollision(bullets[i].x, bullets[i].y)) {
      bullets.splice(i, 1);
      bulletsUpdated = true;
      continue;
    }

    // Prüfe Kollision mit Spielern
    const playerRadius = 20;
    const bulletRadius = 5;
    const collisionDistance = playerRadius + bulletRadius;

    for (const [socketId, player] of Object.entries(connectedPlayers)) {
      // Überspringe den Spieler, der die Kugel geschossen hat
      if (bullets[i].ownerId === socketId) continue;

      // Überspringe tote Spieler
      if (!player.isAlive) continue;

      const dx = player.x - bullets[i].x;
      const dy = player.y - bullets[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < collisionDistance) {
        // Basis-Schaden
        let damage = 2;

        // Erhöhe Schaden, wenn Schütze einen Schadensboost hat
        const shooter = connectedPlayers[bullets[i].ownerId];
        if (shooter && shooter.damageBoost) {
          damage *= 1 + shooter.damageBoost / 100;
        }

        // Reduziere Schaden durch Schild
        if (player.shield) {
          const blockedDamage = Math.min(damage, player.shield);
          damage -= blockedDamage;
          player.shield -= blockedDamage;

          if (player.shield <= 0) {
            delete player.shield;
          }
        }

        // Wende finalen Schaden an
        player.health = Math.max(player.health - damage, 0);
        bullets.splice(i, 1);
        bulletsUpdated = true;

        console.log(
          `${player.username} wurde getroffen! ➖ ${damage.toFixed(
            1
          )} HP (neu: ${player.health})`
        );

        io.emit("playersUpdate", connectedPlayers);
        break;
      }
    }
  }

  // Sende aktualisierte Bullets an alle Clients, wenn sich etwas geändert hat
  if (bulletsUpdated) {
    io.emit("bulletsUpdate", bullets);
  }
}, 16);

type Item = {
  id: string;
  name: string;
  type: string;
  effect_value: number;
  description: string;
  icon_url: string;
};

// Liste aller möglichen Items
const possibleItems: Item[] = [
  {
    id: "heal-potion-1",
    name: "Heiltrank",
    type: "heal",
    effect_value: 20,
    description: "Heilt 20 HP",
    icon_url: "/items/heal_potion.png",
  },
  {
    id: "shield-1",
    name: "Schutzschild",
    type: "shield",
    effect_value: 50,
    description: "Blockiert 50 Schaden",
    icon_url: "/items/shield.png",
  },
  {
    id: "speed-boost-1",
    name: "Geschwindigkeitsboost",
    type: "speed",
    effect_value: 30,
    description: "Erhöht Geschwindigkeit um 30%",
    icon_url: "/items/speed_boost.png",
  },
  {
    id: "damage-boost-1",
    name: "Schadensboost",
    type: "damage",
    effect_value: 25,
    description: "Erhöht Schaden um 25%",
    icon_url: "/items/damage_boost.png",
  },
];

// Funktion zum Generieren zufälliger Items
function generateRandomItems(): Item[] {
  // 50/50 Chance für 1 oder 2 Items
  const itemCount = Math.random() < 0.5 ? 1 : 2;
  const items: Item[] = [];

  // Kopiere die möglichen Items, damit wir sie zufällig auswählen können
  const availableItems = [...possibleItems];

  for (let i = 0; i < itemCount; i++) {
    if (availableItems.length === 0) break;

    // Wähle ein zufälliges Item aus
    const randomIndex = Math.floor(Math.random() * availableItems.length);
    const selectedItem = availableItems[randomIndex];

    // Erstelle eine Kopie des Items mit einer neuen ID
    items.push({
      ...selectedItem,
      id: `${selectedItem.id}-${crypto.randomUUID()}`,
    });

    // Entferne das ausgewählte Item aus der verfügbaren Liste
    availableItems.splice(randomIndex, 1);
  }

  return items;
}

// Funktion zum Berechnen der Position eines Items mit zufälliger Kraft
function calculateItemPosition(
  chestX: number,
  chestY: number
): { x: number; y: number } {
  // Zufälliger Winkel im Bogenmaß (0 bis 2π)
  const angle = Math.random() * Math.PI * 2;

  // Zufällige Kraft zwischen 30 und 60
  const force = 30 + Math.random() * 30;

  // Berechne die neue Position basierend auf Winkel und Kraft
  const x = chestX + Math.cos(angle) * force;
  const y = chestY + Math.sin(angle) * force;

  return { x, y };
}

type Chest = {
  id: string;
  x: number;
  y: number;
  opened: boolean;
  items: Item[];
};

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server + WebSocket läuft auf http://localhost:${PORT}`);
});

// Funktion zum Überprüfen und Löschen inaktiver Lobbys
async function cleanupInactiveLobbies() {
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

  const { data: inactiveLobbies, error } = await supabase
    .from("lobbys")
    .select("id")
    .lt("last_activity", oneMinuteAgo);

  if (error) {
    console.error("Fehler beim Abrufen inaktiver Lobbys:", error);
    return;
  }

  for (const lobby of inactiveLobbies || []) {
    const { error: deleteError } = await supabase
      .from("lobbys")
      .delete()
      .eq("id", lobby.id);

    if (deleteError) {
      console.error(`Fehler beim Löschen der Lobby ${lobby.id}:`, deleteError);
    }
  }
}

// Aktualisiere die Lobby-Aktivität
async function updateLobbyActivity(lobbyId: string) {
  const { error } = await supabase
    .from("lobbys")
    .update({ last_activity: new Date().toISOString() })
    .eq("id", lobbyId);

  if (error) {
    console.error("Fehler beim Aktualisieren der Lobby-Aktivität:", error);
  }
}

// Führe die Bereinigung alle 30 Sekunden durch
setInterval(cleanupInactiveLobbies, 30000);
