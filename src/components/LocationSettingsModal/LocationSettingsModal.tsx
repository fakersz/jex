import React, { useState, useEffect } from 'react';
import { LocationPreferences, LocationSource } from '../../types/location';
import './LocationSettingsModal.css';

interface LocationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreferences: LocationPreferences;
  currentSource: LocationSource;
  onSave: (newPrefs: LocationPreferences) => void;
  onClearManual: () => void;
  onRetryGeo: () => void;
}

export const LocationSettingsModal: React.FC<LocationSettingsModalProps> = ({
  isOpen,
  onClose,
  currentPreferences,
  currentSource,
  onSave,
  onClearManual,
  onRetryGeo,
}) => {
  const [useAutomatic, setUseAutomatic] = useState<boolean>(currentPreferences.useAutomatic);
  const [manualCity, setManualCity] = useState<string>(currentPreferences.manualCity);
  const [manualState, setManualState] = useState<string>(currentPreferences.manualState);

  useEffect(() => {
    setUseAutomatic(currentPreferences.useAutomatic);
    setManualCity(currentPreferences.manualCity);
    setManualState(currentPreferences.manualState);
  }, [currentPreferences, isOpen]);

  // Handle Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      useAutomatic,
      manualCity: manualCity.trim(),
      manualState: manualState.trim(),
    });
    onClose();
  };

  const handleClear = () => {
    onClearManual();
    setManualCity('');
    setManualState('');
    setUseAutomatic(true);
  };

  const getSourceLabel = (src: LocationSource) => {
    switch (src) {
      case 'automatic':
        return 'Automática (GPS do Navegador)';
      case 'manual':
        return 'Manual (Definida pelo Usuário)';
      case 'fallback':
        return 'Padrão do Sistema (São Paulo, SP)';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
      >
        <div className="modal-header">
          <div className="header-title-group">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <h2 id="location-modal-title">Configurar Localização</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Fechar janela de configuração de localização"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="current-source-banner">
            <span className="banner-label">Origem atual:</span>
            <span className={`banner-value source-${currentSource}`}>
              {getSourceLabel(currentSource)}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="location-form">
            <div className="form-toggle-row">
              <label htmlFor="geo-auto-checkbox" className="toggle-label">
                <input
                  type="checkbox"
                  id="geo-auto-checkbox"
                  checked={useAutomatic}
                  onChange={(e) => setUseAutomatic(e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                <span>Usar localização automática pelo navegador</span>
              </label>
            </div>

            <div className={`manual-fields-group ${useAutomatic ? 'disabled' : ''}`}>
              <p className="section-description">
                Ou informe sua localização manualmente se preferir:
              </p>

              <div className="form-group">
                <label htmlFor="manual-city-input">Cidade</label>
                <input
                  type="text"
                  id="manual-city-input"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="Ex: Graúna, Vitória, Curitiba..."
                  disabled={useAutomatic}
                />
              </div>

              <div className="form-group">
                <label htmlFor="manual-state-input">Estado ou Região</label>
                <input
                  type="text"
                  id="manual-state-input"
                  value={manualState}
                  onChange={(e) => setManualState(e.target.value)}
                  placeholder="Ex: ES, SP, PR..."
                  disabled={useAutomatic}
                />
              </div>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  onRetryGeo();
                  onClose();
                }}
              >
                Tentar GPS Novamente
              </button>

              <button
                type="button"
                className="btn-danger"
                onClick={handleClear}
              >
                Limpar Manual
              </button>

              <button type="submit" className="btn-primary">
                Salvar Preferências
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
