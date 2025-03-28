import { useState } from 'react';

type SkinEditorProps = {
  lobbyId: string;
  username: string;
  isHost: boolean;
};

export default function SkinEditor({ lobbyId, username, isHost }: SkinEditorProps) {
  const [skin, setSkin] = useState({
    hat: 'none',
    top: 'tshirt',
    bottom: 'jeans',
    shoes: 'sneakers_white',
  });

  const updateSkinPart = async (part: string, value: string) => {
    setSkin((prev) => ({ ...prev, [part]: value }));

    await fetch(`http://localhost:3000/lobby/${lobbyId}/skin/${username}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ part, value }),
    });
  };

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      padding: '1.5rem',
      borderRadius: '10px',
      boxShadow: '0 0 10px rgba(0,0,0,0.3)',
      maxWidth: '500px'
    }}>
      <h2>🧍 Skin-Editor</h2>

      <label>
        🧢 Mütze:
        <select
          value={skin.hat}
          onChange={(e) => updateSkinPart('hat', e.target.value)}
        >
          <option value="none">Keine</option>
          <option value="cap_red">Rote Kappe</option>
          <option value="beanie">Mütze</option>
        </select>
      </label>

      <label>
        👕 Oberteil:
        <select
          value={skin.top}
          onChange={(e) => updateSkinPart('top', e.target.value)}
        >
          <option value="tshirt">T-Shirt</option>
          <option value="hoodie_blue">Blauer Hoodie</option>
        </select>
      </label>

      <label>
        👖 Unterteil:
        <select
          value={skin.bottom}
          onChange={(e) => updateSkinPart('bottom', e.target.value)}
        >
          <option value="jeans">Jeans</option>
          <option value="shorts">Shorts</option>
        </select>
      </label>

      <label>
        👟 Schuhe:
        <select
          value={skin.shoes}
          onChange={(e) => updateSkinPart('shoes', e.target.value)}
        >
          <option value="sneakers_white">Weiße Sneaker</option>
          <option value="boots">Stiefel</option>
        </select>
      </label>
    </div>
  );
}
