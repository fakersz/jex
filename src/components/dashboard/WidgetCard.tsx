import React from 'react';
import './WidgetCard.css';

interface WidgetCardProps {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  gridAreaClass?: string;
  onClickExpand?: () => void;
  children: React.ReactNode;
  expandLabel?: string;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  icon,
  badge,
  gridAreaClass = 'col-span-4',
  onClickExpand,
  children,
  expandLabel = 'Expandir',
}) => {
  return (
    <div
      className={`dashboard-widget-card glass-panel ${gridAreaClass}`}
      onClick={onClickExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClickExpand) {
          e.preventDefault();
          onClickExpand();
        }
      }}
      aria-label={`Expandir widget ${title}`}
    >
      <div className="widget-card-header">
        <div className="widget-card-title-group">
          {icon && <span className="widget-card-icon">{icon}</span>}
          <h3 className="widget-card-title">{title}</h3>
        </div>

        <div className="widget-card-header-actions">
          {badge}
          {onClickExpand && (
            <button
              type="button"
              className="widget-expand-trigger"
              onClick={(e) => {
                e.stopPropagation();
                onClickExpand();
              }}
              title={`${expandLabel} ${title}`}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="widget-card-body-summary">{children}</div>
    </div>
  );
};
