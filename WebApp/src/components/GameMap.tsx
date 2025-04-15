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
    
    // Fülle den Hintergrund
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lade das Tileset
    const tileset = new Image();
    tileset.crossOrigin = 'anonymous';
    const tilesetUrl = 'https://web-app-red-nine.vercel.app/tileset.png';
    
    tileset.onerror = () => {
      console.error('Fehler beim Laden des Tilesets');
    };

    tileset.onload = () => {
      // Rendere jede Ebene
      mapData.layers.forEach(layer => {
        if (layer.type !== 'tilelayer') return;

        layer.data.forEach((tileId, index) => {
          if (tileId === 0) return; // Überspringe leere Tiles

          // Berechne die Position des Tiles auf der Karte
          const x = (index % layer.width) * mapData.tilewidth;
          const y = Math.floor(index / layer.width) * mapData.tileheight;

          // Berechne die Position des Tiles im Tileset
          const srcTileId = tileId - 1;
          const tilesPerRow = Math.floor(tileset.width / mapData.tilewidth);
          const srcX = (srcTileId % tilesPerRow) * mapData.tilewidth;
          const srcY = Math.floor(srcTileId / tilesPerRow) * mapData.tileheight;

          try {
            // Zeichne das Tile
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
            console.error('Fehler beim Zeichnen des Tiles');
          }
        });
      });
    };

    tileset.src = tilesetUrl;
    tilesetRef.current = tileset;

    return () => {
      if (tilesetRef.current) {
        tilesetRef.current.onload = null;
        tilesetRef.current.onerror = null;
      }
    };
  }, [mapData]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0,
        background: '#2d2d2d'
      }}
    />
  );
};

export default GameMap; 