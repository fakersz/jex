import React from 'react';

interface AppDockProps {
  activeTab: string;
  isListening: boolean;
  onNavigate: (tab: string) => void;
  onToggleMic: () => void;
}

export const AppDock: React.FC<AppDockProps> = ({
  activeTab,
  isListening,
  onNavigate,
  onToggleMic,
}) => {
  return (
    <nav className="carplay-bottom-dock" aria-label="Navegação Principal JEX">
      <button
        type="button"
        className={`carplay-dock-btn ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onNavigate('home')}
        title="Início"
      >
        <span className="dock-icon">🏠</span>
        <span className="carplay-dock-label">Início</span>
      </button>

      <button
        type="button"
        className={`carplay-dock-btn mic-btn ${isListening ? 'listening' : ''}`}
        onClick={onToggleMic}
        title={isListening ? 'Ouvindo...' : 'Assistente de Voz'}
      >
        <span className="dock-icon">🎙️</span>
        <span className="carplay-dock-label">Falar</span>
      </button>

      <button
        type="button"
        className={`carplay-dock-btn ${activeTab === 'music' ? 'active' : ''}`}
        onClick={() => onNavigate('music')}
        title="Música"
      >
        <span className="dock-icon">🎵</span>
        <span className="carplay-dock-label">Música</span>
      </button>

      <button
        type="button"
        className={`carplay-dock-btn ${activeTab === 'timers' || activeTab === 'alarms' ? 'active' : ''}`}
        onClick={() => onNavigate('timers')}
        title="Alertas"
      >
        <span className="dock-icon">⏰</span>
        <span className="carplay-dock-label">Alertas</span>
      </button>

      <button
        type="button"
        className={`carplay-dock-btn ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onNavigate('settings')}
        title="Ajustes"
      >
        <span className="dock-icon">⚙️</span>
        <span className="carplay-dock-label">Ajustes</span>
      </button>
    </nav>
  );
};
