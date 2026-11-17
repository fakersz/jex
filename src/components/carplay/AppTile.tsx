import React from 'react';

interface AppTileProps {
  title: string;
  icon?: React.ReactNode;
  status: string;
  badge?: React.ReactNode;
  accentColor?: string;
  isMediaTile?: boolean;
  mediaBgUrl?: string;
  mediaBgGradient?: string;
  mediaVideoUrl?: string;
  temperatureHero?: number;
  customControls?: React.ReactNode;
  onClick: () => void;
}

export const AppTile: React.FC<AppTileProps> = ({
  title,
  icon,
  status,
  badge,
  accentColor = '#0a84ff',
  isMediaTile = false,
  mediaBgUrl,
  mediaBgGradient,
  mediaVideoUrl,
  temperatureHero,
  customControls,
  onClick,
}) => {
  if (isMediaTile) {
    return (
      <div
        className="carplay-app-tile carplay-media-fullbleed-tile"
        onClick={onClick}
        role="button"
        tabIndex={0}
        style={{ '--tile-accent': accentColor } as React.CSSProperties}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {/* Fundo Full-Bleed (Vídeo, Imagem, Gradiente Contextual ou Fallback) */}
        {mediaVideoUrl ? (
          <video
            src={mediaVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="carplay-fullbleed-bg"
          />
        ) : mediaBgUrl ? (
          <div
            className="carplay-fullbleed-bg"
            style={{ backgroundImage: `url(${mediaBgUrl})` }}
          />
        ) : mediaBgGradient ? (
          <div
            className="carplay-fullbleed-bg"
            style={{ background: mediaBgGradient }}
          />
        ) : (
          <div className="carplay-fullbleed-fallback">
            <span className="spotify-fallback-logo">🟢</span>
          </div>
        )}

        {/* Overlay em Gradiente Escuro */}
        <div className="carplay-fullbleed-overlay" />

        {/* Conteúdo Posicionado por Cima */}
        <div className="carplay-fullbleed-content">
          <div className="carplay-tile-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {icon && <span style={{ fontSize: '1.2rem' }}>{icon}</span>}
              <span className="carplay-tile-title">{title}</span>
            </div>
            {badge}
          </div>

          <div className="carplay-tile-info">
            {typeof temperatureHero === 'number' && (
              <div className="weather-tile-temp-hero">
                {temperatureHero}°
              </div>
            )}
            <span className="carplay-tile-status media-status">{status}</span>
            {customControls && (
              <div
                className="carplay-tile-direct-controls"
                onClick={(e) => e.stopPropagation()}
              >
                {customControls}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="carplay-app-tile"
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{ '--tile-accent': accentColor } as React.CSSProperties}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="carplay-tile-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="carplay-tile-large-icon">{icon}</span>
          <span className="carplay-tile-title">{title}</span>
        </div>
        {badge}
      </div>

      <div className="carplay-tile-info">
        <span className="carplay-tile-status">{status}</span>
        {customControls && (
          <div
            className="carplay-tile-direct-controls"
            onClick={(e) => e.stopPropagation()}
          >
            {customControls}
          </div>
        )}
      </div>
    </div>
  );
};
