// src/components/TicketLobby.jsx
// QUICK FIX: Disable consolidation to stop database errors

import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../styles.css';
import supabase from '../supabaseClient';

// EstimateEditor component (unchanged)
const EstimateEditor = ({ ticket, onUpdateEstimate, isUpdating = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      setEditValue(ticket.estimate?.toString() || '1');
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, ticket.estimate]);

  const handleStartEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const validateAndSave = async () => {
    setIsValidating(true);
    
    const numValue = parseFloat(editValue);
    if (isNaN(numValue) || numValue <= 0 || numValue > 24) {
      alert('Please enter a valid estimate between 0.5 and 24 hours');
      setIsValidating(false);
      inputRef.current?.focus();
      return;
    }

    const roundedValue = Math.round(numValue * 2) / 2;
    
    try {
      await onUpdateEstimate(ticket.id, roundedValue);
      setIsEditing(false);
      setEditValue('');
    } catch (error) {
      console.error('Failed to update estimate:', error);
      alert('Failed to update estimate. Please try again.');
    }
    
    setIsValidating(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateAndSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setEditValue(value);
    }
  };

  if (isEditing) {
    return (
      <span className="estimate-editor-container">
        <span className="estimate-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={validateAndSave}
            className="estimate-input"
            placeholder="Hours"
            disabled={isValidating}
          />
          <span className="estimate-unit">h</span>
        </span>
        <span className="estimate-actions">
          <button
            onClick={validateAndSave}
            disabled={isValidating}
            className="estimate-save-btn"
            title="Save (Enter)"
          >
            ✓
          </button>
          <button
            onClick={handleCancel}
            disabled={isValidating}
            className="estimate-cancel-btn"
            title="Cancel (Esc)"
          >
            ✕
          </button>
        </span>
      </span>
    );
  }

  return (
    <span 
      className={`estimate-display ${isUpdating ? 'updating' : ''}`}
      onClick={handleStartEdit}
      title="Click to edit estimate"
    >
      <span className="estimate-value">
        {ticket.estimate || 1}
      </span>
      <span className="estimate-edit-hint">✎</span>
    </span>
  );
};

function TicketLobby({ 
  tickets, 
  setTickets, 
  selectedDate, 
  applyOptimisticUpdate, 
  applyOptimisticDelete
}) {
  const [updatingTickets, setUpdatingTickets] = useState(new Set());
  // ✅ Keep processing state but won't be used
  const [processingConsolidation, setProcessingConsolidation] = useState(false);

  const handleUpdateEstimate = async (ticketId, newEstimate) => {
    setUpdatingTickets(prev => new Set([...prev, ticketId]));
    
    try {
      const originalTicket = tickets.find(t => t.id === ticketId);
      
      applyOptimisticUpdate(ticketId, { 
        estimate: newEstimate,
        original_estimate: originalTicket.original_estimate || originalTicket.estimate
      });

      const { error } = await supabase
        .from('tickets')
        .update({ 
          estimate: newEstimate,
          original_estimate: originalTicket.original_estimate || originalTicket.estimate
        })
        .eq('id', ticketId);

      if (error) throw error;
      
    } catch (error) {
      const originalTicket = tickets.find(t => t.id === ticketId);
      applyOptimisticUpdate(ticketId, { 
        estimate: originalTicket.estimate 
      });
      throw error;
    } finally {
      setUpdatingTickets(prev => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
    }
  };

  // ✅ QUICK FIX: Disable consolidation completely
  const consolidateTickets = useCallback(async () => {
    // DISABLED: Ticket consolidation is causing database errors
    console.log('Ticket consolidation temporarily disabled');
    return;
  }, []);

  // Keep the useEffect but it won't do anything
  useEffect(() => {
    const timer = setTimeout(() => {
      consolidateTickets();
    }, 100);

    return () => clearTimeout(timer);
  }, [tickets.length, selectedDate]);

  const handleDrop = async (e) => {
    e.preventDefault();
    const ticket = JSON.parse(e.dataTransfer.getData("application/json"));

    console.log(`Returning ticket to lobby:`, ticket.ticket);

    applyOptimisticUpdate(ticket.id, {
      assigned_user: null,
      start_index: null,
      date: null
    });

    const { error } = await supabase
      .from('tickets')
      .update({
        assigned_user: null,
        start_index: null,
        date: null
      })
      .eq('id', ticket.id);

    if (error) {
      console.error("Failed to return ticket to lobby:", error.message);
      applyOptimisticUpdate(ticket.id, {
        assigned_user: ticket.assigned_user,
        start_index: ticket.start_index,
        date: ticket.date
      });
    }
  };

  const handleTrashDrop = async (e) => {
    e.preventDefault();
    const ticket = JSON.parse(e.dataTransfer.getData("application/json"));

    console.log(`Deleting ticket:`, ticket.ticket);

    applyOptimisticDelete(ticket.id);

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticket.id);

    if (error) {
      console.error("Failed to delete ticket:", error.message);
      setTickets(prev => [...prev, ticket]);
    }
  };

  const handleLinkClick = (e, ticket) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!ticket || !ticket.link) {
      alert('No link available for this ticket');
      return;
    }
    
    const linkValue = ticket.link.toString().trim();
    if (linkValue === '') {
      alert('This ticket has an empty link');
      return;
    }
    
    try {
      let url = linkValue;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        const confirmed = confirm(`Popup blocked! Open ${url} in current tab?`);
        if (confirmed) {
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error('Error in handleLinkClick:', error);
      alert('Error opening link: ' + error.message);
    }
  };

  // ✅ SIMPLE FIX: Just show all unassigned tickets without any processing
  const displayTickets = React.useMemo(() => {
    console.log('Displaying tickets - Starting with:', tickets.length, 'tickets');
    
    const unassigned = tickets.filter(t => !t.assigned_user && t.date === null);
    console.log('Unassigned tickets for display:', unassigned.length);
    
    // No consolidation or deduplication - just show all tickets as-is
    return unassigned;
  }, [tickets]);

  return (
    <div
      id="tickets-area"
      className="ticket-lobby"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {displayTickets.map(t => {
        const category = t.category?.toLowerCase();
        const isDesign = category === 'design';
        const isProduction = category === 'production';
        const isSP = category === 'sp';
        const isSpecial = t.type !== 'normal';

        const className = isSpecial
          ? 'special'
          : t.is_turnover
            ? (isDesign ? 'turnover-design' : isSP ? 'turnover-sp' : 'turnover-production')
            : (isDesign ? 'design' : isSP ? 'sp' : 'production');

        return (
          <div
            key={t.id}
            className={`ticket-block ${className}`}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/json", JSON.stringify(t));
            }}
          >
            <div className="ticket-content">
              {t.link && t.link.trim() !== '' ? (
                <span 
                  className="ticket-name ticket-name-link"
                  onClick={(e) => handleLinkClick(e, t)}
                  title={`Click to open: ${t.link}`}
                  style={{
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    color: 'inherit'
                  }}
                >
                  {t.ticket}
                </span>
              ) : (
                <span className="ticket-name">{t.ticket}</span>
              )}
              
              <EstimateEditor
                ticket={t}
                onUpdateEstimate={handleUpdateEstimate}
                isUpdating={updatingTickets.has(t.id)}
              />
            </div>
          </div>
        );
      })}

      <div
        className="trash-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleTrashDrop}
      >
        🗑
      </div>
    </div>
  );
}

export default TicketLobby;
