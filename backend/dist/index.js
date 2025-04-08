"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const crypto_1 = require("crypto");
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const corsOptions = {
    origin: ["https://web-app-red-nine.vercel.app"],
    methods: ["GET", "POST", "DELETE", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type"],
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// ✅ Lobby erstellen
app.post("/lobby", async (req, res) => {
    const { username, name, password } = req.body;
    if (!username ||
        typeof username !== "string" ||
        !name ||
        typeof name !== "string") {
        return res
            .status(400)
            .json({ error: "Ungültiger Username oder Lobbyname" });
    }
    const lobbyId = (0, crypto_1.randomUUID)();
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
        console.error("❌ Supabase-Fehler (Host als Spieler hinzufügen):", playerInsertError);
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
                ball: "sprite_1",
                eyes: "sprite_1",
                mouth: "sprite_1",
            },
        ]);
        if (skinInsertError) {
            console.error("❌ Fehler beim Erstellen des Skins:", skinInsertError.message);
            // ebenfalls nicht blockieren
        }
    }
    await updateLobbyActivity(lobbyId);
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
        console.log(`Lobby ${id} wurde automatisch gelöscht, da keine Spieler mehr übrig sind.`);
    }
    res.json({ success: true });
});
// ✅ Alle offenen Lobbys holen
app.get("/lobbys", async (_req, res) => {
    const { data, error } = await supabase
        .from("lobbys")
        .select("*")
        .order("created_at", { ascending: false });
    if (error)
        return res.status(500).json({ error: error.message });
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
    if (error)
        return res.status(404).json({ error: "Lobby nicht gefunden" });
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
    await updateLobbyActivity(lobbyId);
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
    await updateLobbyActivity(lobbyId);
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
    // console.log("📥 Empfangen:", { lobbyId, username });
    // console.log("🔧 Skin-Daten empfangen:", JSON.stringify(skin, null, 2));
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
        .update({
        ball: ball.startsWith("sprite_") ? ball : `sprite_${ball}`,
        eyes,
        mouth,
        top,
    })
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
    // console.log("✅ Spiel erstellt + Skin gespeichert!");
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
//
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "https://web-app-red-nine.vercel.app",
        methods: ["GET", "POST"],
        credentials: true,
    },
});
// ✅ Spielerliste nach socket.id
const connectedPlayers = {};
const bullets = [];
io.on("connection", (socket) => {
    // console.log("🟢 Neue Socket-Verbindung:", socket.id); // ← ganz oben
    // console.log(`🟢 Spieler verbunden: ${socket.id}`);
    socket.emit("chestsUpdate", chests);
    socket.onAny((event, ...args) => {
        // console.log(`📡 [SOCKET EVENT] ${event}`, args);
    });
    socket.on("join", async (data) => {
        // console.log("📡 Spieler gejoint (empfangen):", data.username);
        // Hole Skin-Informationen aus der Datenbank
        const { data: playerData, error: playerError } = await supabase
            .from("players")
            .select("id")
            .eq("username", data.username)
            .single();
        if (playerError) {
            console.error("❌ Fehler beim Laden des Spielers:", playerError);
            return;
        }
        const { data: skinData, error: skinError } = await supabase
            .from("skins")
            .select("ball, eyes, mouth, top")
            .eq("player_id", playerData.id)
            .single();
        if (skinError) {
            console.error("❌ Fehler beim Laden des Skins:", skinError);
            return;
        }
        connectedPlayers[socket.id] = {
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            username: data.username,
            health: 100,
            skin: skinData,
        };
        io.emit("playersUpdate", connectedPlayers);
    });
    socket.on("move", (directions) => {
        const player = connectedPlayers[socket.id];
        if (!player)
            return;
        // Basis-Geschwindigkeit
        let speed = 4;
        // Wende Geschwindigkeitsboost an, falls aktiv
        if (player.speedBoost) {
            speed *= 1 + player.speedBoost / 100;
        }
        // Berechne die Bewegungsrichtung
        let dx = 0;
        let dy = 0;
        if (directions.includes("up"))
            dy -= 1;
        if (directions.includes("down"))
            dy += 1;
        if (directions.includes("left"))
            dx -= 1;
        if (directions.includes("right"))
            dx += 1;
        // Normalisiere die Diagonale
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx = dx / length;
            dy = dy / length;
        }
        // Wende die normalisierte Geschwindigkeit an
        player.x += dx * speed;
        player.y += dy * speed;
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
        const bullet = {
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
    socket.on("useItem", (data) => {
        const player = connectedPlayers[socket.id];
        if (!player)
            return;
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
                console.log(`💚 ${player.username} hat sich geheilt! +${data.value} HP (neu: ${player.health})`);
                break;
            case "shield":
                player.shield = data.value;
                console.log(`🛡️ ${player.username} hat einen Schild aktiviert! (${data.value} Schaden blockiert)`);
                break;
            case "speed":
                player.speedBoost = data.value;
                console.log(`⚡ ${player.username} hat einen Geschwindigkeitsboost aktiviert! (+${data.value}% Geschwindigkeit)`);
                break;
            case "damage":
                player.damageBoost = data.value;
                console.log(`�� ${player.username} hat einen Schadensboost aktiviert! (+${data.value}% Schaden)`);
                break;
        }
        io.emit("playersUpdate", connectedPlayers);
    });
    socket.on("disconnect", () => {
        delete connectedPlayers[socket.id];
        io.emit("playersUpdate", connectedPlayers);
    });
    socket.on("pingTest", (cb) => {
        cb(); // sofortige Antwort
    });
    socket.on("openChest", (chestId) => {
        const player = connectedPlayers[socket.id];
        if (!player)
            return;
        const chest = chests.find((c) => c.id === chestId && !c.opened);
        if (!chest)
            return;
        const dx = player.x - chest.x;
        const dy = player.y - chest.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 50) {
            chest.opened = true;
            // Generiere zufällige Items für die Truhe
            chest.items = generateRandomItems();
            io.emit("chestsUpdate", chests);
            // Sende die Items an ALLE Spieler zusammen mit der Truhenposition
            if (chest.items.length > 0) {
                // Berechne für jedes Item eine zufällige Position
                const itemsWithPositions = chest.items.map((item) => {
                    const position = calculateItemPosition(chest.x, chest.y);
                    return { item, position };
                });
                io.emit("itemsSpawned", itemsWithPositions);
            }
            console.log(`🧰 ${player.username} hat Truhe ${chest.id} geöffnet und ${chest.items.length} Items gefunden`);
        }
    });
    socket.on("itemPickedUp", (itemId) => {
        // Informiere alle Spieler, dass das Item aufgesammelt wurde
        io.emit("itemRemoved", itemId);
    });
    socket.on("itemDropped", (data) => {
        // Informiere alle Spieler, dass ein neues Item gedroppt wurde
        io.emit("itemDropped", data);
    });
});
// Kollisionen prüfen & Leben abziehen
setInterval(() => {
    bullets.forEach((bullet) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
    });
    const playerRadius = 20;
    const bulletRadius = 5;
    const collisionDistance = playerRadius + bulletRadius;
    bullets.forEach((bullet, index) => {
        for (const [socketId, player] of Object.entries(connectedPlayers)) {
            if (bullet.ownerId === socketId)
                continue;
            const dx = player.x - bullet.x;
            const dy = player.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < collisionDistance) {
                // Basis-Schaden
                let damage = 2;
                // Erhöhe Schaden, wenn Schütze einen Schadensboost hat
                const shooter = connectedPlayers[bullet.ownerId];
                if (shooter && shooter.damageBoost) {
                    damage *= 1 + shooter.damageBoost / 100;
                }
                //tesr
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
                bullets.splice(index, 1);
                console.log(`💥 ${player.username} wurde getroffen! ➖ ${damage.toFixed(1)} HP (neu: ${player.health})`);
                io.emit("playersUpdate", connectedPlayers);
                break;
            }
        }
    });
}, 50);
// Liste aller möglichen Items
const possibleItems = [
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
function generateRandomItems() {
    // 50/50 Chance für 1 oder 2 Items
    const itemCount = Math.random() < 0.5 ? 1 : 2;
    const items = [];
    // Kopiere die möglichen Items, damit wir sie zufällig auswählen können
    const availableItems = [...possibleItems];
    for (let i = 0; i < itemCount; i++) {
        if (availableItems.length === 0)
            break;
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
function calculateItemPosition(chestX, chestY) {
    // Zufälliger Winkel im Bogenmaß (0 bis 2π)
    const angle = Math.random() * Math.PI * 2;
    // Zufällige Kraft zwischen 30 und 60
    const force = 30 + Math.random() * 30;
    // Berechne die neue Position basierend auf Winkel und Kraft
    const x = chestX + Math.cos(angle) * force;
    const y = chestY + Math.sin(angle) * force;
    return { x, y };
}
const chests = [
    {
        id: "chest-1",
        x: 300,
        y: 300,
        opened: false,
        items: [],
    },
    {
        id: "chest-2",
        x: 600,
        y: 200,
        opened: false,
        items: [],
    },
    {
        id: "chest-3",
        x: 150,
        y: 150,
        opened: false,
        items: [],
    },
    {
        id: "chest-4",
        x: 800,
        y: 400,
        opened: false,
        items: [],
    },
    {
        id: "chest-5",
        x: 400,
        y: 600,
        opened: false,
        items: [],
    },
    {
        id: "chest-6",
        x: 700,
        y: 700,
        opened: false,
        items: [],
    },
    {
        id: "chest-7",
        x: 200,
        y: 500,
        opened: false,
        items: [],
    },
    {
        id: "chest-8",
        x: 900,
        y: 100,
        opened: false,
        items: [],
    },
    {
        id: "chest-9",
        x: 500,
        y: 400,
        opened: false,
        items: [],
    },
    {
        id: "chest-10",
        x: 100,
        y: 700,
        opened: false,
        items: [],
    },
];
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Server + WebSocket läuft auf http://localhost:${PORT}`);
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
async function updateLobbyActivity(lobbyId) {
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
