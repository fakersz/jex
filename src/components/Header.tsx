import React from 'react';
import { AssistantState } from '../types';
import { useFullscreen } from '../hooks/useFullscreen';
import '../styles/Header.css';

interface HeaderProps {
  currentState: AssistantState;
}

export const Header: React.FC<HeaderProps> = ({ currentState }) => {
  const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen();

  return (
    <header className="jex-header glass-panel">
      <div className="header-brand">
        <div className="logo-icon" aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" stroke="url(#cyan-grad)" strokeWidth="2.5" />
            <path d="M20 10V30M10 20H30" stroke="url(#violet-grad)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="20" cy="20" r="5" fill="#00f2fe" />
            <defs>
              <linearGradient id="cyan-grad" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#00f2fe" />
                <stop offset="1" stopColor="#4facfe" />
              </linearGradient>
              <linearGradient id="violet-grad" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#9333ea" />
                <stop offset="1" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="brand-text">
          <h1 className="brand-title">JEX</h1>
          <span className="brand-subtitle">Central Pessoal</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="connection-badge">
          <span className="pulse-dot" aria-hidden="true"></span>
          <span className="connection-text">Modo: {currentState.toUpperCase()}</span>
        </div>

        {isSupported && (
          <button
            type="button"
            className="fullscreen-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Sair do modo tela cheia' : 'Entrar em modo tela cheia'}
            title={isFullscreen ? 'Sair do modo tela cheia' : 'Entrar em modo tela cheia'}
          >
            {isFullscreen ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
                <span className="fullscreen-label">Sair da Tela Cheia</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
                <span className="fullscreen-label">Tela Cheia</span>
              </>
            )}
          </button>
        )}

        <div className="system-pill">
          <span className="pill-label">Docker Node</span>
          <span className="pill-status">Ativo</span>
        </div>
      </div>
    </header>
  );
};
