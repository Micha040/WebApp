import React from 'react';

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
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: mapData.width * mapData.tilewidth,
        height: mapData.height * mapData.tileheight,
        zIndex: -1,
      }}
    >
      {mapData.layers.map((layer) => {
        // Nur Tile-Layer rendern
        if (layer.type !== 'tilelayer') return null;

        return (
          <div key={layer.name} style={{ position: 'absolute', top: 0, left: 0 }}>
            {layer.data.map((tileId, index) => {
              if (tileId === 0) return null; // Leere Tiles nicht rendern

              const x = (index % layer.width) * mapData.tilewidth;
              const y = Math.floor(index / layer.width) * mapData.tileheight;

              let backgroundColor = '';
              if (layer.name === 'Ground') {
                backgroundColor = '#4a9c2d'; // Grün für Ground
              } else if (layer.name === 'Solid') {
                backgroundColor = '#8B4513'; // Braun für Solid/Wände
              }

              return (
                <div
                  key={`${layer.name}-${index}`}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: mapData.tilewidth,
                    height: mapData.tileheight,
                    backgroundColor,
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default GameMap; 