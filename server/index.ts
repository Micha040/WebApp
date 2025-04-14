setInterval(() => {
  const now = Date.now();
  bullets = bullets.filter((bullet) => {
    // Entferne Geschosse, die älter als 5 Sekunden sind
    if (now - bullet.createdAt > 5000) {
      return false;
    }

    // Überprüfe Kollisionen mit Spielern
    for (const [id, player] of players) {
      if (id !== bullet.ownerId) {
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20) {
          // Kollisionsradius
          return false;
        }
      }
    }

    // Überprüfe Kollisionen mit Wänden
    if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
      return false;
    }

    return true;
  });

  // Sende aktualisierte Geschosse an alle Clients
  io.emit("bulletsUpdate", bullets);
}, 100);
