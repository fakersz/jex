import React, { useEffect } from 'react';
import './WidgetModal.css';

interface WidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

export const WidgetModal: React.FC<WidgetModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footerActions,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="widget-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="widget-modal-title"
    >
      <div className="widget-modal-container glass-panel animate-scale-in">
        <div className="widget-modal-header">
          <div className="widget-modal-title-group">
            {icon && <span className="widget-modal-icon">{icon}</span>}
            <h2 id="widget-modal-title">{title}</h2>
          </div>
          <button
            type="button"
            className="widget-modal-close-btn"
            onClick={onClose}
            aria-label="Fechar painel expandido"
          >
            ✕
          </button>
        </div>

        <div className="widget-modal-body">{children}</div>

        {footerActions && <div className="widget-modal-footer">{footerActions}</div>}
      </div>
    </div>
  );
};
