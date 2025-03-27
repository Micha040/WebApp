import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
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

  const { error: lobbyError } = await supabase
    .from("lobbys")
    .insert([{ id: lobbyId, host: username, name, password }]);

  if (lobbyError) {
    console.error("❌ Supabase-Fehler (Lobby erstellen):", lobbyError);
    return res.status(500).json({ error: lobbyError.message });
  }

  const { error: playerError } = await supabase
    .from("players")
    .insert([{ username, lobby_id: lobbyId }]);

  if (playerError) {
    console.error(
      "❌ Supabase-Fehler (Host als Spieler hinzufügen):",
      playerError
    );
    return res.status(500).json({ error: playerError.message });
  }

  res.json({ lobbyId });
});

// ✅ Lobby beitreten
app.post("/lobby/join", async (req, res) => {
  const { username, lobbyId, password } = req.body;

  if (!username || !lobbyId) {
    return res
      .status(400)
      .json({ error: "Username und Lobby-ID erforderlich" });
  }

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbys")
    .select("*")
    .eq("id", lobbyId)
    .single();

  if (lobbyError || !lobby) {
    return res.status(404).json({ error: "Lobby nicht gefunden" });
  }

  if (lobby.password && lobby.password !== password) {
    return res.status(403).json({ error: "Falsches Passwort" });
  }

  const { error: joinError } = await supabase
    .from("players")
    .insert([{ username, lobby_id: lobbyId }]);

  if (joinError) {
    console.error("❌ Fehler beim Join:", joinError);
    return res.status(500).json({ error: joinError.message });
  }

  res.json({ success: true });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
