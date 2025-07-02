// src/components/TicketLobby.jsx
// Simplified version without read-only mode support

import React, { useState, useRef, useEffect } from 'react';
import '../styles.css';
import supabase from '../supabaseClient';

// EstimateEditor component - simplified without read-only support
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
      <span className="estimate-value">{ticket.estimate || 1}</span>
      <span className="estimate-edit-hint">✎</span>
    </span>
  );
};

function TicketLobby({
  tickets,
  setTickets,
  selectedDate,
  applyOptimisticUpdate,
  applyOptimisticDelete,
}) {
  const [updatingTickets, setUpdatingTickets] = useState(new Set());

  const handleUpdateEstimate = async (ticketId, newEstimate) => {
    setUpdatingTickets((prev) => new Set([...prev, ticketId]));

    try {
      const originalTicket = tickets.find((t) => t.id === ticketId);

      applyOptimisticUpdate(ticketId, {
        estimate: newEstimate,
        original_estimate:
          originalTicket.original_estimate || originalTicket.estimate,
      });

      const { error } = await supabase
        .from('tickets')
        .update({
          estimate: newEstimate,
          original_estimate:
            originalTicket.original_estimate || originalTicket.estimate,
        })
        .eq('id', ticketId);

      if (error) throw error;
    } catch (error) {
      const originalTicket = tickets.find((t) => t.id === ticketId);
      applyOptimisticUpdate(ticketId, {
        estimate: originalTicket.estimate,
      });
      throw error;
    } finally {
      setUpdatingTickets((prev) => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const ticket = JSON.parse(e.dataTransfer.getData('application/json'));

    console.log(`🏪 Returning ticket to lobby:`, ticket.ticket);

    applyOptimisticUpdate(ticket.id, {
      assigned_user: null,
      start_index: null,
      date: null,
    });

    const { error } = await supabase
      .from('tickets')
      .update({
        assigned_user: null,
        start_index: null,
        date: null,
      })
      .eq('id', ticket.id);

    if (error) {
      console.error('❌ Failed to return ticket to lobby:', error.message);
      applyOptimisticUpdate(ticket.id, {
        assigned_user: ticket.assigned_user,
        start_index: ticket.start_index,
        date: ticket.date,
      });
    } else {
      console.log(
        `⏪ Successfully returned '${ticket.ticket}' to persistent lobby.`
      );
    }
  };

  const handleTrashDrop = async (e) => {
    e.preventDefault();
    const ticket = JSON.parse(e.dataTransfer.getData('application/json'));

    console.log(`🗑️ Deleting ticket:`, ticket.ticket);

    applyOptimisticDelete(ticket.id);

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticket.id);

    if (error) {
      console.error('❌ Failed to delete ticket:', error.message);
      setTickets((prev) => [...prev, ticket]);
    } else {
      console.log(`✅ Successfully deleted '${ticket.ticket}'`);
    }
  };

  const handleLinkClick = (e, ticket) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.stopImmediatePropagation) {
      e.stopImmediatePropagation();
    }

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
      console.error('❌ Error in handleLinkClick:', error);
      alert('Error opening link: ' + error.message);
    }
  };

  // ✅ SIMPLIFIED: Merge tickets logic without read-only checks
  const mergedTickets = React.useMemo(() => {
    console.log(
      '🔄 MERGING TICKETS - Starting with:',
      tickets.length,
      'tickets'
    );

    const unassigned = tickets.filter(
      (t) => !t.assigned_user && t.date === null
    );
    console.log('📋 Unassigned tickets for merging:', unassigned.length);

    const merged = [];
    const processedIds = new Set();

    const ticketGroups = new Map();

    unassigned.forEach((ticket) => {
      if (processedIds.has(ticket.id)) {
        return;
      }

      if (ticket.type !== 'normal') {
        merged.push(ticket);
        processedIds.add(ticket.id);
        return;
      }

      const baseName = ticket.ticket?.replace(' (Turnover)', '').trim();
      const isCurrentTurnover = ticket.ticket?.includes('(Turnover)');

      const groupKey = `${baseName}|${ticket.category}|${ticket.color_key}`;

      if (!ticketGroups.has(groupKey)) {
        ticketGroups.set(groupKey, {
          originalTickets: [],
          turnoverTickets: [],
          baseName,
          category: ticket.category,
          colorKey: ticket.color_key,
        });
      }

      const group = ticketGroups.get(groupKey);

      if (isCurrentTurnover) {
        group.turnoverTickets.push(ticket);
        console.log(
          `🔄 Added turnover to group "${baseName}":`,
          ticket.estimate
        );
      } else {
        group.originalTickets.push(ticket);
        console.log(
          `📦 Added original to group "${baseName}":`,
          ticket.estimate
        );
      }

      processedIds.add(ticket.id);
    });

    for (const [groupKey, group] of ticketGroups) {
      console.log(`🔍 Processing group "${group.baseName}":`, {
        originals: group.originalTickets.length,
        turnovers: group.turnoverTickets.length,
      });

      if (
        group.originalTickets.length > 0 &&
        group.turnoverTickets.length > 0
      ) {
        console.log(
          `🔄 TRUE MERGE: Original + Turnover for "${group.baseName}"`
        );

        const originalTicket = group.originalTickets[0];
        const restoredEstimate =
          originalTicket.original_estimate || originalTicket.estimate;

        const consolidatedTicket = {
          ...originalTicket,
          estimate: restoredEstimate,
          ticket: group.baseName,
          is_turnover: false,
        };

        console.log(`📊 Creating consolidated ticket:`, consolidatedTicket);

        // Perform database operations for consolidation
        (async () => {
          try {
            const { data: newTicket, error: insertError } = await supabase
              .from('tickets')
              .insert([consolidatedTicket])
              .select()
              .single();

            if (insertError) {
              console.error(
                '❌ Failed to create consolidated ticket:',
                insertError
              );
              return;
            }

            console.log(`✅ Created consolidated ticket:`, newTicket.id);

            const ticketsToDelete = [
              ...group.originalTickets,
              ...group.turnoverTickets,
            ];
            for (const oldTicket of ticketsToDelete) {
              console.log(`🗑️ Deleting old ticket:`, oldTicket.id);
              await supabase.from('tickets').delete().eq('id', oldTicket.id);
            }

            setTickets((prev) => {
              const filtered = prev.filter(
                (t) => !ticketsToDelete.some((old) => old.id === t.id)
              );
              return [...filtered, newTicket];
            });

            console.log(
              `✅ Database consolidation complete for "${group.baseName}"`
            );
          } catch (error) {
            console.error('❌ Error in true merge consolidation:', error);
          }
        })();

        merged.push(consolidatedTicket);
      } else if (group.turnoverTickets.length > 1) {
        console.log(
          `🔗 TRUE MERGE: Multiple turnovers for "${group.baseName}"`
        );

        const totalTurnoverEstimate = group.turnoverTickets.reduce(
          (sum, ticket) => sum + (ticket.estimate || 0),
          0
        );

        const primaryTurnover = group.turnoverTickets[0];
        const consolidatedTurnover = {
          ...primaryTurnover,
          ticket: `${group.baseName} (Turnover)`,
          estimate: totalTurnoverEstimate,
          is_turnover: true,
        };

        console.log(`📊 Creating consolidated turnover:`, consolidatedTurnover);

        (async () => {
          try {
            const { data: newTurnover, error: insertError } = await supabase
              .from('tickets')
              .insert([consolidatedTurnover])
              .select()
              .single();

            if (insertError) {
              console.error(
                '❌ Failed to create consolidated turnover:',
                insertError
              );
              return;
            }

            console.log(`✅ Created consolidated turnover:`, newTurnover.id);

            for (const oldTurnover of group.turnoverTickets) {
              console.log(`🗑️ Deleting old turnover:`, oldTurnover.id);
              await supabase.from('tickets').delete().eq('id', oldTurnover.id);
            }

            setTickets((prev) => {
              const filtered = prev.filter(
                (t) => !group.turnoverTickets.some((old) => old.id === t.id)
              );
              return [...filtered, newTurnover];
            });

            console.log(
              `✅ Turnover consolidation complete for "${group.baseName}"`
            );
          } catch (error) {
            console.error('❌ Error in turnover consolidation:', error);
          }
        })();

        merged.push(consolidatedTurnover);
      } else if (group.originalTickets.length > 1) {
        console.log(
          `📦 CONSOLIDATING: Multiple originals for "${group.baseName}"`
        );

        const primaryOriginal = group.originalTickets[0];

        (async () => {
          try {
            for (let i = 1; i < group.originalTickets.length; i++) {
              const duplicate = group.originalTickets[i];
              console.log(`🗑️ Deleting duplicate original:`, duplicate.id);
              await supabase.from('tickets').delete().eq('id', duplicate.id);
            }

            setTickets((prev) =>
              prev.filter(
                (t) =>
                  !group.originalTickets.slice(1).some((dup) => dup.id === t.id)
              )
            );
          } catch (error) {
            console.error('❌ Error consolidating originals:', error);
          }
        })();

        merged.push(primaryOriginal);
      } else {
        if (group.originalTickets.length > 0) {
          merged.push(group.originalTickets[0]);
        }
        if (group.turnoverTickets.length > 0) {
          merged.push(group.turnoverTickets[0]);
        }
      }
    }

    console.log(
      `✅ MERGING COMPLETE: ${unassigned.length} → ${merged.length} tickets`
    );

    return merged;
  }, [tickets, setTickets]);

  return (
    <div
      id="tickets-area"
      className="ticket-lobby"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {mergedTickets.map((t) => {
        const category = t.category?.toLowerCase();
        const isDesign = category === 'design';
        const isProduction = category === 'production';
        const isSP = category === 'sp';
        const isSpecial = t.type !== 'normal';

        const className = isSpecial
          ? 'special'
          : t.is_turnover
          ? isDesign
            ? 'turnover-design'
            : isSP
            ? 'turnover-sp'
            : 'turnover-production'
          : isDesign
          ? 'design'
          : isSP
          ? 'sp'
          : 'production';

        return (
          <div
            key={t.id}
            className={`ticket-block ${className}`}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify(t));
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
                    color: 'inherit',
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

      {/* Trash dropzone */}
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
