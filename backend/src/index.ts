import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? [
          "https://web-app-red-nine.vercel.app",
          "https://webapp-8ehj.onrender.com",
        ]
      : "http://localhost:5173",
  methods: ["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["set-cookie"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Füge einen OPTIONS-Handler für den Preflight-Request hinzu
app.options("*", cors(corsOptions));

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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

let mapData: TiledMap | null = null;
try {
  const mapPath = path.join(__dirname, "../public/map.json");
  console.log("Versuche Map zu laden von:", mapPath);
  if (fs.existsSync(mapPath)) {
    const rawData = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
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
      layers: [
        {
          name: "ChestSpawns",
          type: "objectgroup",
          objects: [
            { id: 1, x: 100, y: 100, width: 32, height: 32 },
            { id: 2, x: 200, y: 200, width: 32, height: 32 },
            { id: 3, x: 300, y: 300, width: 32, height: 32 },
          ],
          width: 30,
          height: 30,
        },
      ],
      tilewidth: 32,
      tileheight: 32,
      width: 30,
      height: 30,
    };
  }
} catch (error) {
  console.error("Fehler beim Laden der Map:", error);
  mapData = {
    layers: [
      {
        name: "ChestSpawns",
        type: "objectgroup",
        objects: [
          { id: 1, x: 100, y: 100, width: 32, height: 32 },
          { id: 2, x: 200, y: 200, width: 32, height: 32 },
          { id: 3, x: 300, y: 300, width: 32, height: 32 },
        ],
        width: 30,
        height: 30,
      },
    ],
    tilewidth: 32,
    tileheight: 32,
    width: 30,
    height: 30,
  };
}

function checkCollision(x: number, y: number): boolean {
  if (!mapData) return false;

  const solidLayer = mapData.layers.find((layer) => layer.name === "Solid");
  if (!solidLayer || !solidLayer.data) return false;

  const tileX = Math.floor(x / mapData.tilewidth);
  const tileY = Math.floor(y / mapData.tileheight);

  if (
    tileX < 0 ||
    tileX >= solidLayer.width ||
    tileY < 0 ||
    tileY >= solidLayer.height
  ) {
    return true;
  }

  const tileIndex = tileY * solidLayer.width + tileX;
  return solidLayer.data[tileIndex] !== 0;
}

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

const spawnPoints = mapData ? getChestSpawnPoints(mapData) : [];
const playerSpawnPoints = mapData ? getPlayerSpawnPoints(mapData) : [];
console.log("Finale Spawn-Punkte:", spawnPoints);
console.log("Finale Spieler-Spawn-Punkte:", playerSpawnPoints);

let chests: Chest[] = spawnPoints.map((point, index) => ({
  id: `chest-${index + 1}`,
  x: point.x,
  y: point.y,
  opened: false,
  items: [],
}));

console.log("Initialisierte Truhen:", chests);

// Erweitere Request-Typ
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

// Middleware für geschützte Routen
const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      username: string;
    };
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Ungültiger Token" });
  }
};

// Funktion für konsistente Cookie-Einstellungen
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("none" as const)
      : ("lax" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Tage
  path: "/",
  domain: undefined, // Entferne die domain-Einschränkung
});

// Auth Endpoints
app.post("/auth/register", async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res
      .status(400)
      .json({ error: "Alle Felder müssen ausgefüllt sein" });
  }

  try {
    // Prüfe ob E-Mail oder Username bereits existieren
    const { data: existingUser } = await supabase
      .from("users")
      .select()
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "E-Mail oder Username bereits vergeben" });
    }

    // Hash das Passwort
    const hashedPassword = await bcrypt.hash(password, 10);

    // Erstelle neuen Benutzer
    const { data: newUser, error } = await supabase
      .from("users")
      .insert([
        {
          id: randomUUID(),
          email,
          username,
          password_hash: hashedPassword,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Erstelle JWT Token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, username: newUser.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Setze Cookie mit den neuen Optionen
    res.cookie("token", token, getCookieOptions());

    // Sende Benutzerinfos zurück (ohne Passwort)
    const { password_hash, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    console.error("Registrierungsfehler:", err);
    res.status(500).json({ error: "Fehler bei der Registrierung" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "E-Mail und Passwort sind erforderlich" });
  }

  try {
    // Finde Benutzer
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }

    // Überprüfe Passwort
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }

    // Aktualisiere last_login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    // Erstelle JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Setze Cookie mit den neuen Optionen
    res.cookie("token", token, getCookieOptions());

    // Sende Benutzerinfos zurück (ohne Passwort)
    const { password_hash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error("Login-Fehler:", err);
    res.status(500).json({ error: "Fehler beim Login" });
  }
});

app.post("/auth/logout", (_req, res) => {
  res.clearCookie("token", getCookieOptions());
  res.json({ message: "Erfolgreich ausgeloggt" });
});

app.get("/auth/me", authenticateToken, (req: AuthRequest, res: Response) => {
  res.json(req.user);
});

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

  const { error: lobbyError } = await supabase.from("lobbys").insert([
    {
      id: lobbyId,
      host: username,
      name,
      password,
      has_password: password ? true : false,
    },
  ]);

  if (lobbyError) {
    console.error("Supabase-Fehler (Lobby erstellen):", lobbyError);
    return res.status(500).json({ error: lobbyError.message });
  }

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

app.post("/lobby/join", async (req, res) => {
  const { username, lobbyId, password } = req.body;

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbys")
    .select("id, password, max_players")
    .eq("id", lobbyId)
    .single();

  if (lobbyError || !lobby) {
    return res.status(404).json({ error: "Lobby nicht gefunden" });
  }

  if (lobby.password && lobby.password !== password) {
    return res.status(401).json({ error: "Falsches Passwort" });
  }

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

  const { data: insertedPlayer, error: insertError } = await supabase
    .from("players")
    .insert([{ username, lobby_id: lobbyId }])
    .select("id")
    .single();

  if (insertError) {
    return res.status(500).json({ error: "Fehler beim Beitritt zur Lobby" });
  }

  const playerId = insertedPlayer.id;

  const { data: existingSkin, error: skinCheckError } = await supabase
    .from("skins")
    .select("id")
    .eq("player_id", playerId)
    .maybeSingle();

  if (skinCheckError) {
    console.error("Fehler beim Skin-Check:", skinCheckError.message);
  }

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
    }
  }

  await updateLobbyActivity(lobbyId);
  res.status(200).json({ message: "Beigetreten" });
});

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

  const { data: remainingPlayers, error: countError } = await supabase
    .from("players")
    .select("*")
    .eq("lobby_id", id);

  if (countError) {
    console.error("Fehler beim Zählen der verbleibenden Spieler:", countError);
    return res.status(500).json({ error: "Fehler beim Zählen der Spieler" });
  }

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

app.get("/lobbys", async (_req, res) => {
  const { data, error } = await supabase
    .from("lobbys")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

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

  const { error } = await supabase
    .from("players")
    .delete()
    .match({ lobby_id: lobbyId, username });

  if (error) {
    return res.status(500).json(error);
  }

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

  await supabase.channel(`lobby-${lobbyId}`).send({
    type: "broadcast",
    event: "game-started",
    payload: { message: "Das Spiel wurde gestartet", lobbyId },
  });

  io.emit("chestsUpdate", chests);
  console.log("Kisten beim Spielstart gesendet:", chests);

  res
    .status(200)
    .json({ message: "Spiel wurde gestartet und Skin gespeichert" });
});

const connectedPlayers: Record<
  string,
  {
    x: number;
    y: number;
    username: string;
    userId: string | undefined;
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
  socket.emit("chestsUpdate", chests);
  console.log("Kisten bei Verbindung gesendet:", chests);

  socket.onAny((event, ...args) => {});

  socket.on("join", async (data) => {
    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("username", data.username)
      .single();

    if (playerError) {
      console.error("Fehler beim Laden des Spielers:", playerError);
      return;
    }

    // Hole die User-ID des Spielers
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("username", data.username)
      .single();

    if (userError) {
      console.error("Fehler beim Laden der User-ID:", userError);
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
      userId: userData?.id,
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

    const newX = player.x + dx * speed;
    const newY = player.y + dy * speed;

    if (!checkCollision(newX, newY)) {
      player.x = newX;
      player.y = newY;
      io.emit("playersUpdate", connectedPlayers);
    }
  });

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
    cb();
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
      chest.items = generateRandomItems();

      io.emit("chestsUpdate", chests);

      if (chest.items.length > 0) {
        const itemsWithPositions = chest.items.map((item) => {
          const position = calculateItemPosition(chest.x, chest.y);
          return { item, position };
        });

        io.emit("itemsSpawned", itemsWithPositions);
      }

      console.log(
        `${player.username} hat Truhe ${chest.id} geöffnet und ${chest.items.length} Items gefunden`
      );
    }
  });

  socket.on("itemPickedUp", (itemId: string) => {
    io.emit("itemRemoved", itemId);
  });

  socket.on("itemDropped", (data: { item: Item; x: number; y: number }) => {
    io.emit("itemDropped", data);
  });

  socket.on("requestChests", () => {
    socket.emit("chestsUpdate", chests);
    console.log("Kisten auf Anfrage gesendet:", chests);
  });
});

setInterval(() => {
  Object.entries(connectedPlayers).forEach(([socketId, player]) => {
    if (player.health <= 0 && player.isAlive) {
      connectedPlayers[socketId].isAlive = false;

      io.emit("playerDied", { socketId, username: player.username });
    }
  });

  const alivePlayers = Object.values(connectedPlayers).filter(
    (player) => player.isAlive
  );
  if (alivePlayers.length === 1 && Object.values(connectedPlayers).length > 1) {
    const winner = alivePlayers[0];

    const finalGameState = Object.entries(connectedPlayers).map(
      ([socketId, player]) => ({
        username: player.username,
        id: player.userId,
        isAlive: player.isAlive,
      })
    );

    io.emit("gameOver", {
      winner: {
        ...winner,
        id: winner.userId,
      },
      finalGameState,
      settings: {
        difficulty: "normal",
        roundTime: 0,
        maxPlayers: Object.keys(connectedPlayers).length,
        allowHints: false,
      },
    });

    io.emit("navigateToGameOver", {
      winner: {
        ...winner,
        id: winner.userId,
      },
      finalGameState,
      settings: {
        difficulty: "normal",
        roundTime: 0,
        maxPlayers: Object.keys(connectedPlayers).length,
        allowHints: false,
      },
      isGameFinished: true,
    });

    chests.forEach((chest) => {
      chest.opened = false;
    });

    io.emit("chestsUpdate", chests);

    Object.values(connectedPlayers).forEach((player) => {
      player.health = 100;
      player.isAlive = true;
      player.shield = undefined;
      player.speedBoost = undefined;
      player.damageBoost = undefined;
    });
  }

  io.emit("playersUpdate", connectedPlayers);
}, 1000);

setInterval(() => {
  const now = Date.now();
  let bulletsUpdated = false;

  for (let i = bullets.length - 1; i >= 0; i--) {
    if (now - bullets[i].createdAt > 5000) {
      bullets.splice(i, 1);
      bulletsUpdated = true;
      continue;
    }

    bullets[i].x += bullets[i].vx;
    bullets[i].y += bullets[i].vy;

    if (checkCollision(bullets[i].x, bullets[i].y)) {
      bullets.splice(i, 1);
      bulletsUpdated = true;
      continue;
    }

    const playerRadius = 20;
    const bulletRadius = 5;
    const collisionDistance = playerRadius + bulletRadius;

    for (const [socketId, player] of Object.entries(connectedPlayers)) {
      if (bullets[i].ownerId === socketId) continue;

      if (!player.isAlive) continue;

      const dx = player.x - bullets[i].x;
      const dy = player.y - bullets[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < collisionDistance) {
        let damage = 2;

        const shooter = connectedPlayers[bullets[i].ownerId];
        if (shooter && shooter.damageBoost) {
          damage *= 1 + shooter.damageBoost / 100;
        }

        if (player.shield) {
          const blockedDamage = Math.min(damage, player.shield);
          damage -= blockedDamage;
          player.shield -= blockedDamage;

          if (player.shield <= 0) {
            delete player.shield;
          }
        }

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

function generateRandomItems(): Item[] {
  const itemCount = Math.random() < 0.5 ? 1 : 2;
  const items: Item[] = [];

  const availableItems = [...possibleItems];

  for (let i = 0; i < itemCount; i++) {
    if (availableItems.length === 0) break;

    const randomIndex = Math.floor(Math.random() * availableItems.length);
    const selectedItem = availableItems[randomIndex];

    items.push({
      ...selectedItem,
      id: `${selectedItem.id}-${crypto.randomUUID()}`,
    });

    availableItems.splice(randomIndex, 1);
  }

  return items;
}

function calculateItemPosition(
  chestX: number,
  chestY: number
): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;

  const force = 30 + Math.random() * 30;

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
httpServer.listen(PORT, () => {
  console.log(`Server + WebSocket läuft auf http://localhost:${PORT}`);
});

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

async function updateLobbyActivity(lobbyId: string) {
  const { error } = await supabase
    .from("lobbys")
    .update({ last_activity: new Date().toISOString() })
    .eq("id", lobbyId);

  if (error) {
    console.error("Fehler beim Aktualisieren der Lobby-Aktivität:", error);
  }
}

setInterval(cleanupInactiveLobbies, 30000);

async function saveChests() {
  try {
    await supabase.from("chests").upsert(
      chests.map((chest) => ({
        id: chest.id,
        x: chest.x,
        y: chest.y,
        opened: chest.opened,
        items: chest.items,
      }))
    );
  } catch (error) {
    console.error("Fehler beim Speichern der Truhen:", error);
  }
}

async function loadChests() {
  try {
    const { data, error } = await supabase.from("chests").select("*");

    if (error) throw error;

    if (data && data.length > 0) {
      chests = data.map((chest) => ({
        id: chest.id,
        x: chest.x,
        y: chest.y,
        opened: chest.opened,
        items: chest.items || [],
      }));
    }
  } catch (error) {
    console.error("Fehler beim Laden der Truhen:", error);
  }
}

loadChests();

setInterval(saveChests, 30000);

// Profil bearbeiten
app.patch("/auth/profile", authenticateToken, async (req: AuthRequest, res) => {
  const { username, email, currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }

  try {
    // Hole den aktuellen Benutzer
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    // Wenn ein neues Passwort gesetzt werden soll
    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ error: "Aktuelles Passwort ist erforderlich" });
      }

      // Überprüfe das aktuelle Passwort
      const validPassword = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );
      if (!validPassword) {
        return res.status(401).json({ error: "Aktuelles Passwort ist falsch" });
      }

      // Hash das neue Passwort
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password_hash = hashedPassword;
    }

    // Prüfe ob E-Mail oder Username bereits existieren
    if (email !== user.email || username !== user.username) {
      const { data: existingUser } = await supabase
        .from("users")
        .select()
        .or(`email.eq.${email},username.eq.${username}`)
        .neq("id", userId)
        .single();

      if (existingUser) {
        return res
          .status(400)
          .json({ error: "E-Mail oder Username bereits vergeben" });
      }
    }

    // Aktualisiere den Benutzer
    const { error: updateError } = await supabase
      .from("users")
      .update({
        username: username || user.username,
        email: email || user.email,
        password_hash: user.password_hash,
      })
      .eq("id", userId);

    if (updateError) {
      throw updateError;
    }

    // Erstelle neuen JWT Token
    const token = jwt.sign(
      {
        id: userId,
        email: email || user.email,
        username: username || user.username,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Setze Cookie mit den neuen Optionen
    res.cookie("token", token, getCookieOptions());

    res.json({
      id: userId,
      email: email || user.email,
      username: username || user.username,
    });
  } catch (err) {
    console.error("Fehler beim Aktualisieren des Profils:", err);
    res.status(500).json({ error: "Fehler beim Aktualisieren des Profils" });
  }
});

// Spielhistorie speichern
app.post("/games/save", authenticateToken, async (req: AuthRequest, res) => {
  const gameData = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }

  try {
    console.log("Empfangene Spieldaten:", gameData);
    console.log("User ID:", userId);

    const { error } = await supabase.from("game_history").insert([
      {
        ...gameData,
        game_date: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Supabase Fehler:", error);
      throw error;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Fehler beim Speichern des Spiels:", err);
    res.status(500).json({ error: "Fehler beim Speichern des Spiels" });
  }
});

// Spielhistorie abrufen
app.get(
  "/games/history",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      const { data, error } = await supabase
        .from("game_history")
        .select("*")
        .or(`winner_id.eq.${userId},players->any->>'id'.eq.${userId}`)
        .order("game_date", { ascending: false });

      if (error) throw error;

      res.json(data);
    } catch (err) {
      console.error("Fehler beim Laden der Spielhistorie:", err);
      res.status(500).json({ error: "Fehler beim Laden der Spielhistorie" });
    }
  }
);
