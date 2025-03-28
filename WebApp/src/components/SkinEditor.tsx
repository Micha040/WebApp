import { useState } from 'react';

const hatOptions = ['keine', 'basecap', 'cowboyhut'];
const topOptions = ['tshirt', 'hoodie', 'anzug'];
const bottomOptions = ['jeans', 'shorts', 'hose'];
const shoeOptions = ['sneaker', 'stiefel', 'sandalen'];

export default function SkinEditor({
  lobbyId,
  username,
  isHost,
}: {
  lobbyId: string;
  username: string;
  isHost: boolean;
}) {
  const [hatIndex, setHatIndex] = useState(0);
  const [topIndex, setTopIndex] = useState(0);
  const [bottomIndex, setBottomIndex] = useState(0);
  const [shoeIndex, setShoeIndex] = useState(0);

  const cycle = (arr: string[], index: number, direction: number) =>
    (index + direction + arr.length) % arr.length;

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
          <button onClick={() => setHatIndex(cycle(hatOptions, hatIndex, -1))}>◀️</button>
          <button onClick={() => setTopIndex(cycle(topOptions, topIndex, -1))}>◀️</button>
          <button onClick={() => setBottomIndex(cycle(bottomOptions, bottomIndex, -1))}>◀️</button>
          <button onClick={() => setShoeIndex(cycle(shoeOptions, shoeIndex, -1))}>◀️</button>
        </div>

        {/* Vorschau-Bereich */}
        <div
          style={{
            position: 'relative',
            width: '150px',
            height: '200px',
            margin: '0 auto',
          }}
        >
          <img
            src="/skins/base.png"
            alt="base"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
          />
          {hatOptions[hatIndex] !== 'keine' && (
            <img
              src={`/skins/hat/${hatOptions[hatIndex]}.png`}
              alt="hat"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
            />
          )}
          <img
            src={`/skins/top/${topOptions[topIndex]}.png`}
            alt="top"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
          />
          <img
            src={`/skins/bottom/${bottomOptions[bottomIndex]}.png`}
            alt="bottom"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
          />
          <img
            src={`/skins/shoes/${shoeOptions[shoeIndex]}.png`}
            alt="shoes"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
          />
        </div>

        {/* Rechte Pfeile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button onClick={() => setHatIndex(cycle(hatOptions, hatIndex, 1))}>▶️</button>
          <button onClick={() => setTopIndex(cycle(topOptions, topIndex, 1))}>▶️</button>
          <button onClick={() => setBottomIndex(cycle(bottomOptions, bottomIndex, 1))}>▶️</button>
          <button onClick={() => setShoeIndex(cycle(shoeOptions, shoeIndex, 1))}>▶️</button>
        </div>
      </div>
    </div>
  );
}
