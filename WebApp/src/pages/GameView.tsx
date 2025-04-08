import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import EffectTimer from '../components/EffectTimer';
import GameMap from '../components/GameMap';
// import { useParams } from 'react-router-dom';

// Typen außerhalb der Komponente definieren
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

type Effect = {
  type: 'shield' | 'speed' | 'damage';
  endTime: number;
  slot: number;
};

type VisualEffect = {
  type: 'heal' | 'shield' | 'speed' | 'damage';
  playerId: string;
  endTime: number;
};

// Füge den TiledMap-Typ hinzu
interface TiledMap {
  height: number;
  width: number;
  layers: {
    data: number[];
    height: number;
    id: number;
    name: string;
    opacity: number;
    type: string;
    visible: boolean;
    width: number;
    x: number;
    y: number;
  }[];
  tileheight: number;
  tilewidth: number;
  type: string;
  version: string;
}

// Socket-Verbindung außerhalb der Komponente erstellen
const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  transports: ['websocket'],
});

const GameView: React.FC = () => {
  // Alle States am Anfang der Komponente definieren
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [username, setUsername] = useState<string>('');
  const [chests, setChests] = useState<Chest[]>([]);
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
  const [activeEffects, setActiveEffects] = useState<Effect[]>([]);
  const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  const [mapData, setMapData] = useState<TiledMap | null>(null);
  
  // Ladebildschirm-States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingStep, setLoadingStep] = useState<string>('Initialisiere Spiel...');
  const [loadingComplete, setLoadingComplete] = useState<boolean>(false);

  // Refs
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animationFrame = useRef<number>(0);
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Effekte für Socket-Verbindung
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      setLoadingStep('Verbinde mit Server...');
      setLoadingProgress(20);
      
      // Simuliere Ladezeit für bessere UX
      loadingTimeout.current = setTimeout(() => {
        socket.emit('join', { username: storedUsername });
        setLoadingProgress(40);
        setLoadingStep('Lade Spielerdaten...');
      }, 1000);
    } else {
      // Wenn kein Benutzername gefunden wurde, zeige Fehlermeldung
      setLoadingStep('Kein Benutzername gefunden. Bitte melde dich an.');
      setLoadingProgress(0);
      setLoadingComplete(true);
    }
    
    return () => {
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
    };
  }, []);

  // Effekt für Spieler-Updates
  useEffect(() => {
    socket.on('playersUpdate', (data: Record<string, Player>) => {
      setPlayers(data);
    });
    return () => {
      socket.off('playersUpdate');
    };
  }, []);

  // Effekt für visuelle Effekte
  useEffect(() => {
    socket.on('visualEffect', (effect: VisualEffect) => {
      setVisualEffects(prev => [...prev, effect]);
    });
    return () => {
      socket.off('visualEffect');
    };
  }, []);

  // Effekt für das Aufräumen der Effekte
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveEffects(prev => prev.filter(effect => effect.endTime > now));
      setVisualEffects(prev => prev.filter(effect => effect.endTime > now));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Funktion zum Anzeigen des Ladebildschirms
  const showLoadingScreen = (message: string = 'Initialisiere Spiel...') => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStep(message);
    setLoadingComplete(false);
  };

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
        
        // Debug-Log für Truhen-Erkennung
        if (near) {
          console.log("Truhe in der Nähe:", near.id);
        }
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
        
        // Suche nach einem freien Slot
        const freeSlotIndex = newInventory.findIndex(slot => slot.item === null);
        
        if (freeSlotIndex !== -1) {
          // Wenn ein freier Slot gefunden wurde, lege das Item dort ab
          newInventory[freeSlotIndex] = { item: selectedGroundItem.item, quantity: 1 };
          setInventory(newInventory);
          
          // Entferne das Item vom Boden für diesen Spieler
          setGroundItems(prev => prev.filter(item => item !== selectedGroundItem));
          setSelectedGroundItem(null);
          
          // Informiere den Server, dass das Item aufgesammelt wurde
          socket.emit("itemPickedUp", selectedGroundItem.item.id);
        } else {
          // Wenn kein freier Slot gefunden wurde, droppe das vorhandene Item
          const droppedItem = newInventory[selectedSlot].item;
          if (droppedItem) {
            // Sende das gedroppte Item an den Server, damit es für alle Spieler sichtbar ist
            socket.emit("itemDropped", {
              item: droppedItem,
              x: Object.values(players).find(p => p.username === username)?.x || 0,
              y: Object.values(players).find(p => p.username === username)?.y || 0
            });
          }
          
          // Neues Item in den Slot legen
          newInventory[selectedSlot] = { item: selectedGroundItem.item, quantity: 1 };
          setInventory(newInventory);
          
          // Entferne das Item vom Boden für diesen Spieler
          setGroundItems(prev => prev.filter(item => item !== selectedGroundItem));
          setSelectedGroundItem(null);
          
          // Informiere den Server, dass das Item aufgesammelt wurde
          socket.emit("itemPickedUp", selectedGroundItem.item.id);
        }
      }
    };

    const handleItemUse = () => {
      const selectedItem = inventory[selectedSlot].item;
      if (!selectedItem) return;

      const effectDuration = 10000; // 10 Sekunden

      switch (selectedItem.type) {
        case 'heal':
          socket.emit('useItem', {
            type: 'heal',
            value: selectedItem.effect_value
          });
          break;
        case 'shield':
          socket.emit('useItem', {
            type: 'shield',
            value: selectedItem.effect_value,
            duration: effectDuration
          });
          setActiveEffects(prev => [
            ...prev.filter(e => e.type !== 'shield'),
            { type: 'shield', endTime: Date.now() + effectDuration, slot: selectedSlot }
          ]);
          break;
        case 'speed':
          socket.emit('useItem', {
            type: 'speed',
            value: selectedItem.effect_value,
            duration: effectDuration
          });
          setActiveEffects(prev => [
            ...prev.filter(e => e.type !== 'speed'),
            { type: 'speed', endTime: Date.now() + effectDuration, slot: selectedSlot }
          ]);
          break;
        case 'damage':
          socket.emit('useItem', {
            type: 'damage',
            value: selectedItem.effect_value,
            duration: effectDuration
          });
          setActiveEffects(prev => [
            ...prev.filter(e => e.type !== 'damage'),
            { type: 'damage', endTime: Date.now() + effectDuration, slot: selectedSlot }
          ]);
          break;
      }

      // Item aus Inventar entfernen
      const newInventory = [...inventory];
      newInventory[selectedSlot] = { item: null, quantity: 0 };
      setInventory(newInventory);
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

    // Höre auf das Event, wenn ein Item von einem anderen Spieler aufgesammelt wurde
    socket.on("itemRemoved", (itemId: string) => {
      setGroundItems(prev => prev.filter(item => item.item.id !== itemId));
    });

    // Höre auf das Event, wenn ein Item von einem anderen Spieler gedroppt wurde
    socket.on("itemDropped", (data: { item: Item, x: number, y: number }) => {
      const newGroundItem: GroundItem = {
        item: data.item,
        x: data.x,
        y: data.y
      };
      setGroundItems(prev => [...prev, newGroundItem]);
    });

    return () => {
      socket.off("itemsSpawned");
      socket.off("itemRemoved");
      socket.off("itemDropped");
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

    //test  
    setSelectedGroundItem(closestItem);
  }, [players, username, groundItems]);

  // Effekt für das Laden der Map
  useEffect(() => {
    console.log('Versuche Map zu laden...');
    setLoadingStep('Lade Spielkarte...');
    setLoadingProgress(60);
    
    fetch('/map.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Map erfolgreich geladen:', data);
        setMapData(data);
        setLoadingProgress(80);
        setLoadingStep('Lade Spielressourcen...');
        
        // Simuliere das Laden weiterer Ressourcen
        setTimeout(() => {
          setLoadingProgress(100);
          setLoadingStep('Spiel bereit!');
          setLoadingComplete(true);
          
          // Verzögere das Ausblenden des Ladebildschirms für bessere UX
          setTimeout(() => {
            setIsLoading(false);
          }, 1000);
        }, 1500);
      })
      .catch(error => {
        console.error('Fehler beim Laden der Map:', error);
        console.error('Map konnte nicht unter /map.json gefunden werden');
        setLoadingStep('Fehler beim Laden der Karte');
        setLoadingProgress(0);
      });
  }, []);

  // Event-Listener für das Verlassen des Ladebildschirms
  useEffect(() => {
    if (loadingComplete) {
      const handleKeyPress = () => {
        setIsLoading(false);
      };
      
      window.addEventListener('keydown', handleKeyPress);
      window.addEventListener('click', handleKeyPress);
      
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
        window.removeEventListener('click', handleKeyPress);
      };
    }
  }, [loadingComplete]);

  // Funktion zum Neuladen des Spiels
  const reloadGame = () => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStep('Initialisiere Spiel...');
    setLoadingComplete(false);
    
    // Lade die Map neu
    fetch('/map.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setMapData(data);
        setLoadingProgress(80);
        setLoadingStep('Lade Spielressourcen...');
        
        setTimeout(() => {
          setLoadingProgress(100);
          setLoadingStep('Spiel bereit!');
          setLoadingComplete(true);
          
          setTimeout(() => {
            setIsLoading(false);
          }, 1000);
        }, 1500);
      })
      .catch(error => {
        console.error('Fehler beim Laden der Map:', error);
        setLoadingStep('Fehler beim Laden der Karte');
        setLoadingProgress(0);
      });
  };

  const renderVisualEffect = (playerId: string, effect: VisualEffect) => {
    const player = players[playerId];
    if (!player) return null;

    switch (effect.type) {
      case 'heal':
        console.log("heal")
        return (
          <div
            key={`${playerId}-heal-${effect.endTime}`}
            style={{
              position: 'absolute',
              left: player.x,
              top: player.y,
              width: '60px',
              height: '60px',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}
          >
            {/* Heilungs-Pfeile */}
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: '20px',
                  height: '20px',
                  transform: `rotate(${i * 90}deg) translateY(-30px)`,
                  color: '#2ecc71',
                  fontSize: '20px',
                  animation: 'healArrow 1s infinite'
                }}
              >
                ↑
              </div>
            ))}
          </div>
        );
      case 'shield':
        return (
          <div
            key={`${playerId}-shield-${effect.endTime}`}
            style={{
              position: 'absolute',
              left: player.x,
              top: player.y,
              width: '60px',
              height: '60px',
              border: '3px solid #3498db',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'shieldPulse 2s infinite',
              pointerEvents: 'none'
            }}
          />
        );
      case 'speed':
        return (
          <div
            key={`${playerId}-speed-${effect.endTime}`}
            style={{
              position: 'absolute',
              left: player.x,
              top: player.y,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}
          >
            {/* Speed-Linien */}
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '30px',
                  height: '2px',
                  background: '#2ecc71',
                  transform: `translateX(${-20 - i * 15}px)`,
                  animation: 'speedLines 0.5s infinite'
                }}
              />
            ))}
          </div>
        );
      case 'damage':
        return (
          <div
            key={`${playerId}-damage-${effect.endTime}`}
            style={{
              position: 'absolute',
              left: player.x,
              top: player.y,
              width: '60px',
              height: '60px',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}
          >
            {/* Rote Aura */}
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                border: '2px solid #e74c3c',
                borderRadius: '50%',
                animation: 'damageAura 1s infinite'
              }}
            />
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: '#222',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      {/* Ladebildschirm */}
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#111',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            color: 'white',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <div
            style={{
              width: '80%',
              maxWidth: '500px',
              marginBottom: '30px',
            }}
          >
            <h1
              style={{
                fontSize: '2.5rem',
                marginBottom: '20px',
                textAlign: 'center',
                color: '#4a9eff',
                textShadow: '0 0 10px rgba(74, 158, 255, 0.5)',
              }}
            >
              {loadingComplete ? 'Spiel bereit!' : 'Lade Spiel...'}
            </h1>
            
            <div
              style={{
                width: '100%',
                height: '20px',
                backgroundColor: '#333',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '15px',
                boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div
                style={{
                  width: `${loadingProgress}%`,
                  height: '100%',
                  backgroundColor: loadingComplete ? '#4CAF50' : '#4a9eff',
                  borderRadius: '10px',
                  transition: 'width 0.5s ease-in-out',
                  boxShadow: '0 0 10px rgba(74, 158, 255, 0.7)',
                }}
              />
            </div>
            
            <p
              style={{
                fontSize: '1.2rem',
                textAlign: 'center',
                color: loadingComplete ? '#4CAF50' : '#aaa',
                transition: 'color 0.3s ease-in-out',
              }}
            >
              {loadingStep}
            </p>
            
            {loadingComplete && (
              <div
                style={{
                  marginTop: '30px',
                  textAlign: 'center',
                  animation: 'pulse 1.5s infinite',
                }}
              >
                <p style={{ fontSize: '1.1rem', color: '#aaa' }}>
                  Drücke eine beliebige Taste, um fortzufahren
                </p>
              </div>
            )}
            
            {loadingProgress === 0 && loadingComplete && (
              <div
                style={{
                  marginTop: '20px',
                  textAlign: 'center',
                }}
              >
                <button
                  onClick={reloadGame}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#4a9eff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3a8eef'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4a9eff'}
                >
                  Neu laden
                </button>
              </div>
            )}
          </div>
          
          <style>
            {`
              @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
              }
            `}
          </style>
        </div>
      )}
      
      {mapData && <GameMap mapData={mapData} />}
      <style>
        {`
          @keyframes healArrow {
            0% { transform: rotate(0deg) translateY(-30px); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: rotate(0deg) translateY(-40px); opacity: 0; }
          }
          @keyframes shieldPulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.3; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          }
          @keyframes speedLines {
            0% { opacity: 0; transform: translateX(-35px); }
            50% { opacity: 1; }
            100% { opacity: 0; transform: translateX(-50px); }
          }
          @keyframes damageAura {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.2); opacity: 0.3; }
            100% { transform: scale(1); opacity: 0.6; }
          }
        `}
      </style>

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
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
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
              style={{ 
                position: 'absolute', 
                top: '45%', 
                left: '50%', 
                width: '60%',
                transform: 'translate(-50%, -50%)'
              }}
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
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
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
              position: 'relative',  // Hinzugefügt für absolute Positionierung der Timer
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
            {/* Effekt-Timer */}
            {activeEffects.map(effect => 
              effect.slot === index && <EffectTimer key={effect.type} effect={effect} />
            )}
          </div>
        ))}
      </div>
      
      {/* Items auf dem Boden adsf*/}
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
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
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
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
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
          
          <button
            onClick={() => showLoadingScreen('Starte Spiel neu...')}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#4a9eff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3a8eef'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4a9eff'}
          >
            Spiel neu starten
          </button>
        </div>
      )}

      {/* Visuelle Effekte */}
      {visualEffects.map(effect => renderVisualEffect(effect.playerId, effect))}
    </div>
  );
};

export default GameView;
