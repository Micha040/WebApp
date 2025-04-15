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
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setze die Canvas-Größe
    canvas.width = mapData.width * mapData.tilewidth;
    canvas.height = mapData.height * mapData.tileheight;

    // Lade das Tileset
    const tileset = new Image();
    tileset.src = '/tileset.png';
    tilesetRef.current = tileset;

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
          // Subtrahiere 1 von tileId, da Tiled mit 1-basierter Indizierung arbeitet
          const srcTileId = tileId - 1;
          const srcX = (srcTileId % 32) * mapData.tilewidth;
          const srcY = Math.floor(srcTileId / 32) * mapData.tileheight;

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
        });
      });
    };
  }, [mapData]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: -1,
      }}
    />
  );
};

export default GameMap; 