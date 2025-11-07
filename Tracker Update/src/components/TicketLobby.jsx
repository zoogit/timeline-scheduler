// src/components/TicketLobby.jsx
// Manual drag-to-merge consolidation system

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
  const [merging, setMerging] = useState(false);
  const [dragOverTicket, setDragOverTicket] = useState(null);
  const [canMerge, setCanMerge] = useState(false);

  // Helper function to get base ticket name (without "(Turnover)" suffix)
  const getBaseTicketName = (ticketName) => {
    return ticketName.replace(/\s*\(Turnover\)\s*$/, '').trim();
  };

  // Helper function to check if ticket is a turnover
  const isTurnoverTicket = (ticketName) => {
    return ticketName.includes('(Turnover)');
  };

  // Check if two tickets can be merged
  const canTicketsMerge = (draggedTicket, targetTicket) => {
    if (!draggedTicket || !targetTicket || draggedTicket.id === targetTicket.id) {
      return false;
    }
    
    const draggedBase = getBaseTicketName(draggedTicket.ticket);
    const targetBase = getBaseTicketName(targetTicket.ticket);
    
    return draggedBase === targetBase;
  };

  // Perform the merge operation
  const mergeTickets = async (sourceTicket, targetTicket) => {
    if (!canTicketsMerge(sourceTicket, targetTicket)) {
      return;
    }

    setMerging(true);
    console.log('Merging tickets:', sourceTicket.ticket, 'into', targetTicket.ticket);

    try {
      const sourceIsTurnover = isTurnoverTicket(sourceTicket.ticket);
      const targetIsTurnover = isTurnoverTicket(targetTicket.ticket);
      
      let mergedTicket;
      
      if (sourceIsTurnover && targetIsTurnover) {
        // Both turnovers: Add estimates, keep turnover status
        mergedTicket = {
          ...targetTicket,
          estimate: (sourceTicket.estimate || 1) + (targetTicket.estimate || 1),
          original_estimate: Math.max(
            sourceTicket.original_estimate || sourceTicket.estimate || 1,
            targetTicket.original_estimate || targetTicket.estimate || 1
          )
        };
      } else if (sourceIsTurnover || targetIsTurnover) {
        // One is turnover, one is original: Restore original estimate and name
        const originalTicket = sourceIsTurnover ? targetTicket : sourceTicket;
        const turnoverTicket = sourceIsTurnover ? sourceTicket : targetTicket;
        
        // Calculate total estimate: original + turnover
        const totalEstimate = (originalTicket.estimate || 1) + (turnoverTicket.estimate || 1);
        
        mergedTicket = {
          ...targetTicket,
          ticket: getBaseTicketName(originalTicket.ticket), // Remove (Turnover) suffix
          estimate: totalEstimate, // Combined estimate
          original_estimate: totalEstimate, // This becomes the new original
          is_turnover: false
        };
      } else {
        // Both are originals: Keep target, use its estimate
        mergedTicket = {
          ...targetTicket,
          estimate: targetTicket.estimate || 1,
          original_estimate: targetTicket.original_estimate || targetTicket.estimate || 1
        };
      }

      console.log('Merge calculation:', {
        source: { ticket: sourceTicket.ticket, estimate: sourceTicket.estimate, isTurnover: sourceIsTurnover },
        target: { ticket: targetTicket.ticket, estimate: targetTicket.estimate, isTurnover: targetIsTurnover },
        result: { ticket: mergedTicket.ticket, estimate: mergedTicket.estimate }
      });

      // Apply optimistic update first
      applyOptimisticUpdate(targetTicket.id, mergedTicket);
      applyOptimisticDelete(sourceTicket.id);

      // Update target ticket in database with retry logic
      let updateSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error: updateError } = await supabase
          .from('tickets')
          .update({
            ticket: mergedTicket.ticket,
            estimate: mergedTicket.estimate,
            original_estimate: mergedTicket.original_estimate,
            is_turnover: mergedTicket.is_turnover || false
          })
          .eq('id', targetTicket.id);

        if (!updateError) {
          updateSuccess = true;
          break;
        } else if (attempt === 3) {
          throw updateError;
        } else {
          console.warn(`Update attempt ${attempt} failed, retrying...`, updateError);
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        }
      }

      if (updateSuccess) {
        // Delete source ticket from database with retry logic
        let deleteSuccess = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          const { error: deleteError } = await supabase
            .from('tickets')
            .delete()
            .eq('id', sourceTicket.id);

          if (!deleteError) {
            deleteSuccess = true;
            break;
          } else if (attempt === 3) {
            throw deleteError;
          } else {
            console.warn(`Delete attempt ${attempt} failed, retrying...`, deleteError);
            await new Promise(resolve => setTimeout(resolve, 200 * attempt));
          }
        }

        if (deleteSuccess) {
          console.log('Successfully merged tickets');
        }
      }

    } catch (error) {
      console.error('Failed to merge tickets:', error);
      
      // More specific error handling
      if (error.code === '23505') {
        console.error('Unique constraint violation - tickets might already be merged');
      } else if (error.code === '23503') {
        console.error('Foreign key constraint violation');
      } else {
        alert('Failed to merge tickets. Please try again.');
      }
      
      // Revert optimistic updates
      applyOptimisticUpdate(targetTicket.id, targetTicket);
      setTickets(prev => [...prev, sourceTicket]);
    } finally {
      setMerging(false);
    }
  };

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

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOverTicket(null);
    setCanMerge(false);

    const draggedTicket = JSON.parse(e.dataTransfer.getData("application/json"));
    const targetElement = e.target.closest('.ticket-block');
    
    if (targetElement) {
      // Dropped on a ticket - attempt merge
      const targetTicketId = targetElement.getAttribute('data-ticket-id');
      const targetTicket = tickets.find(t => t.id === targetTicketId);
      
      if (targetTicket && canTicketsMerge(draggedTicket, targetTicket)) {
        await mergeTickets(draggedTicket, targetTicket);
        return;
      }
    }

    // Default behavior: return to lobby
    console.log(`Returning ticket to lobby:`, draggedTicket.ticket);

    applyOptimisticUpdate(draggedTicket.id, {
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
      .eq('id', draggedTicket.id);

    if (error) {
      console.error("Failed to return ticket to lobby:", error.message);
      applyOptimisticUpdate(draggedTicket.id, {
        assigned_user: draggedTicket.assigned_user,
        start_index: draggedTicket.start_index,
        date: draggedTicket.date
      });
    }
  };

  const handleDragOver = (e, targetTicket = null) => {
    e.preventDefault();
    
    if (targetTicket) {
      const draggedData = e.dataTransfer.types.includes('application/json');
      if (draggedData) {
        setDragOverTicket(targetTicket.id);
        
        // We can't access drag data during dragover, so we'll check during dragenter
        // For now, just show potential drop zone
        setCanMerge(true);
      }
    } else {
      setDragOverTicket(null);
      setCanMerge(false);
    }
  };

  const handleDragEnter = (e, targetTicket) => {
    e.preventDefault();
    
    try {
      // Try to peek at drag data to validate merge possibility
      const dragData = e.dataTransfer.getData("application/json");
      if (dragData) {
        const draggedTicket = JSON.parse(dragData);
        const canMergeTickets = canTicketsMerge(draggedTicket, targetTicket);
        setCanMerge(canMergeTickets);
      }
    } catch (error) {
      // DataTransfer data might not be available during dragenter
      // Visual feedback will be generic
    }
  };

  const handleDragLeave = (e) => {
    // Only clear if leaving the ticket entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTicket(null);
      setCanMerge(false);
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

  // Auto-consolidation check when tickets change
  const autoConsolidate = useCallback(async () => {
    const unassigned = tickets.filter(
        t => !t.assigned_user && 
            t.date === null &&
            t.type === 'normal'  // ← NEW: "And only if it's a normal/production ticket"
);
// This says: "Get unassigned tickets in lobby that are PRODUCTION type"
// Special tickets are skipped
```
    
    // Group tickets by base name
    const ticketGroups = {};
    unassigned.forEach(ticket => {
      const baseName = getBaseTicketName(ticket.ticket);
      if (!ticketGroups[baseName]) {
        ticketGroups[baseName] = [];
      }
      ticketGroups[baseName].push(ticket);
    });
    
    // Find groups with multiple tickets that should be merged
    for (const [baseName, group] of Object.entries(ticketGroups)) {
      if (group.length > 1) {
        console.log(`Auto-consolidating ${group.length} tickets for "${baseName}"`);
        
        // Sort: originals first, then turnovers
        group.sort((a, b) => {
          const aIsTurnover = isTurnoverTicket(a.ticket);
          const bIsTurnover = isTurnoverTicket(b.ticket);
          if (aIsTurnover && !bIsTurnover) return 1;
          if (!aIsTurnover && bIsTurnover) return -1;
          return 0;
        });
        
        // Merge all into the first ticket
        const targetTicket = group[0];
        const sourceTickets = group.slice(1);
        
        for (const sourceTicket of sourceTickets) {
          try {
            await mergeTickets(sourceTicket, targetTicket);
            // Small delay to prevent overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Failed to auto-consolidate ${sourceTicket.ticket}:`, error);
          }
        }
      }
    }
  }, [tickets, mergeTickets]);

  // Run auto-consolidation when tickets change
  useEffect(() => {
    const timer = setTimeout(() => {
      autoConsolidate();
    }, 500); // Small delay to batch changes

    return () => clearTimeout(timer);
  }, [tickets.length]); // Only run when ticket count changes

  // Display tickets after potential consolidation
  const displayTickets = React.useMemo(() => {
    console.log('Displaying tickets - Starting with:', tickets.length, 'tickets');
    
    const unassigned = tickets.filter(t => !t.assigned_user && t.date === null);
    console.log('Unassigned tickets for display:', unassigned.length);
    
    return unassigned;
  }, [tickets]);

  return (
    <div
      id="tickets-area"
      className="ticket-lobby"
      onDragOver={(e) => handleDragOver(e)}
      onDrop={handleDrop}
    >
      {merging && (
        <div className="merge-indicator">
          Merging tickets...
        </div>
      )}
      
      {displayTickets.map(t => {
        const category = t.category?.toLowerCase();
        const isDesign = category === 'design';
        const isProduction = category === 'production';
        const isSP = category === 'sp';
        const isSpecial = t.type !== 'normal';
        const isDragTarget = dragOverTicket === t.id;

        const className = isSpecial
          ? 'special'
          : t.is_turnover
            ? (isDesign ? 'turnover-design' : isSP ? 'turnover-sp' : 'turnover-production')
            : (isDesign ? 'design' : isSP ? 'sp' : 'production');

        return (
          <div
            key={t.id}
            data-ticket-id={t.id}
            className={`ticket-block ${className} ${
              isDragTarget ? (canMerge ? 'merge-target-valid' : 'merge-target-invalid') : ''
            }`}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/json", JSON.stringify(t));
            }}
            onDragOver={(e) => handleDragOver(e, t)}
            onDragEnter={(e) => handleDragEnter(e, t)}
            onDragLeave={handleDragLeave}
            title={isDragTarget && canMerge ? `Drop here to merge with ${t.ticket}` : undefined}
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
            
            {isDragTarget && (
              <div className={`merge-indicator ${canMerge ? 'valid' : 'invalid'}`}>
                {canMerge ? '🔗 Merge' : '❌ Cannot merge'}
              </div>
            )}
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

