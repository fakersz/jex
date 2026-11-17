import React from 'react';

interface CarPlayTopBarProps {
  timeString: string;
  assistantLabel: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const CarPlayTopBar: React.FC<CarPlayTopBarProps> = ({
  timeString,
  assistantLabel,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <header className="carplay-top-bar" aria-label="Barra Superior CarPlay">
      <div className="carplay-top-left">
        <span className="carplay-top-time">{timeString}</span>
        <span className="carplay-top-brand-badge">⚡ JEX</span>
      </div>

      <div className="carplay-top-right">
        <span className="carplay-top-status-badge">
          <span className="status-dot-green" />
          {assistantLabel}
        </span>
        <button
          type="button"
          className="carplay-top-fullscreen-btn"
          onClick={onToggleFullscreen}
          title="Alternar Tela Cheia"
        >
          {isFullscreen ? '↙' : '⛶'}
        </button>
      </div>
    </header>
  );
};
