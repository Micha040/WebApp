import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from '../components/Toast';

type GameHistory = {
  id: string;
  game_date: string;
  winner_id: string;
  winner_username: string;
  duration: number;
  player_count: number;
  difficulty: string;
  players: {
    id: string;
    username: string;
    score: number;
    placement: number;
  }[];
  settings: {
    roundTime: number;
    maxPlayers: number;
    allowHints: boolean;
  };
};

export default function PlayedGamesView() {
  const [games, setGames] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/games/history`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            navigate('/');
            return;
          }
          throw new Error('Fehler beim Laden der Spiele');
        }

        const data = await response.json();
        setGames(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
        setToastMessage(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="loading">Lade Spielhistorie...</div>;
  }

  return (
    <div className="played-games-container">
      <h1>Vergangene Spiele</h1>
      
      {games.length === 0 ? (
        <p className="no-games">Noch keine Spiele gespielt</p>
      ) : (
        <div className="games-list">
          {games.map((game) => (
            <div key={game.id} className="game-card">
              <div className="game-header">
                <span className="game-date">{formatDate(game.game_date)}</span>
                <span className="game-duration">Dauer: {formatDuration(game.duration)}</span>
              </div>
              
              <div className="game-info">
                <div className="winner-info">
                  🏆 Gewinner: <strong>{game.winner_username}</strong>
                </div>
                
                <div className="game-details">
                  <span>👥 {game.player_count} Spieler</span>
                  <span>🎯 {game.difficulty}</span>
                  {game.settings.allowHints && <span>💡 Tipps erlaubt</span>}
                </div>

                <div className="players-list">
                  <h3>Platzierungen:</h3>
                  {game.players
                    .sort((a, b) => a.placement - b.placement)
                    .map((player) => (
                      <div key={player.id} className="player-row">
                        <span className="placement">#{player.placement}</span>
                        <span className="player-name">{player.username}</span>
                        <span className="player-score">{player.score} Punkte</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
    </div>
  );
} 