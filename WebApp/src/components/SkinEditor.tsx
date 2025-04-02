import { useEffect, useRef, useState } from 'react';

export type Skin = {
    ball: string;
    eyes: string;
    mouth: string;
    top: string;
  };
  

  const ballOptions = ['BlueBall', 'GreenBall', 'RedBall'];
  const eyesOptions = ['Eyes_Default', 'Eyes_Confused'];
  const mouthOptions = ['Mouth_Default', 'Mouth_Smile'];
  const topOptions = ['none']; // kannst du später füllen
  

export default function SkinEditor({
  lobbyId,
  username,
  isHost,
  onSkinChange,
}: {
  lobbyId: string;
  username: string;
  isHost: boolean;
  onSkinChange?: (skin: Skin) => void;
}) {
  const [hatIndex, setHatIndex] = useState(0);
  const [eyesIndex, setEyesIndex] = useState(0);
  const [mouthIndex, setMouthIndex] = useState(0);
  const [topIndex, setTopIndex] = useState(0);

  const lastSkinRef = useRef<string>('');

  const cycle = (arr: string[], index: number, direction: number) =>
    (index + direction + arr.length) % arr.length;

  useEffect(() => {
    const currentSkin: Skin = {
      ball: ballOptions[hatIndex],
      eyes: eyesOptions[eyesIndex],
      mouth: mouthOptions[mouthIndex],
      top: topOptions[topIndex] || 'none',
    };

    const skinString = JSON.stringify(currentSkin);
    if (lastSkinRef.current !== skinString) {
      console.log("🧍 Skin geändert:", currentSkin);
      lastSkinRef.current = skinString;
      if (onSkinChange) onSkinChange(currentSkin);
    }
  }, [hatIndex, eyesIndex, mouthIndex, topIndex, onSkinChange]);

  return (
    <div style={{ textAlign: 'center', color: '#fff' }}>
      <h3>🧍 Skin-Vorschau</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: '1rem',
          alignItems: 'center',
          marginTop: '1rem',
        }}
      >
        {/* Linke Pfeile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button onClick={() => setHatIndex(cycle(ballOptions, hatIndex, -1))}>◀️</button>
          <button onClick={() => setEyesIndex(cycle(eyesOptions, eyesIndex, -1))}>◀️</button>
          <button onClick={() => setMouthIndex(cycle(mouthOptions, mouthIndex, -1))}>◀️</button>
          <button onClick={() => setTopIndex(cycle(topOptions, topIndex, -1))}>◀️</button>
        </div>

        {/* Vorschau-Bereich */}
        <div
          style={{
            position: 'relative',
            width: '150px',
            height: '200px',
            margin: '0 auto',
            imageRendering: 'pixelated',
          }}
        >
          <img
            src={`/skins/Balls/${ballOptions[hatIndex]}.png`}
            alt="hat"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
          />
          <img
            src={`/skins/Eyes/${eyesOptions[eyesIndex]}.png`}
            alt="eyes"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
          />
          <img
            src={`/skins/Mouths/${mouthOptions[mouthIndex]}.png`}
            alt="mouth"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
          />
          {/* top = leer, Platzhalter für später */}
        </div>

        {/* Rechte Pfeile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button onClick={() => setHatIndex(cycle(ballOptions, hatIndex, 1))}>▶️</button>
          <button onClick={() => setEyesIndex(cycle(eyesOptions, eyesIndex, 1))}>▶️</button>
          <button onClick={() => setMouthIndex(cycle(mouthOptions, mouthIndex, 1))}>▶️</button>
          <button onClick={() => setTopIndex(cycle(topOptions, topIndex, 1))}>▶️</button>
        </div>
      </div>
    </div>
  );
}
