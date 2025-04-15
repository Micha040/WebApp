import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type User = {
  username: string;
  email: string;
  avatar_url?: string;
};

type UserMenuProps = {
  user: User;
  onLogout: () => void;
};

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        onLogout();
      }
    } catch (err) {
      console.error('Fehler beim Logout:', err);
    }
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="user-menu">
      <div className="user-avatar" onClick={() => setIsOpen(!isOpen)}>
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.username} />
        ) : (
          getInitials(user.username)
        )}
      </div>

      {isOpen && (
        <div className="user-dropdown">
          <div className="user-dropdown-item">
            <span>👤</span> {user.username}
          </div>
          <div className="user-dropdown-item">
            <span>📧</span> {user.email}
          </div>
          <div className="user-dropdown-divider" />
          <div className="user-dropdown-item" onClick={() => navigate('/profile')}>
            <span>⚙️</span> Profil bearbeiten
          </div>
          <div className="user-dropdown-item" onClick={handleLogout}>
            <span>🚪</span> Abmelden
          </div>
        </div>
      )}
    </div>
  );
} 