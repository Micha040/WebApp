import { useState } from 'react';
import { Modal } from './Modal';

type Props = {
  lobby: any;
  username: string;
  onClose: () => void;
  onSubmit: (username: string, password: string) => void;
};

export default function JoinLobbyModal({ lobby, username: initialUsername, onClose, onSubmit }: Props) {
  const [username, setUsername] = useState(initialUsername || '');
  const [password, setPassword] = useState('');

  return (
    <Modal title={`🔒 Lobby "${lobby.name}" beitreten`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Dein Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={() => onSubmit(username.trim(), password)}
          disabled={!username.trim()}
        >
          🔑 Beitreten
        </button>
      </div>
    </Modal>
  );
}
