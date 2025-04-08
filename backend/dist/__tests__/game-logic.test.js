"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Hilfsfunktionen für die Tests
function createGameState() {
    return {
        players: {
            player1: {
                id: "player1",
                username: "Spieler1",
                x: 100,
                y: 100,
                health: 100,
                isAlive: true,
            },
            player2: {
                id: "player2",
                username: "Spieler2",
                x: 200,
                y: 200,
                health: 100,
                isAlive: true,
            },
        },
        bullets: [],
        chests: [
            { id: "chest1", x: 150, y: 150, opened: false },
            { id: "chest2", x: 250, y: 250, opened: false },
        ],
    };
}
function updateGameState(state, action) {
    const newState = { ...state };
    switch (action) {
        case "gameOver":
            // Setze Truhen zurück
            newState.chests = newState.chests.map((chest) => ({
                ...chest,
                opened: false,
            }));
            break;
        case "updateBullets":
            // Entferne Kugeln, die außerhalb des Spielfelds sind
            newState.bullets = newState.bullets.filter((bullet) => bullet.x >= 0 && bullet.x <= 800 && bullet.y >= 0 && bullet.y <= 600);
            break;
        case "checkCollisions":
            // Prüfe Kollisionen zwischen Kugeln und Spielern
            const bulletsToRemove = [];
            newState.bullets.forEach((bullet) => {
                Object.entries(newState.players).forEach(([playerId, player]) => {
                    // Überspringe den Besitzer der Kugel
                    if (playerId === bullet.ownerId)
                        return;
                    // Berechne Distanz zwischen Kugel und Spieler
                    const dx = bullet.x - player.x;
                    const dy = bullet.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    // Wenn Kollision, markiere Kugel zum Entfernen
                    if (distance < 20) {
                        bulletsToRemove.push(bullet.id);
                    }
                });
            });
            // Entferne markierte Kugeln
            newState.bullets = newState.bullets.filter((bullet) => !bulletsToRemove.includes(bullet.id));
            break;
    }
    return newState;
}
(0, vitest_1.describe)("Spiel-Logik", () => {
    let gameState;
    (0, vitest_1.beforeEach)(() => {
        gameState = createGameState();
    });
    (0, vitest_1.it)("sollte Truhen nach Spielende zurücksetzen", () => {
        // Test-Setup
        gameState.chests = [
            { id: "1", x: 100, y: 100, opened: true },
            { id: "2", x: 200, y: 200, opened: true },
        ];
        // Test-Aktion
        const updatedState = updateGameState(gameState, "gameOver");
        // Überprüfung
        (0, vitest_1.expect)(updatedState.chests[0].opened).toBe(false);
        (0, vitest_1.expect)(updatedState.chests[1].opened).toBe(false);
    });
    (0, vitest_1.it)("sollte Kollisionen zwischen Kugeln und Wänden korrekt erkennen", () => {
        // Test-Setup
        gameState.bullets = [
            { id: "1", x: 10, y: 10, vx: 5, vy: 0, ownerId: "player1" },
        ];
        // Test-Aktion
        const updatedState = updateGameState(gameState, "updateBullets");
        // Überprüfung
        (0, vitest_1.expect)(updatedState.bullets.length).toBe(1); // Kugel sollte noch da sein
        // Kugel außerhalb des Spielfelds
        gameState.bullets = [
            { id: "1", x: -10, y: 10, vx: 5, vy: 0, ownerId: "player1" },
        ];
        const updatedState2 = updateGameState(gameState, "updateBullets");
        (0, vitest_1.expect)(updatedState2.bullets.length).toBe(0); // Kugel sollte verschwunden sein
    });
    (0, vitest_1.it)("sollte Kugeln nicht zerstören, wenn sie mit dem Besitzer kollidieren", () => {
        // Test-Setup
        gameState.bullets = [
            { id: "1", x: 100, y: 100, vx: 0, vy: 0, ownerId: "player1" },
        ];
        // Test-Aktion
        const updatedState = updateGameState(gameState, "checkCollisions");
        // Überprüfung
        (0, vitest_1.expect)(updatedState.bullets.length).toBe(1); // Kugel sollte noch da sein
    });
    (0, vitest_1.it)("sollte Kugeln zerstören, wenn sie mit anderen Spielern kollidieren", () => {
        // Test-Setup
        gameState.bullets = [
            { id: "1", x: 200, y: 200, vx: 0, vy: 0, ownerId: "player1" },
        ];
        // Test-Aktion
        const updatedState = updateGameState(gameState, "checkCollisions");
        // Überprüfung
        (0, vitest_1.expect)(updatedState.bullets.length).toBe(0); // Kugel sollte verschwunden sein
    });
});
