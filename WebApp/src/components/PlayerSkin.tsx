import React, { CSSProperties } from 'react';

type SkinProps = {
  skin: {
    ball: keyof typeof SPRITE_CONFIG.balls.sprites;
    eyes: keyof typeof SPRITE_CONFIG.eyes.sprites;
    mouth: keyof typeof SPRITE_CONFIG.mouths.sprites;
    top: keyof typeof SPRITE_CONFIG.tops.sprites;
  };
  size?: number;
};

// Konfiguration für die Sprite-Positionen (0-basiert)
const SPRITE_CONFIG = {
  balls: {
    spriteSize: 40, // Größe eines einzelnen Sprites
    sprites: {
      'white': 0,
      'red': 1,
      'blue': 2,
      'green': 3,
      'yellow': 4,
      'pink': 5,
      // Weitere Farben hier hinzufügen
    } as const
  },
  eyes: {
    spriteSize: 40,
    sprites: {
      'normal': 0,
      'angry': 1,
      'happy': 2,
      // Weitere Augen-Stile hier hinzufügen
    } as const
  },
  mouths: {
    spriteSize: 40,
    sprites: {
      'normal': 0,
      'happy': 1,
      'sad': 2,
      // Weitere Mund-Stile hier hinzufügen
    } as const
  },
  tops: {
    spriteSize: 40,
    sprites: {
      'none': -1, // Spezialfall: kein Top
      'hat': 0,
      'crown': 1,
      // Weitere Kopfbedeckungen hier hinzufügen
    } as const
  }
} as const;

const PlayerSkin: React.FC<SkinProps> = ({ skin, size = 40 }) => {
  const getSpriteStyle = (type: keyof typeof SPRITE_CONFIG, spriteName: string): CSSProperties | undefined => {
    const config = SPRITE_CONFIG[type];
    const spriteIndex = config.sprites[spriteName as keyof typeof config.sprites];
    
    if (spriteIndex === -1) return undefined;
    
    return {
      width: size,
      height: size,
      background: `url(/sprites/${type}.png)`,
      backgroundPosition: `-${spriteIndex * config.spriteSize}px 0`,
      backgroundSize: `auto ${size}px`,
      imageRendering: 'pixelated',
      position: 'absolute',
      top: 0,
      left: 0,
    };
  };

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={getSpriteStyle('balls', skin.ball)} />
      <div style={getSpriteStyle('eyes', skin.eyes)} />
      <div style={getSpriteStyle('mouths', skin.mouth)} />
      {skin.top !== 'none' && <div style={getSpriteStyle('tops', skin.top)} />}
    </div>
  );
};

export default PlayerSkin; 