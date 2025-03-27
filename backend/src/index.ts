import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import "dotenv/config"; // ← wichtig, um .env zu laden
import { supabase } from "./supabaseClient"; // ← Supabase importieren

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post("/lobby", async (req, res) => {
  const { username, name } = req.body;

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

  const { error } = await supabase
    .from("lobbys")
    .insert([{ id: lobbyId, host: username, name }]);

  if (error) {
    console.error("❌ Supabase-Fehler:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ lobbyId });
});

app.get("/lobbys", async (_req, res) => {
  const { data, error } = await supabase
    .from("lobbys")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Fehler beim Laden der Lobbys:", error);
    return res.status(500).json({ error: "Fehler beim Laden der Lobbys" });
  }

  res.json(data);
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
