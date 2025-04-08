import React from 'react';

interface MapLayer {
  data: number[];
  width: number;
  height: number;
  name: string;
}

interface MapData {
  layers: MapLayer[];
  tilewidth: number;
  tileheight: number;
  width: number;
  height: number;
}

interface GameMapProps {
  mapData: MapData;
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
      {mapData.layers.map((layer, layerIndex) => (
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
                key={`${layerIndex}-${index}`}
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
      ))}
    </div>
  );
};

export default GameMap; 