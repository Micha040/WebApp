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
  localStorage.setItem("username", username);

  return (
    <Modal title={`🔒 Lobby "${lobby.name}" beitreten`} onClose={onClose}>
      <div className="join-lobby-form">
        <input
          type="text"
          placeholder="Dein Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="modal-input"
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="modal-input"
        />
        <button
          onClick={() => onSubmit(username.trim(), password)}
          disabled={!username.trim()}
          className="modal-submit-button"
        >
          🔑 Beitreten
        </button>
      </div>
    </Modal>
  );
}
