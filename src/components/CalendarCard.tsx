import React from 'react';
import { CalendarEvent } from '../types';
import '../styles/Cards.css';

interface CalendarCardProps {
  events: CalendarEvent[];
}

export const CalendarCard: React.FC<CalendarCardProps> = ({ events }) => {
  return (
    <div className="widget-card glass-panel calendar-card">
      <div className="card-header">
        <div className="header-title-group">
          <svg className="card-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <h3>Agenda de Hoje</h3>
        </div>
        <span className="count-badge">{events.length} Eventos</span>
      </div>

      <div className="calendar-event-list">
        {events.map((event) => (
          <div key={event.id} className="event-item">
            <div
              className="category-strip"
              style={{ backgroundColor: event.categoryColor }}
            ></div>
            <div className="event-content">
              <div className="event-time-row">
                <span className="event-time">{event.time}</span>
                <span
                  className="event-category-badge"
                  style={{
                    color: event.categoryColor,
                    borderColor: `${event.categoryColor}40`,
                    backgroundColor: `${event.categoryColor}15`,
                  }}
                >
                  {event.category}
                </span>
              </div>
              <h4 className="event-title">{event.title}</h4>
              {event.location && (
                <span className="event-location">📍 {event.location}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
