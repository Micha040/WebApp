import { useState } from 'react';
import { Modal } from './Modal';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: {
    id: string;
    email: string;
    username: string;
    avatar_url?: string;
  }) => void;
};

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? { email, password } : { email, username, password }),
        credentials: 'include', // Wichtig für Cookie-basierte Sessions
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ein Fehler ist aufgetreten');
      }

      onSuccess({
        id: data.id,
        email: data.email,
        username: data.username,
        avatar_url: data.avatar_url,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    }
  };

  return (
    <Modal title={isLogin ? "Anmelden" : "Registrieren"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">E-Mail</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="modal-input"
          />
        </div>

        {!isLogin && (
          <div className="form-group">
            <label htmlFor="username">Benutzername</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="modal-input"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="password">Passwort</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="modal-input"
          />
        </div>

        {!isLogin && (
          <div className="form-group">
            <label htmlFor="confirmPassword">Passwort bestätigen</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="modal-input"
            />
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="modal-submit-button">
          {isLogin ? "Anmelden" : "Registrieren"}
        </button>

        <p className="auth-switch">
          {isLogin ? "Noch kein Konto?" : "Bereits registriert?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="auth-switch-button"
          >
            {isLogin ? "Registrieren" : "Anmelden"}
          </button>
        </p>
      </form>
    </Modal>
  );
} 