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
        player_id: playerId,
        lobby_id: lobbyId, // wichtig: für spätere Queries in dieser Lobby
        eyes: "default",
        mouth: "default",
        weapon: "none",
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
    return res.status(500).json({ error: "Fehler beim Kicken" });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
