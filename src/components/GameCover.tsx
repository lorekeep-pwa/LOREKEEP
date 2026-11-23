import type { Game } from '../types/models';
import { getGameInitials } from '../utils/format';

interface GameCoverProps {
  game: Pick<Game, 'title' | 'platform' | 'coverDataUrl' | 'coverAccent'>;
  showPlatformBadge?: boolean;
  className?: string;
}

export function GameCover({
  game,
  showPlatformBadge = true,
  className = '',
}: GameCoverProps) {
  const accent = game.coverAccent || '#5B6EF5';

  return (
    <div
      className={`lk-game-cover ${className}`.trim()}
      style={
        !game.coverDataUrl
          ? {
              background: `linear-gradient(155deg, ${accent}38 0%, var(--bg-elevated) 52%, var(--bg-recessed) 100%)`,
            }
          : undefined
      }
    >
      {game.coverDataUrl ? (
        <>
          <img src={game.coverDataUrl} alt={`Cover art for ${game.title}`} />
          {showPlatformBadge && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span className="lk-game-cover-platform">{game.platform}</span>
            </div>
          )}
        </>
      ) : (
        <div className="lk-game-cover-fallback">
          <div
            style={{
              width: 32,
              height: 3.5,
              borderRadius: 99,
              background: accent,
            }}
            aria-hidden="true"
          />
          <div>
            <div className="lk-game-monogram" aria-hidden="true">
              {getGameInitials(game.title)}
            </div>
            {showPlatformBadge && (
              <div style={{ marginTop: 10 }}>
                <span className="lk-game-cover-platform">{game.platform}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
