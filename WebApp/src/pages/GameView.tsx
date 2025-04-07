import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
// import { useParams } from 'react-router-dom';

type Player = {
  x: number;
  y: number;
  username: string;
  health: number;
  skin: {
    ball: string;
    eyes: string;
    mouth: string;
    top: string;
  };
};

type Bullet = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
};

type Chest = {
  id: string;
  x: number;
  y: number;
  opened: boolean;
};

type Item = {
  id: string;
  name: string;
  type: string;
  effect_value: number;
  description: string;
  icon_url: string;
};

type InventorySlot = {
  item: Item | null;
  quantity: number;
};

type GroundItem = {
  item: Item;
  x: number;
  y: number;
};

type ItemPosition = {
  x: number;
  y: number;
};

type ItemWithPosition = {
  item: Item;
  position: ItemPosition;
};

const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  transports: ['websocket'],
});

const GameView: React.FC = () => {
  // const { id } = useParams();
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [username, setUsername] = useState<string>('');
  const [chests, setChests] = useState<Chest[]>([
    { id: 'chest-1', x: 300, y: 300, opened: false },
    { id: 'chest-2', x: 600, y: 200, opened: false },
  ]);
  
  const [nearChestId, setNearChestId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventorySlot[]>([
    { item: null, quantity: 0 },
    { item: null, quantity: 0 },
    { item: null, quantity: 0 },
    { item: null, quantity: 0 },
    { item: null, quantity: 0 },
  ]);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [groundItems, setGroundItems] = useState<GroundItem[]>([]);
  const [selectedGroundItem, setSelectedGroundItem] = useState<GroundItem | null>(null);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animationFrame = useRef<number>(0);
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [ping, setPing] = useState<number | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      socket.emit('join', { username: storedUsername });
    }
  }, []);

  useEffect(() => {
    socket.on('playersUpdate', (data: Record<string, Player>) => {
      console.log("🔁 Spieler-Update empfangen:", data);
      setPlayers(data);
    });
    return () => {
      socket.off('playersUpdate');
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowPlayerList(true);
      }
      // Inventar-Slot-Auswahl mit Zahlen
      const slotNumber = parseInt(e.key);
      if (slotNumber >= 1 && slotNumber <= 5) {
        setSelectedSlot(slotNumber - 1);
      }
      // Item verwenden mit F
      if (e.key.toLowerCase() === 'f') {
        handleItemUse();
      }
      // Item-Auswahl mit Pfeiltasten
      if (groundItems.length > 0) {
        if (e.key === 'ArrowLeft') {
          setSelectedItemIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'ArrowRight') {
          setSelectedItemIndex((prev) => (prev < groundItems.length - 1 ? prev + 1 : prev));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      if (e.key === 'Tab') {
        setShowPlayerList(false);
      }
    };

    const move = () => {
      const directions: string[] = [];

      if (keysPressed.current['w']) directions.push('up');
      if (keysPressed.current['a']) directions.push('left');
      if (keysPressed.current['s']) directions.push('down');
      if (keysPressed.current['d']) directions.push('right');

      if (directions.length > 0) {
        socket.emit('move', directions);
      }

      
      
      

      setBullets((prev) =>
        prev
          .map((b) => ({ ...b, x: b.x + b.vx, y: b.y + b.vy }))
          .filter((b) => b.x > 0 && b.x < window.innerWidth && b.y > 0 && b.y < window.innerHeight)
      );

      // ✅ Chest-Nähe prüfen
      const currentPlayer = Object.values(players).find(p => p.username === username);
      if (currentPlayer) {
        const near = chests.find(
          (chest) =>
            !chest.opened &&
            Math.hypot(chest.x - currentPlayer.x, chest.y - currentPlayer.y) < 50
        );
        setNearChestId(near?.id || null);
      }

      animationFrame.current = requestAnimationFrame(move);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    
    

    const handleClick = () => {
      const currentPlayer = Object.values(players).find(p => p.username === username);
      if (!currentPlayer) return;

      const dx = mousePos.current.x - currentPlayer.x;
      const dy = mousePos.current.y - currentPlayer.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const speed = 6;

      const vx = (dx / len) * speed;
      const vy = (dy / len) * speed;

      socket.emit("bulletFired", {
        x: currentPlayer.x,
        y: currentPlayer.y,
        vx,
        vy,
      });
    };

    const handleChestOpen = () => {
      if (nearChestId) {
        console.log("Öffne Truhe:", nearChestId);
        socket.emit("openChest", nearChestId);
        // Die Truhe wird vom Server als geöffnet markiert
        // und die Items werden vom Server generiert
      }
    };

    const handleItemPickup = () => {
      if (selectedGroundItem) {
        const newInventory = [...inventory];
        if (newInventory[selectedSlot].item === null) {
          // Slot ist leer, Item hinzufügen
          newInventory[selectedSlot] = { item: selectedGroundItem.item, quantity: 1 };
        } else {
          // Slot ist belegt, Item ersetzen
          newInventory[selectedSlot] = { item: selectedGroundItem.item, quantity: 1 };
        }
        setInventory(newInventory);
        
        // Entferne das Item vom Boden
        setGroundItems(prev => prev.filter(item => item !== selectedGroundItem));
        setSelectedGroundItem(null);
      }
    };

    const handleItemUse = () => {
      const selectedItem = inventory[selectedSlot].item;
      if (!selectedItem) return;

      switch (selectedItem.type) {
        case 'heal':
          socket.emit('useItem', {
            type: 'heal',
            value: selectedItem.effect_value
          });
          // Item aus Inventar entfernen
          const newInventory = [...inventory];
          newInventory[selectedSlot] = { item: null, quantity: 0 };
          setInventory(newInventory);
          break;
        case 'shield':
          socket.emit('useItem', {
            type: 'shield',
            value: selectedItem.effect_value
          });
          // Item aus Inventar entfernen
          const newInventory2 = [...inventory];
          newInventory2[selectedSlot] = { item: null, quantity: 0 };
          setInventory(newInventory2);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    // "E" gedrückt halten zum Öffnen/Aufsammeln
    const interval = setInterval(() => {
      if (keysPressed.current['e']) {
        if (nearChestId) {
          handleChestOpen();
        } else if (selectedGroundItem) {
          handleItemPickup();
        }
      }
    }, 100);

    animationFrame.current = requestAnimationFrame(move);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrame.current);
      clearInterval(interval);
    };
  }, [players, username, chests, nearChestId, groundItems, selectedSlot, inventory, selectedItemIndex, selectedGroundItem]);

  useEffect(() => {
    socket.on("bulletSpawned", (bullet: Bullet) => {
      setBullets((prev) => [...prev, bullet]);
    });

    return () => {
      socket.off("bulletSpawned");
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const start = Date.now();
      socket.emit('pingTest', () => {
        const duration = Date.now() - start;
        setPing(duration);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socket.on('chestsUpdate', (updatedChests: Chest[]) => {
      setChests(updatedChests);
    });
  
    return () => {
      socket.off('chestsUpdate');
    };
  }, []);

  useEffect(() => {
    socket.on("itemsSpawned", (itemsWithPositions: ItemWithPosition[]) => {
      // Erstelle neue GroundItems mit den berechneten Positionen
      const newGroundItems = itemsWithPositions.map(({ item, position }) => ({
        item,
        x: position.x,
        y: position.y,
      }));
      
      setGroundItems(prev => [...prev, ...newGroundItems]);
    });

    return () => {
      socket.off("itemsSpawned");
    };
  }, [socket]);

  // Prüfe Nähe zu Items
  useEffect(() => {
    const currentPlayer = Object.values(players).find(p => p.username === username);
    if (!currentPlayer) return;

    // Finde das nächste Item
    let closestItem: GroundItem | null = null;
    let closestDistance = Infinity;

    groundItems.forEach(groundItem => {
      const distance = Math.hypot(groundItem.x - currentPlayer.x, groundItem.y - currentPlayer.y);
      if (distance < 50 && distance < closestDistance) {
        closestItem = groundItem;
        closestDistance = distance;
      }
    });

    setSelectedGroundItem(closestItem);
  }, [players, username, groundItems]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: '#222',
      }}
    >
      {/* Spieler-Render */}
      {Object.entries(players).map(([socketId, player]) => (
        <div
          key={socketId}
          style={{
            position: 'absolute',
            left: player.x,
            top: player.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Name */}
          <div
            style={{
              color: 'white',
              fontSize: '0.7rem',
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            {player.username}
          </div>

          {/* Skin-Komponenten */}
          <div
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              margin: '0 auto',
              imageRendering: 'pixelated',
            }}
          >
            <img
              src={`/skins/Balls/${player.skin.ball}.png`}
              alt="ball"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
            />
            <img
              src={`/skins/Eyes/${player.skin.eyes}.png`}
              alt="eyes"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
            />
            <img
              src={`/skins/Mouths/${player.skin.mouth}.png`}
              alt="mouth"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
            />
            {player.skin.top !== 'none' && (
              <img
                src={`/skins/Tops/${player.skin.top}.png`}
                alt="top"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
              />
            )}
          </div>

          {/* Lebensbalken */}
          <div
            style={{
              marginTop: 6,
              width: 40,
              height: 6,
              backgroundColor: '#444',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${player.health ?? 100}%`,
                height: '100%',
                backgroundColor:
                  (player.health ?? 100) > 50
                    ? 'limegreen'
                    : (player.health ?? 100) > 20
                    ? 'orange'
                    : 'red',
                transition: 'width 0.1s ease-in-out',
              }}
            />
          </div>
        </div>
      ))}

      {/* Bullets */}
      {bullets.map((b) => (
        <div
          key={b.id}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: '10px',
            height: '10px',
            backgroundColor: 'yellow',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Truhen */}
        {chests.filter((c) => !c.opened).map((c) => (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              left: c.x,
              top: c.y,
              width: 30,
              height: 30,
              backgroundColor: 'sienna',
              border: '2px solid #000',
              transform: 'translate(-50%, -50%)',
              borderRadius: 4,
            }}
          />
        ))}

      {/* Truhen-Öffnen Hinweis */}
      {nearChestId && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '1rem',
        }}>
          Halte <strong>E</strong> zum Öffnen der Truhe
        </div>
      )}

      {/* Inventar */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        gap: '5px',
        padding: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '8px',
      }}>
        {inventory.map((slot, index) => (
          <div
            key={index}
            style={{
              width: '50px',
              height: '50px',
              border: `2px solid ${selectedSlot === index ? '#fff' : '#666'}`,
              borderRadius: '4px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={() => setSelectedSlot(index)}
          >
            {slot.item && (
              <img
                src={slot.item.icon_url}
                alt={slot.item.name}
                style={{ width: '80%', height: '80%' }}
              />
            )}
            {slot.quantity > 1 && (
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '2px 4px',
                borderRadius: '4px',
                fontSize: '12px',
              }}>
                {slot.quantity}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Items auf dem Boden */}
      {groundItems.map((groundItem) => (
        <div
          key={groundItem.item.id}
          style={{
            position: 'absolute',
            left: groundItem.x,
            top: groundItem.y,
            width: '30px',
            height: '30px',
            transition: 'transform 0.2s',
            transform: selectedGroundItem === groundItem 
              ? 'translate(-50%, -50%) scale(1.2)' 
              : 'translate(-50%, -50%)',
          }}
        >
          <img
            src={groundItem.item.icon_url}
            alt={groundItem.item.name}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      ))}

      {/* Item aufheben Hinweis */}
      {selectedGroundItem && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '1rem',
        }}>
          Halte <strong>E</strong> zum Aufheben von {selectedGroundItem.item.name}
        </div>
      )}

      {/* Spieler-Übersicht bei gedrücktem Tab */}
      {showPlayerList && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '10px',
            zIndex: 9999,
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.6)',
            minWidth: '250px',
            textAlign: 'center',
            fontSize: '0.9rem',
          }}
        >
          <strong>Spieler online:</strong>
          <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0 0' }}>
            {Object.values(players).map((player) => (
              <li key={player.username}>{player.username}</li>
            ))}
          </ul>

          <div style={{ marginTop: '10px', fontSize: '0.8rem', opacity: 0.9 }}>
            Ping: {ping !== null ? `${ping} ms` : '–'}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameView;
