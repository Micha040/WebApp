import React, { useEffect, useRef } from 'react';

interface TiledLayer {
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
}

interface TiledMap {
  height: number;
  width: number;
  layers: TiledLayer[];
  tileheight: number;
  tilewidth: number;
  type: string;
  version: string;
}

interface GameMapProps {
  mapData: TiledMap;
}

const GameMap: React.FC<GameMapProps> = ({ mapData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilesetRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    console.log('MapData:', mapData); // Debug: Map-Daten anzeigen

    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas nicht gefunden');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Canvas-Kontext nicht gefunden');
      return;
    }

    // Setze die Canvas-Größe
    canvas.width = mapData.width * mapData.tilewidth;
    canvas.height = mapData.height * mapData.tileheight;
    console.log('Canvas-Größe:', canvas.width, 'x', canvas.height); // Debug: Canvas-Größe

    // Fülle den Hintergrund mit einer Farbe
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lade das Tileset
    const tileset = new Image();
    tileset.crossOrigin = 'anonymous'; // Wichtig für CORS
    tileset.src = '/tileset.png';
    console.log('Versuche Tileset zu laden:', tileset.src);

    tileset.onerror = (e) => {
      console.error('Fehler beim Laden des Tilesets:', e);
    };

    tileset.onload = () => {
      console.log('Tileset erfolgreich geladen:', tileset.width, 'x', tileset.height);

      // Rendere jede Ebene
      mapData.layers.forEach(layer => {
        if (layer.type !== 'tilelayer') return;
        console.log(`Verarbeite Layer: ${layer.name}, Anzahl Tiles: ${layer.data.length}`);

        layer.data.forEach((tileId, index) => {
          if (tileId === 0) return; // Überspringe leere Tiles

          // Berechne die Position des Tiles auf der Karte
          const x = (index % layer.width) * mapData.tilewidth;
          const y = Math.floor(index / layer.width) * mapData.tileheight;

          // Berechne die Position des Tiles im Tileset
          // Tiled verwendet 1-basierte Indizierung, daher -1
          const srcTileId = tileId - 1;
          const tilesPerRow = tileset.width / mapData.tilewidth;
          const srcX = (srcTileId % tilesPerRow) * mapData.tilewidth;
          const srcY = Math.floor(srcTileId / tilesPerRow) * mapData.tileheight;

          // Debug-Informationen für die ersten paar Tiles
          if (index < 5) {
            console.log(`Tile ${index}: ID=${tileId}, Position=(${x},${y}), Source=(${srcX},${srcY})`);
          }

          // Zeichne einen Rahmen um jedes Tile
          ctx.strokeStyle = 'rgba(255,0,0,0.2)';
          ctx.strokeRect(x, y, mapData.tilewidth, mapData.tileheight);

          // Zeichne das Tile
          try {
            ctx.drawImage(
              tileset,
              srcX,
              srcY,
              mapData.tilewidth,
              mapData.tileheight,
              x,
              y,
              mapData.tilewidth,
              mapData.tileheight
            );
          } catch (error) {
            console.error('Fehler beim Zeichnen des Tiles:', error, {
              tileId,
              srcX,
              srcY,
              x,
              y,
              tilesetSize: `${tileset.width}x${tileset.height}`,
              tilesPerRow
            });
          }
        });
      });

      // Debug: Zeichne ein Testmuster
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(i * 32, i * 32, 32, 32);
      }
    };

    tilesetRef.current = tileset;
  }, [mapData]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: -1,
        border: '1px solid red',
        background: '#2d2d2d'
      }}
    />
  );
};

export default GameMap; 