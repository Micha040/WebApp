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

    // Debug: Zeichne ein Raster
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let x = 0; x < canvas.width; x += mapData.tilewidth) {
      for (let y = 0; y < canvas.height; y += mapData.tileheight) {
        ctx.strokeRect(x, y, mapData.tilewidth, mapData.tileheight);
      }
    }

    // Lade das Tileset
    const tileset = new Image();
    tileset.crossOrigin = 'anonymous';
    
    // Verwende die bekannte funktionierende URL
    const tilesetUrl = 'https://web-app-red-nine.vercel.app/tileset.png';
    console.log('Versuche Tileset zu laden von:', tilesetUrl);
    
    tileset.onerror = (e) => {
      console.error('Fehler beim Laden des Tilesets:', e);
      // Zeige einen roten Fehlerindikator im Canvas
      ctx.fillStyle = 'rgba(255,0,0,0.3)';
      ctx.fillRect(0, 0, 100, 100);
    };

    tileset.onload = () => {
      console.log('Tileset erfolgreich geladen, Dimensionen:', tileset.width, 'x', tileset.height);

      // Rendere jede Ebene
      mapData.layers.forEach(layer => {
        if (layer.type !== 'tilelayer') return;
        console.log(`Rendere Layer "${layer.name}" mit ${layer.data.length} Tiles`);

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

          // Debug: Zeichne einen farbigen Rahmen für jedes Tile
          if (layer.name === 'Ground') {
            ctx.strokeStyle = 'rgba(0,255,0,0.3)';
          } else {
            ctx.strokeStyle = 'rgba(255,0,0,0.3)';
          }
          ctx.strokeRect(x, y, mapData.tilewidth, mapData.tileheight);

          try {
            // Debug: Zeichne einen Punkt an der Quellposition im Debug-Canvas
            const debugScale = 0.2; // Skaliere das Debug-Tileset kleiner
            const debugX = 10 + (srcX * debugScale);
            const debugY = 10 + (srcY * debugScale);
            ctx.fillStyle = 'rgba(255,255,0,0.5)';
            ctx.fillRect(debugX, debugY, 2, 2);

            // Zeichne das eigentliche Tile
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

            // Debug: Zeichne die Tile-Informationen
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '8px Arial';
            ctx.fillText(
              `${tileId}`,
              x + 2,
              y + 10
            );
            ctx.fillText(
              `${srcX},${srcY}`,
              x + 2,
              y + 20
            );

          } catch (error) {
            console.error('Fehler beim Zeichnen des Tiles:', {
              tileId,
              srcX,
              srcY,
              x,
              y,
              tilesetSize: `${tileset.width}x${tileset.height}`,
              tilesPerRow
            });
            
            // Markiere fehlerhafte Tiles
            ctx.fillStyle = 'rgba(255,0,0,0.3)';
            ctx.fillRect(x, y, mapData.tilewidth, mapData.tileheight);
          }
        });
      });

      // Debug: Zeichne eine kleine Version des Tilesets in die obere linke Ecke
      try {
        const debugWidth = tileset.width * 0.2;
        const debugHeight = tileset.height * 0.2;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(tileset, 10, 10, debugWidth, debugHeight);
        ctx.globalAlpha = 1.0;
      } catch (error) {
        console.error('Fehler beim Zeichnen des Debug-Tilesets:', error);
      }
    };

    tileset.src = tilesetUrl;
    tilesetRef.current = tileset;

    return () => {
      // Cleanup
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
        zIndex: -1,
        border: '2px solid red',
        background: '#2d2d2d'
      }}
    />
  );
};

export default GameMap; 