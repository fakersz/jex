import React from 'react';

interface FullscreenPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const FullscreenPanel: React.FC<FullscreenPanelProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="carplay-fullscreen-overlay">
      <div className="carplay-panel-header">
        <button type="button" className="carplay-back-btn" onClick={onClose} title="Voltar para a Home">
          ← Voltar
        </button>
        <h2 className="carplay-panel-title">
          {icon && <span style={{ marginRight: '0.4rem' }}>{icon}</span>}
          {title}
        </h2>
        <div style={{ width: 60 }} />
      </div>

      <div className="carplay-panel-body">{children}</div>
    </div>
  );
};
