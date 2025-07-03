import React, { useState, useRef, useMemo } from 'react';
import '../styles.css';
import supabase from '../supabaseClient';

// ✅ UPDATED: Corrected SHIFT_WINDOWS based on GMT times converted to PST
// Each position = 30 minutes, 0 = midnight PST
// GMT to PST conversion: GMT - 8 hours = PST
const SHIFT_WINDOWS = {
  // London Team - Convert GMT times to PST (GMT - 8 hours)
  // Andrew, Mitchell, Nicole, Solveiga: 8AM-3:30PM GMT = 12AM-7:30AM PST (0-15)
  Andrew: { start: 0, end: 16 }, // 12am-7:30am PST
  Mitchell: { start: 0, end: 16 }, // 12am-7:30am PST
  Nicole: { start: 0, end: 16 }, // 12am-7:30am PST
  Solveiga: { start: 0, end: 16 }, // 12am-7:30am PST

  // Andrei, Bella, Emma, Goldee, Simona: 9AM-4:30PM GMT = 1AM-8:30AM PST (2-17)
  Andrei: { start: 2, end: 18 }, // 1am-8:30am PST
  Bella: { start: 2, end: 18 }, // 1am-8:30am PST
  Emma: { start: 2, end: 18 }, // 1am-8:30am PST
  Goldee: { start: 2, end: 18 }, // 1am-8:30am PST
  Simona: { start: 2, end: 18 }, // 1am-8:30am PST

  // Day Team - Convert GMT times to PST (GMT - 8 hours)
  // Ade, Claire, Gabrielle, Jane, Melanie, Paulina, Rose, Toby: 4PM-12AM GMT = 8AM-4PM PST (16-32)
  Ade: { start: 16, end: 32 }, // 8am-4pm PST
  Claire: { start: 16, end: 32 }, // 8am-4pm PST
  Gabrielle: { start: 16, end: 34 }, // 8am-4pm PST
  Jane: { start: 16, end: 34 }, // 8am-4pm PST
  Melanie: { start: 16, end: 32 }, // 8am-4pm PST
  Paulina: { start: 16, end: 34 }, // 8am-4pm PST
  Rose: { start: 16, end: 34 }, // 8am-4pm PST
  Toby: { start: 16, end: 32 }, // 8am-4pm PST
  Nousha: { start: 16, end: 34 }, // 8am-5pm PST

  // Stephanie, Susan, Victoria: 2:30PM-11PM GMT = 6:30AM-3PM PST (13-30)
  Stephanie: { start: 12, end: 30 }, // 6:30am-3pm PST
  Susan: { start: 12, end: 30 }, // 6:30am-3pm PST
  Victoria: { start: 14, end: 32 }, // 6:30am-3pm PST

  // Night Team - Convert GMT times to PST (GMT - 8 hours)
  // Ashley: 9PM GMT-6AM GMT = 1PM PST-10PM PST (26-44)
  Ashley: { start: 26, end: 44 }, // 1pm-10pm PST

  // Doue: 9PM GMT-4:30AM GMT = 1PM PST-8:30PM PST (26-41)
  Doue: { start: 24, end: 41 }, // 1pm-8:30pm PST

  // Shaida: 9PM GMT-3:30AM GMT = 1PM PST-7:30PM PST (26-39)
  Shaida: { start: 22, end: 39 }, // 1pm-7:30pm PST

  // Marie: 9:30PM GMT-6AM GMT = 1:30PM PST-10PM PST (27-44)
  Marie: { start: 27, end: 44 }, // 1:30pm-10pm PST

  // Danissa, Matt: 11PM GMT-8AM GMT = 3PM PST-12AM PST (30-48)
  Danissa: { start: 30, end: 48 }, // 3pm-12am PST
  Matt: { start: 30, end: 48 }, // 3pm-12am PST

  // ✅ UPDATED: SP Team - More reasonable working hours
  // Beth: 8AM-4PM PST (16-32) - Standard business hours
  Beth: { start: 16, end: 32 }, // 8am-4pm PST

  // James: 1AM-8:30AM PST (2-17) - Early morning coverage
  James: { start: 2, end: 17 }, // 1am-8:30am PST

  // Lisa: 1AM-8:30AM PST (2-17) - Early morning coverage
  Lisa: { start: 2, end: 17 }, // 1am-8:30am PST

  // Sophia: 12AM-7:30AM PST (0-15) - Overnight coverage
  Sophia: { start: 0, end: 15 }, // 12am-7:30am PST

  // Jessica: 8AM-4PM PST (16-32) - Standard business hours
  Jessica: { start: 16, end: 32 }, // 8am-4pm PST
};

const ACCENT_COLORS = [
  '#ff6b6b',
  '#fca311',
  '#6a994e',
  '#3d5a80',
  '#8e44ad',
  '#00b4d8',
  '#ef476f',
  '#ffd166',
  '#06d6a0',
  '#118ab2',
  '#e74c3c',
  '#f39c12',
  '#27ae60',
  '#2980b9',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#34495e',
  '#f1c40f',
  '#e91e63',
];

function UserTimeline({
  user,
  blocks,
  shiftWindow = { start: 0, end: blocks.length },
  tickets,
  setTickets,
  setPlacingTicketId,
  forceRefresh,
  isViewAll,
  globalOffset,
  selectedDate,
  applyOptimisticUpdate,
  isUserOff,
  setUserOffDay,
  // ✅ CLEAN: Accept permission props from parent
  canEdit = false,
  canDelete = false,
  canManageTeam = false,
}) {
  console.log(
    '🚀 UserTimeline loaded for:',
    user,
    'canEdit:',
    canEdit,
    'canManageTeam:',
    canManageTeam
  );

  const [hoverRange, setHoverRange] = useState([]);
  const [hoveredTicketId, setHoveredTicketId] = useState(null);
  const [adjustingTicket, setAdjustingTicket] = useState(null);

  const dragTicketIdRef = useRef(null);
  const dragTicketEstimateRef = useRef(1);

  // ✅ CLEAN: Simple boolean check for visual feedback
  const isReadOnlyUser = !canEdit; // If they can't edit, they're effectively read-only for UI

  // ✅ ENHANCED: Check if this user is off using the hook function
  const isOff = useMemo(() => {
    if (!isUserOff || !user || !selectedDate) {
      console.log(
        `🔍 Cannot check off status - missing: isUserOff=${!!isUserOff}, user=${user}, selectedDate=${selectedDate}`
      );
      return false;
    }

    const result = isUserOff(user, selectedDate);
    console.log(`🔍 Checking isOff for ${user} on ${selectedDate}:`, result);
    return result;
  }, [isUserOff, selectedDate, user]);

  // Helper functions
  const isSpecialTicketType = (ticket) => {
    return ['break', 'meeting', 'training'].includes(ticket.type);
  };

  // Utility function
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  // ✅ FIXED: Check if a ticket is clipped (extends beyond shift window)
  const isTicketClipped = (block, index) => {
    // Disable clipping detection in View All mode
    if (isViewAll) {
      return false; // Never show turnover icons in View All
    }

    if (!block || !block.ticket || block.isSpace || block.isBreak) return false;

    const ticket = block.ticket;
    const ticketStart = ticket.start_index; // This is already in global coordinates
    const ticketDuration = (ticket.estimate || 1) * 2;
    const ticketEnd = ticketStart + ticketDuration;

    // Get user's shift window in global coordinates (SHIFT_WINDOWS already has global positions)
    const userShiftWindow = SHIFT_WINDOWS[user] || { start: 0, end: 48 };
    const globalShiftEnd = userShiftWindow.end; // This is already global, no offset needed

    console.log(`🔍 CLIP CHECK for ${user}:`, {
      ticket: ticket.ticket,
      ticketStart,
      ticketEnd,
      globalShiftEnd,
      userShiftWindow,
      isClipped: ticketEnd > globalShiftEnd,
    });

    return ticketEnd > globalShiftEnd;
  };

  const findTicketsForSpacing = (breakStart, breakEnd) => {
    console.log(
      '🔍 Finding tickets that need spacing for break range:',
      breakStart,
      '-',
      breakEnd
    );

    const userTickets = tickets.filter(
      (t) =>
        t.assigned_user === user &&
        t.start_index !== null &&
        t.date === selectedDate &&
        t.type !== 'break'
    );

    const affectedTickets = userTickets.filter((ticket) => {
      const ticketStart = ticket.start_index;
      const ticketEnd = ticketStart + ticket.estimate * 2;

      // Check if break overlaps with ticket
      const overlaps = ticketStart < breakEnd && ticketEnd > breakStart;

      console.log(
        `  Checking "${
          ticket.ticket
        }": ${ticketStart}-${ticketEnd} vs break ${breakStart}-${breakEnd} = ${
          overlaps ? '🕳️ NEEDS SPACE' : '✅ safe'
        }`
      );

      return overlaps;
    });

    return affectedTickets;
  };

  const calculateSpacesInTicket = (ticket, breakStart, breakEnd) => {
    const ticketStart = ticket.start_index;
    const ticketEnd = ticketStart + ticket.estimate * 2;

    // Calculate overlap
    const overlapStart = Math.max(ticketStart, breakStart);
    const overlapEnd = Math.min(ticketEnd, breakEnd);

    return Math.max(0, overlapEnd - overlapStart);
  };

  // Simple break insertion (no conflicts)
  const insertBreakSimple = async (dragData, actualStartIndex) => {
    console.log('✅ Simple break insertion');

    const specialData = {
      ticket: dragData.type,
      estimate: dragData.estimate || 0.5,
      original_estimate: dragData.estimate || 0.5,
      link: '',
      type: dragData.type,
      category: 'Special',
      assigned_user: user,
      start_index: actualStartIndex,
      date: selectedDate,
      color_key: dragData.type,
      is_turnover: false,
    };

    try {
      if (dragData.id) {
        // Update existing special
        applyOptimisticUpdate(dragData.id, {
          start_index: actualStartIndex,
          assigned_user: user,
          date: selectedDate,
        });

        const { error } = await supabase
          .from('tickets')
          .update({
            start_index: actualStartIndex,
            assigned_user: user,
            date: selectedDate,
          })
          .eq('id', dragData.id);

        if (error) {
          console.error('❌ Database update error:', error);
          applyOptimisticUpdate(dragData.id, {
            start_index: dragData.start_index,
            assigned_user: dragData.assigned_user,
            date: dragData.date,
          });
        }
      } else {
        // Create new special
        const tempId = `temp_special_${Date.now()}_${Math.random()}`;

        setTickets((prev) => [...prev, { ...specialData, id: tempId }]);

        const { data: newSpecial, error } = await supabase
          .from('tickets')
          .insert([specialData])
          .select();

        if (error) {
          console.error('❌ Database insert error:', error);
          setTickets((prev) => prev.filter((t) => t.id !== tempId));
        } else if (newSpecial && newSpecial[0]) {
          setTickets((prev) =>
            prev.map((t) => (t.id === tempId ? newSpecial[0] : t))
          );
        }
      }
    } catch (error) {
      console.error('❌ Error in insertBreakSimple:', error);
    }
  };

  // ✅ CLEAN: Toggle off state - Check canManageTeam permission
  const toggleOffState = async () => {
    if (!canManageTeam) {
      console.log('❌ User cannot manage team member status');
      alert(
        'You do not have permission to change team member status. Contact a manager or coordinator.'
      );
      return;
    }

    console.log('🔍 TOGGLE OFF STATE DEBUG:', {
      user,
      selectedDate,
      isOff,
      canManageTeam,
      setUserOffDay: !!setUserOffDay,
      setUserOffDayType: typeof setUserOffDay,
    });

    if (!setUserOffDay) {
      console.error('❌ setUserOffDay function not provided to UserTimeline');
      alert(
        'Error: setUserOffDay function not available. Check parent component props.'
      );
      return;
    }

    if (!user || !selectedDate) {
      console.error('❌ Missing required data:', { user, selectedDate });
      alert(`Error: Missing data - user: ${user}, date: ${selectedDate}`);
      return;
    }

    console.log(
      `🔄 Toggling off state for ${user} on ${selectedDate}. Currently: ${isOff}`
    );

    try {
      console.log('📞 Calling setUserOffDay with:', {
        user,
        date: selectedDate,
        isOff: !isOff,
        reason: isOff ? '' : 'Off',
      });

      const result = await setUserOffDay(
        user,
        selectedDate,
        !isOff,
        isOff ? '' : 'Off'
      );

      console.log('📦 setUserOffDay result:', result);
      console.log(
        `✅ Successfully toggled ${user} ${
          !isOff ? 'OFF' : 'ON'
        } for ${selectedDate}`
      );
    } catch (error) {
      console.error(`❌ Error in toggleOffState:`, {
        error,
        errorMessage: error?.message,
        errorStack: error?.stack,
        user,
        selectedDate,
        isOff,
      });

      // More specific error message
      const errorMsg = error?.message || 'Unknown error occurred';
      alert(
        `Failed to update ${user}'s status.\n\nError: ${errorMsg}\n\nPlease check the console for details and try again.`
      );
    }
  };

  // ✅ CLEAN: Handle time adjustment - Check canEdit permission
  const handleTimeAdjustment = async (ticket, direction) => {
    if (!canEdit) {
      console.log('❌ User cannot adjust ticket times');
      alert(
        'You do not have permission to adjust ticket times. Contact a manager or coordinator.'
      );
      return;
    }

    const currentEstimate = ticket.estimate || 1;
    const adjustment = direction === 'increase' ? 0.5 : -0.5;
    const newEstimate = Math.max(0.5, currentEstimate + adjustment);

    console.log(
      `⏱️ Adjusting time for "${ticket.ticket}": ${currentEstimate}h ${
        direction === 'increase' ? '+' : '-'
      } 0.5h = ${newEstimate}h`
    );

    if (newEstimate === currentEstimate) {
      console.log('⏭️ No change needed, estimate already at minimum');
      return;
    }

    setAdjustingTicket(ticket.id);

    try {
      // Apply optimistic update
      applyOptimisticUpdate(ticket.id, {
        estimate: newEstimate,
      });

      // Find tickets that need to be shifted due to size change
      const sizeChange = (newEstimate - currentEstimate) * 2; // Convert to blocks

      if (sizeChange !== 0) {
        const ticketsToShift = tickets
          .filter(
            (t) =>
              t.assigned_user === user &&
              t.start_index !== null &&
              t.start_index > ticket.start_index &&
              t.date === selectedDate &&
              t.id !== ticket.id
          )
          .sort((a, b) => a.start_index - b.start_index);

        console.log(
          `📊 Size change: ${sizeChange} blocks, shifting ${ticketsToShift.length} tickets`
        );

        // Shift subsequent tickets
        for (const shiftTicket of ticketsToShift) {
          const newStartIndex = shiftTicket.start_index + sizeChange;
          console.log(
            `  🔄 Shifting "${shiftTicket.ticket}" from ${shiftTicket.start_index} to ${newStartIndex}`
          );

          applyOptimisticUpdate(shiftTicket.id, {
            start_index: newStartIndex,
          });

          await supabase
            .from('tickets')
            .update({ start_index: newStartIndex })
            .eq('id', shiftTicket.id);
        }
      }

      // Update the main ticket in database
      const { error } = await supabase
        .from('tickets')
        .update({ estimate: newEstimate })
        .eq('id', ticket.id);

      if (error) {
        console.error('❌ Failed to update ticket estimate:', error);
        // Rollback optimistic update
        applyOptimisticUpdate(ticket.id, {
          estimate: currentEstimate,
        });

        // Rollback shifted tickets
        const ticketsToShift = tickets.filter(
          (t) =>
            t.assigned_user === user &&
            t.start_index !== null &&
            t.start_index > ticket.start_index &&
            t.date === selectedDate &&
            t.id !== ticket.id
        );

        for (const shiftTicket of ticketsToShift) {
          applyOptimisticUpdate(shiftTicket.id, {
            start_index: shiftTicket.start_index,
          });
        }
      } else {
        console.log(
          `✅ Successfully adjusted "${ticket.ticket}" to ${newEstimate}h`
        );
      }
    } catch (error) {
      console.error('❌ Error adjusting ticket time:', error);
    } finally {
      setAdjustingTicket(null);
    }
  };

  // Handle lobby drops
  const handleLobbyDrop = async (dragData) => {
    if (dragData.spacesToRemove || dragData.isElongatedTicket) {
      console.log(
        '🔄 Returning elongated ticket to lobby - removing spacing breaks'
      );

      // Find all breaks that are creating spaces in this ticket
      const spacingBreaks = tickets.filter((breakTicket) => {
        if (
          breakTicket.type !== 'break' ||
          breakTicket.assigned_user !== user ||
          breakTicket.date !== selectedDate
        ) {
          return false;
        }

        const breakStart = breakTicket.start_index;
        const breakEnd = breakStart + breakTicket.estimate * 2;
        const ticketStart = dragData.start_index;
        const ticketEnd = ticketStart + dragData.estimate * 2;

        // Check if break overlaps with the original ticket timespan
        return breakStart < ticketEnd && breakEnd > ticketStart;
      });

      console.log(
        `  🔍 Found ${spacingBreaks.length} spacing breaks to remove:`,
        spacingBreaks.map((b) => `${b.ticket}@${b.start_index}`)
      );

      // Remove all spacing breaks
      for (const breakTicket of spacingBreaks) {
        console.log(`  🗑️ Removing spacing break: ${breakTicket.id}`);
        applyOptimisticUpdate(breakTicket.id, {
          assigned_user: null,
          start_index: null,
        });

        await supabase
          .from('tickets')
          .update({ assigned_user: null, start_index: null })
          .eq('id', breakTicket.id);
      }
    }

    // Return ticket to lobby
    console.log(`🏠 Returning ticket "${dragData.ticket}" to lobby`);
    applyOptimisticUpdate(dragData.id, {
      assigned_user: null,
      start_index: null,
      date: null, // Persistent lobby
    });

    await supabase
      .from('tickets')
      .update({
        assigned_user: null,
        start_index: null,
        date: null,
      })
      .eq('id', dragData.id);
  };

  // Handle regular ticket drops
  const handleTicketDrop = async (ticket, dropIndex) => {
    const actualStartIndex = isViewAll ? dropIndex : dropIndex + globalOffset;

    console.log(
      `🎫 Regular ticket drop: ${ticket.ticket} at position ${actualStartIndex}`
    );

    // If this is an elongated ticket being moved, remove the spacing breaks first
    if (ticket.spacesToRemove || ticket.isElongatedTicket) {
      console.log('🔄 Removing spaces from moved elongated ticket');

      // Find all breaks that were creating spaces in this ticket
      const spacingBreaks = tickets.filter((breakTicket) => {
        if (
          breakTicket.type !== 'break' ||
          breakTicket.assigned_user !== user ||
          breakTicket.date !== selectedDate
        ) {
          return false;
        }

        const breakStart = breakTicket.start_index;
        const breakEnd = breakStart + breakTicket.estimate * 2;
        const ticketStart = ticket.start_index;
        const ticketEnd = ticketStart + ticket.estimate * 2;

        // Check if break overlaps with the original ticket timespan
        return breakStart < ticketEnd && breakEnd > ticketStart;
      });

      console.log(
        `  🔍 Found ${spacingBreaks.length} spacing breaks to remove`
      );

      for (const breakTicket of spacingBreaks) {
        console.log(`  🗑️ Removing spacing break: ${breakTicket.id}`);
        applyOptimisticUpdate(breakTicket.id, {
          assigned_user: null,
          start_index: null,
        });

        await supabase
          .from('tickets')
          .update({ assigned_user: null, start_index: null })
          .eq('id', breakTicket.id);
      }
    }

    const newLength = (ticket.estimate || 1) * 2;

    // Apply change instantly to UI
    applyOptimisticUpdate(ticket.id, {
      assigned_user: user,
      start_index: actualStartIndex,
      date: selectedDate,
    });

    // Handle shifting existing tickets
    const shiftingTickets = tickets
      .filter(
        (t) =>
          t.assigned_user === user &&
          t.start_index !== null &&
          t.start_index >= actualStartIndex &&
          t.id !== ticket.id &&
          t.date === selectedDate &&
          t.type !== 'break' // Don't shift breaks, they'll be handled separately
      )
      .sort((a, b) => a.start_index - b.start_index);

    let shiftStart = actualStartIndex + newLength;

    // Shift existing tickets with optimistic updates
    for (const t of shiftingTickets) {
      const length = (t.estimate || 1) * 2;
      console.log(
        `  📤 Shifting ticket "${t.ticket}" from ${t.start_index} to ${shiftStart}`
      );
      applyOptimisticUpdate(t.id, { start_index: shiftStart });
      await supabase
        .from('tickets')
        .update({ start_index: shiftStart })
        .eq('id', t.id);
      shiftStart += length;
    }

    // Update database for main ticket assignment
    const { error } = await supabase
      .from('tickets')
      .update({
        assigned_user: user,
        start_index: actualStartIndex,
        date: selectedDate,
      })
      .eq('id', ticket.id);

    if (error) {
      console.error('❌ Supabase assign error:', error.message);
      // Rollback if database update fails
      applyOptimisticUpdate(ticket.id, {
        assigned_user: ticket.assigned_user,
        start_index: ticket.start_index,
        date: ticket.date,
      });

      // Also rollback shifted tickets if any
      for (const t of shiftingTickets) {
        applyOptimisticUpdate(t.id, { start_index: t.start_index });
      }
    } else {
      setPlacingTicketId(ticket.id);
      console.log(
        `✅ Successfully placed ticket "${ticket.ticket}" at position ${actualStartIndex}`
      );
    }
  };

  // New space-based break insertion system
  const handleSpaceBasedBreakInsertion = async (dragData, dropIndex) => {
    const actualStartIndex = isViewAll ? dropIndex : dropIndex + globalOffset;
    const durationBlocks = (dragData.estimate || 0.5) * 2;
    const endIndex = actualStartIndex + durationBlocks;

    console.log(
      `🕳️ SPACE-BASED BREAK INSERTION: ${dragData.type} at position ${actualStartIndex}-${endIndex}`
    );

    // Find tickets that would be affected by this break
    const affectedTickets = findTicketsForSpacing(actualStartIndex, endIndex);

    if (affectedTickets.length === 0) {
      console.log('✅ NO CONFLICTS - Simple break insertion');
      return await insertBreakSimple(dragData, actualStartIndex);
    }

    console.log(`🕳️ CREATING SPACES in ${affectedTickets.length} tickets`);

    // First, insert the break
    await insertBreakSimple(dragData, actualStartIndex);

    // Then extend affected tickets to accommodate the space
    for (const ticket of affectedTickets) {
      const spacesToAdd = calculateSpacesInTicket(
        ticket,
        actualStartIndex,
        endIndex
      );
      if (spacesToAdd > 0) {
        console.log(`🔧 Adding ${spacesToAdd} spaces to "${ticket.ticket}"`);

        // Don't change the base estimate, just update visual tracking if needed
        // The timeline builder will automatically create the visual spaces
      }
    }

    console.log('✅ Space-based break insertion complete');
  };

  // ✅ CLEAN: Handle split overflow - Check canEdit permission
  const handleSplitOverflow = async (timelineSlot) => {
    if (!canEdit) {
      console.log('❌ User cannot split overflow tickets');
      alert(
        'You do not have permission to split tickets. Contact a manager or coordinator.'
      );
      return;
    }

    if (!timelineSlot || !timelineSlot.ticket) return;

    const ticket = timelineSlot.ticket;
    const ticketStart = ticket.start_index; // Global coordinates
    const ticketDuration = (ticket.estimate || 1) * 2;
    const ticketEnd = ticketStart + ticketDuration;

    // Get user's shift window in global coordinates (SHIFT_WINDOWS already has global positions)
    const userShiftWindow = SHIFT_WINDOWS[user] || { start: 0, end: 48 };
    const globalShiftEnd = userShiftWindow.end; // This is already global, no offset needed

    console.log(`✂️ SPLITTING OVERFLOW for "${ticket.ticket}":`, {
      user,
      ticketStart,
      ticketEnd,
      globalShiftEnd,
      userShiftWindow,
      overflow: ticketEnd - globalShiftEnd,
    });

    if (ticketEnd <= globalShiftEnd) {
      console.log('❌ No overflow to split');
      return;
    }

    // ✅ FIXED: Calculate the portions correctly
    const workingPortion = Math.max(0, globalShiftEnd - ticketStart); // Blocks within shift
    const overflowPortion = ticketEnd - globalShiftEnd; // Blocks outside shift
    const workingHours = workingPortion / 2; // Convert blocks to hours
    const overflowHours = overflowPortion / 2; // Convert blocks to hours

    console.log(`📊 Split calculations:`, {
      workingPortion: `${workingPortion} blocks (${workingHours}h)`,
      overflowPortion: `${overflowPortion} blocks (${overflowHours}h)`,
      splitAt: globalShiftEnd,
      originalEstimate: `${ticket.estimate}h`,
      turnoverEstimate: `Will create turnover with ${overflowHours}h estimate`,
    });

    if (workingHours <= 0 || overflowHours <= 0) {
      console.log('❌ Invalid split portions');
      return;
    }

    try {
      // Remove any spacing breaks within this ticket first
      const spacingBreaks = tickets.filter((breakTicket) => {
        if (
          breakTicket.type !== 'break' ||
          breakTicket.assigned_user !== user ||
          breakTicket.date !== selectedDate
        ) {
          return false;
        }

        const breakStart = breakTicket.start_index;
        const breakEnd = breakStart + breakTicket.estimate * 2;

        // Check if break overlaps with the original ticket timespan
        return breakStart < ticketEnd && breakEnd > ticketStart;
      });

      if (spacingBreaks.length > 0) {
        console.log(
          `🔧 Removing ${spacingBreaks.length} spacing breaks before split`
        );
        for (const breakTicket of spacingBreaks) {
          applyOptimisticUpdate(breakTicket.id, {
            assigned_user: null,
            start_index: null,
          });

          await supabase
            .from('tickets')
            .update({ assigned_user: null, start_index: null })
            .eq('id', breakTicket.id);
        }
      }

      // Update the original ticket to only cover the working portion
      console.log(`✂️ Updating original ticket to ${workingHours}h`);
      applyOptimisticUpdate(ticket.id, {
        estimate: workingHours,
        original_estimate: ticket.original_estimate || ticket.estimate, // Preserve original estimate
      });

      await supabase
        .from('tickets')
        .update({
          estimate: workingHours,
          original_estimate: ticket.original_estimate || ticket.estimate,
        })
        .eq('id', ticket.id);

      // ✅ FIXED: Create turnover ticket in lobby with correct estimate
      const turnoverTicketData = {
        ticket: `${ticket.ticket} (Turnover)`,
        estimate: overflowHours, // This should be in hours
        original_estimate: overflowHours, // This should be in hours
        link: ticket.link || '',
        type: ticket.type || 'normal',
        category: ticket.category,
        assigned_user: null, // Goes to lobby
        start_index: null, // Goes to lobby
        date: null, // Persistent lobby
        color_key: ticket.color_key || ticket.ticket,
        is_turnover: true,
      };

      console.log(`📦 Creating turnover ticket:`, turnoverTicketData);
      console.log(
        `📊 Turnover estimate check: ${overflowHours}h (should match estimate in turnoverTicketData)`
      );

      // Add turnover to local state immediately
      const tempTurnoverId = `temp_turnover_${Date.now()}_${Math.random()}`;
      const tempTurnover = { ...turnoverTicketData, id: tempTurnoverId };

      console.log(`🏷️ Adding temp turnover to state:`, tempTurnover);
      setTickets((prev) => [...prev, tempTurnover]);

      // Insert into database
      const { data: newTurnover, error: insertError } = await supabase
        .from('tickets')
        .insert([turnoverTicketData])
        .select();

      if (insertError) {
        console.error('❌ Failed to create turnover ticket:', insertError);
        // Remove temporary ticket on error
        setTickets((prev) => prev.filter((t) => t.id !== tempTurnoverId));

        // Rollback original ticket change
        applyOptimisticUpdate(ticket.id, {
          estimate: ticket.estimate,
          original_estimate: ticket.original_estimate,
        });
      } else if (newTurnover && newTurnover[0]) {
        console.log(`🗄️ Database returned turnover:`, newTurnover[0]);
        console.log(
          `🔍 Database estimate check: ${newTurnover[0].estimate} (should be ${overflowHours}h)`
        );

        // Replace temporary ticket with real one
        setTickets((prev) =>
          prev.map((t) => (t.id === tempTurnoverId ? newTurnover[0] : t))
        );

        console.log(
          `✅ Successfully created turnover: "${newTurnover[0].ticket}" (${overflowHours}h) in lobby`
        );
      }
    } catch (error) {
      console.error('❌ Error in handleSplitOverflow:', error);
    }
  };

  // Enhanced timeline builder that handles spaces within tickets
  const timeline = useMemo(() => {
    console.log(`🏗️ TIMELINE REBUILD for ${user}:`, {
      blocksCount: blocks.length,
      ticketsCount: tickets.length,
      selectedDate,
      isOff,
      timestamp: Date.now(),
    });

    const timelineArray = Array(blocks.length).fill(null);

    // Get user tickets and breaks
    const userTickets = tickets.filter(
      (t) =>
        t.assigned_user === user &&
        t.start_index !== null &&
        t.date === selectedDate &&
        t.type !== 'break'
    );

    const userBreaks = tickets.filter(
      (t) =>
        t.assigned_user === user &&
        t.start_index !== null &&
        t.date === selectedDate &&
        t.type === 'break'
    );

    console.log(
      `👤 ${user} has ${userTickets.length} tickets and ${userBreaks.length} breaks`
    );

    // Process each ticket and calculate its elongated timeline with spaces
    userTickets.forEach((ticket) => {
      const baseEstimate = (ticket.estimate || 1) * 2;
      const globalStartIndex = ticket.start_index;
      const localStartIndex = isViewAll
        ? globalStartIndex
        : globalStartIndex - globalOffset;

      console.log(`🎫 Processing ticket "${ticket.ticket}":`, {
        baseEstimate: baseEstimate / 2,
        globalStartIndex,
        localStartIndex,
      });

      // Find breaks that intersect with this ticket
      const intersectingBreaks = userBreaks.filter((breakTicket) => {
        const breakStart = breakTicket.start_index;
        const breakEnd = breakStart + breakTicket.estimate * 2;
        const ticketEnd = globalStartIndex + baseEstimate;

        // Check if break overlaps with ticket's original timespan
        const overlaps = breakStart < ticketEnd && breakEnd > globalStartIndex;

        if (overlaps) {
          console.log(
            `  🔗 Break "${breakTicket.ticket}" intersects at global ${breakStart}-${breakEnd}`
          );
        }

        return overlaps;
      });

      // Calculate total duration including spaces
      const totalSpacesDuration = intersectingBreaks.reduce(
        (sum, breakTicket) => sum + breakTicket.estimate * 2,
        0
      );

      const elongatedDuration = baseEstimate + totalSpacesDuration;

      console.log(
        `  📏 Ticket elongation: ${baseEstimate / 2}h base + ${
          totalSpacesDuration / 2
        }h spaces = ${elongatedDuration / 2}h total`
      );

      // Build the elongated ticket timeline
      let ticketBlockIndex = 0;
      let currentGlobalPos = globalStartIndex;

      for (let i = 0; i < elongatedDuration; i++) {
        const timelineIndex = localStartIndex + i;

        if (timelineIndex >= 0 && timelineIndex < blocks.length) {
          // Check if there's a break at this global position
          const breakAtThisPosition = intersectingBreaks.find((breakTicket) => {
            const breakStart = breakTicket.start_index;
            const breakEnd = breakStart + breakTicket.estimate * 2;
            return (
              currentGlobalPos >= breakStart && currentGlobalPos < breakEnd
            );
          });

          if (breakAtThisPosition) {
            // This is a space within the ticket
            console.log(
              `    🕳️ Space at timeline[${timelineIndex}] for break "${breakAtThisPosition.ticket}"`
            );
            timelineArray[timelineIndex] = {
              ticket: ticket,
              start: globalStartIndex,
              isTicketContent: false,
              isSpace: true,
              spaceBreak: breakAtThisPosition,
              ticketOffset: ticketBlockIndex,
              elongatedTicket: true,
            };
          } else {
            // This is actual ticket content
            if (ticketBlockIndex < baseEstimate) {
              console.log(
                `    📦 Ticket content at timeline[${timelineIndex}], ticketBlock ${ticketBlockIndex}`
              );
              timelineArray[timelineIndex] = {
                ticket: ticket,
                start: globalStartIndex,
                isTicketContent: true,
                isSpace: false,
                ticketOffset: ticketBlockIndex,
                elongatedTicket: true,
                // Track if this is the first block for time controls
                isFirstBlock: ticketBlockIndex === 0,
              };
              ticketBlockIndex++;
            }
          }
        }
        currentGlobalPos++;
      }
    });

    // Now place standalone breaks (those not creating spaces)
    userBreaks.forEach((breakTicket) => {
      const breakDuration = (breakTicket.estimate || 0.5) * 2;
      const breakGlobalIndex = breakTicket.start_index;
      const breakLocalIndex = isViewAll
        ? breakGlobalIndex
        : breakGlobalIndex - globalOffset;

      // Check if this break is creating spaces or is standalone
      const isCreatingSpaces = userTickets.some((ticket) => {
        const ticketStart = ticket.start_index;
        const ticketEnd = ticketStart + ticket.estimate * 2;
        return (
          breakGlobalIndex < ticketEnd &&
          breakGlobalIndex + breakDuration > ticketStart
        );
      });

      if (!isCreatingSpaces) {
        // Place as standalone break
        console.log(
          `🔄 Placing standalone break "${breakTicket.ticket}" at ${breakLocalIndex}`
        );
        for (let i = 0; i < breakDuration; i++) {
          const timelineIndex = breakLocalIndex + i;
          if (
            timelineIndex >= 0 &&
            timelineIndex < blocks.length &&
            !timelineArray[timelineIndex]
          ) {
            timelineArray[timelineIndex] = {
              ticket: breakTicket,
              start: breakGlobalIndex,
              isTicketContent: true,
              isBreak: true,
              standaloneBreak: true,
            };
          }
        }
      }
    });

    const stats = {
      filledSlots: timelineArray.filter((t) => t !== null).length,
      totalSlots: timelineArray.length,
      spaces: timelineArray.filter((t) => t && t.isSpace).length,
      ticketContent: timelineArray.filter(
        (t) => t && t.isTicketContent && !t.isBreak
      ).length,
      standaloneBreaks: timelineArray.filter((t) => t && t.standaloneBreak)
        .length,
      elongatedTickets: timelineArray.filter((t) => t && t.elongatedTicket)
        .length,
    };

    console.log(`📊 Timeline built for ${user}:`, stats);

    return timelineArray;
  }, [blocks, user, selectedDate, isViewAll, globalOffset, tickets, isOff]);

  // Enhanced drag handling
  const handleDragStart = (e, timelineSlot) => {
    if (!timelineSlot) return;

    const ticket = timelineSlot.ticket;
    console.log(
      `🚀 DRAG START: "${ticket.ticket}" (type: ${ticket.type || 'normal'})`
    );

    if (timelineSlot.isSpace || timelineSlot.elongatedTicket) {
      // Dragging an elongated ticket (with or without spaces)
      console.log(
        `🕳️ Dragging elongated ticket - will remove spaces and return to original duration`
      );

      const originalEstimate = ticket.estimate || ticket.original_estimate;

      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          ...ticket,
          estimate: originalEstimate,
          isElongatedTicket: true,
          spacesToRemove: true,
        })
      );

      dragTicketIdRef.current = ticket.id;
      dragTicketEstimateRef.current = originalEstimate * 2;
    } else if (timelineSlot.isBreak || timelineSlot.standaloneBreak) {
      // Dragging a break
      console.log(`🔄 Dragging break: "${ticket.ticket}"`);

      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          ...ticket,
          isSpecial: true,
          type: ticket.type,
        })
      );

      dragTicketIdRef.current = ticket.id;
      dragTicketEstimateRef.current = (ticket.estimate || 0.5) * 2;
    } else {
      // Normal ticket drag (no elongation)
      console.log(`📋 Normal ticket drag: "${ticket.ticket}"`);

      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          ...ticket,
        })
      );

      dragTicketIdRef.current = ticket.id;
      dragTicketEstimateRef.current = (ticket.estimate || 1) * 2;
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    const estimate = dragTicketEstimateRef.current;
    const range = [];
    const clampedStart = Math.max(0, Math.min(index, blocks.length - estimate));
    for (
      let i = clampedStart;
      i < clampedStart + estimate && i < blocks.length;
      i++
    ) {
      range.push(i);
    }
    setHoverRange(range);
  };

  const clearHoverRange = () => setHoverRange([]);

  // ✅ CLEAN: Enhanced drop handling with permission checks
  const handleDrop = async (e) => {
    e.preventDefault();

    if (!canEdit) {
      console.log('❌ User cannot drag and drop tickets');
      alert(
        'You do not have permission to move tickets. Contact a manager or coordinator.'
      );
      clearHoverRange();
      return;
    }

    console.log('🎯 DROP EVENT TRIGGERED');

    let dragData;
    try {
      dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      console.log('📦 PARSED DRAG DATA:', dragData);
    } catch (error) {
      console.error('❌ Failed to parse drag data:', error);
      return;
    }

    const dropCell = e.target.closest('[data-index]');
    const dropIndex = parseInt(dropCell?.getAttribute('data-index'), 10);

    if (!dragData) {
      console.log('❌ No drag data found - aborting drop');
      return;
    }

    // Check for lobby drop
    const actualStartIndex = isViewAll ? dropIndex : dropIndex + globalOffset;
    const isLobbyDrop =
      isNaN(dropIndex) ||
      dropIndex < 0 ||
      e.target.closest('#tickets-area') ||
      e.target.closest('.ticket-lobby');

    if (isLobbyDrop) {
      console.log('🏠 LOBBY DROP: Processing...');
      await handleLobbyDrop(dragData);
      clearHoverRange();
      return;
    }

    if (isNaN(dropIndex)) {
      console.log('❌ Invalid dropIndex - aborting drop');
      clearHoverRange();
      return;
    }

    const isSpecialTicket = dragData.isSpecial || isSpecialTicketType(dragData);

    if (isSpecialTicket) {
      console.log('🎯 ROUTING TO SPACE-BASED BREAK INSERTION');
      await handleSpaceBasedBreakInsertion(dragData, dropIndex);
    } else {
      console.log('🎯 ROUTING TO REGULAR TICKET DROP');
      await handleTicketDrop(dragData, dropIndex);
    }

    clearHoverRange();
  };

  // Handle link clicks in timeline cells
  const handleTicketLinkClick = (e, ticket) => {
    // Links should work for everyone
    e.preventDefault();
    e.stopPropagation();

    if (!ticket?.link) {
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
      console.error('Error opening link:', error);
      alert('Error opening link: ' + error.message);
    }
  };

  // Render
  return (
    <div className="timeline">
      <div className="timeline-label">
        <span
          className={`user-name ${isOff ? 'user-off' : 'user-on'} ${
            isReadOnlyUser ? 'user-name-readonly' : ''
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            // ✅ CLEAN: Check permission, not role
            if (!canManageTeam) {
              console.log(
                `❌ User clicked on ${user} name but cannot toggle status`
              );
              return;
            }

            console.log(`🖱️ Clicked on ${user} name. Current isOff: ${isOff}`);
            toggleOffState();
          }}
          style={{
            cursor: canManageTeam ? 'pointer' : 'default',
            opacity: isReadOnlyUser ? 0.9 : 1,
          }}
          title={
            !canManageTeam
              ? `${user} - Contact manager to change status`
              : isOff
              ? `${user} is OFF for ${selectedDate} - Click to turn ON`
              : `${user} is ON for ${selectedDate} - Click to turn OFF`
          }
        >
          {user}
          {isOff && <span className="off-indicator">●</span>}
        </span>
      </div>

      <div
        className={`timeline-track ${isOff ? 'fully-off' : ''} ${
          isReadOnlyUser ? 'timeline-readonly' : ''
        }`}
        style={{
          gridTemplateColumns: `repeat(${blocks.length}, 1fr)`,
          gap: '1px',
        }}
        onDragOver={(e) => {
          if (!canEdit) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
        }}
        onDrop={canEdit ? handleDrop : undefined}
        onDragLeave={clearHoverRange}
      >
        {timeline.map((block, index) => {
          const isHovered = hoverRange.includes(index);

          const userShiftWindow = SHIFT_WINDOWS[user] || {
            start: 0,
            end: blocks.length,
          };

          let globalIndex;

          if (isViewAll) {
            globalIndex = index;
          } else {
            globalIndex = index + globalOffset;
          }

          const isOffShift =
            globalIndex < userShiftWindow.start ||
            globalIndex >= userShiftWindow.end;

          // CSS classes are correct from styles.css
          const offShiftClass = isOffShift
            ? isViewAll
              ? 'off-shift-all'
              : 'off-shift'
            : '';

          const isBreak = block?.isBreak;
          const isSpace = block?.isSpace;
          const isClipped = isTicketClipped(block, index);
          const colorKey =
            block?.ticket?.color_key || block?.ticket?.ticket || '';
          const accentColor =
            !isBreak && !isSpace && block
              ? ACCENT_COLORS[
                  Math.abs(hashCode(colorKey)) % ACCENT_COLORS.length
                ]
              : null;

          // Use proper off-shift detection for hasContent
          const hasContent = block && !isOffShift;

          // Time adjustment logic - make it much simpler to debug
          const isTicketContent =
            block?.isTicketContent && !isBreak && !isSpace;
          const isFirstBlock = block?.isFirstBlock;
          const canDecrease =
            isTicketContent && (block.ticket.estimate || 1) > 0.5;
          const canIncrease = isTicketContent && !isClipped;

          // ✅ CLEAN: Time controls - Check canEdit permission
          const showTimeControls =
            isTicketContent && isFirstBlock && !isViewAll && canEdit;

          let cellClass = `timeline-cell ${offShiftClass} ${
            isClipped ? 'clipped' : ''
          } ${isHovered ? 'hover-preview' : ''}`;

          if (isBreak) {
            cellClass += ' break-filled';
          } else if (isSpace) {
            cellClass += ' ticket-space';
          }

          const cellStyle = {
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          };
          if (!isBreak && !isSpace && accentColor) {
            cellStyle.backgroundColor = accentColor;
          }
          if (isSpace) {
            cellStyle.backgroundColor = '#f0f0f0';
            cellStyle.border = '2px dashed #999';
          }

          return (
            <div
              key={`${index}-${block?.ticket?.id || 'empty'}-${selectedDate}`}
              data-index={index}
              className={`${cellClass} ${
                isReadOnlyUser ? 'cell-readonly' : ''
              }`}
              draggable={!!block && canEdit}
              onDragStart={
                canEdit ? (e) => handleDragStart(e, block) : undefined
              }
              onDragOver={canEdit ? (e) => handleDragOver(e, index) : undefined}
              onDrop={canEdit ? handleDrop : undefined}
              onMouseEnter={() => {
                if (isTicketContent && block?.ticket?.id) {
                  setHoveredTicketId(block.ticket.id);
                }
              }}
              onMouseLeave={() => {
                if (isTicketContent) {
                  setHoveredTicketId(null);
                }
              }}
              style={cellStyle}
              title={
                isOffShift
                  ? `Off-shift time for ${user}`
                  : isSpace
                  ? `Space in "${block.ticket.ticket}" (${
                      block.spaceBreak?.ticket || 'break'
                    })`
                  : isClipped
                  ? `"${block.ticket.ticket}" extends beyond shift - click ⇥ to split overflow`
                  : block?.elongatedTicket
                  ? `Elongated "${block.ticket.ticket}" - drag to remove spaces`
                  : block?.ticket?.ticket
              }
            >
              {/* Show content for cells within shift window OR if they have tickets */}
              {(hasContent || isOffShift) && (
                <>
                  {isOffShift && !hasContent ? (
                    // Empty off-shift cell - show nothing but maintain structure
                    <span className="off-shift-indicator"></span>
                  ) : isSpace ? (
                    <div className="space-content">
                      <span className="space-label">
                        {block.spaceBreak?.ticket || 'Break'}
                      </span>
                      <span className="space-indicator">🕳️</span>
                    </div>
                  ) : isBreak || block?.standaloneBreak ? (
                    <span className="cell-label">{block.ticket.ticket}</span>
                  ) : block?.ticket?.link ? (
                    <span
                      className="cell-label ticket-link-clickable"
                      onClick={(e) => handleTicketLinkClick(e, block.ticket)}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      title={`Click to open: ${block.ticket.link}`}
                    >
                      {block.ticket.ticket}
                      {block.elongatedTicket && (
                        <span className="elongated-indicator">⟷</span>
                      )}
                    </span>
                  ) : block?.ticket ? (
                    <span className="cell-label">
                      {block.ticket.ticket}
                      {block.elongatedTicket && (
                        <span className="elongated-indicator">⟷</span>
                      )}
                    </span>
                  ) : null}

                  {/* ✅ CLEAN: Time controls with permission check */}
                  {showTimeControls && hasContent && !isOffShift && (
                    <div
                      className="time-adjustment-controls"
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        display: 'flex',
                        gap: '1px',
                        zIndex: 999,
                        opacity: 1,
                        background: 'rgba(0, 0, 0, 0.8)',
                        borderRadius: '3px',
                        padding: '2px',
                      }}
                    >
                      {canDecrease && (
                        <button
                          className="time-adjust-btn decrease"
                          onClick={(e) => {
                            console.log(
                              `🐛 DEBUG: Decrease clicked for ${block.ticket.ticket}`
                            );
                            e.stopPropagation();
                            e.preventDefault();
                            handleTimeAdjustment(block.ticket, 'decrease');
                          }}
                          title="Decrease time by 30 minutes"
                          disabled={adjustingTicket === block.ticket.id}
                          style={{
                            width: '10px',
                            height: '10px',
                            border: 'none',
                            borderRadius: '1px',
                            cursor: 'pointer',
                            fontSize: '6px',
                            fontWeight: 'bold',
                            background: 'rgba(255, 255, 255, 0.9)',
                            color: '#e74c3c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ◀
                        </button>
                      )}
                      {canIncrease && (
                        <button
                          className="time-adjust-btn increase"
                          onClick={(e) => {
                            console.log(
                              `🐛 DEBUG: Increase clicked for ${block.ticket.ticket}`
                            );
                            e.stopPropagation();
                            e.preventDefault();
                            handleTimeAdjustment(block.ticket, 'increase');
                          }}
                          title="Increase time by 30 minutes"
                          disabled={adjustingTicket === block.ticket.id}
                          style={{
                            width: '10px',
                            height: '10px',
                            border: 'none',
                            borderRadius: '1px',
                            cursor: 'pointer',
                            fontSize: '6px',
                            fontWeight: 'bold',
                            background: 'rgba(255, 255, 255, 0.9)',
                            color: '#27ae60',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  )}

                  {/* ✅ CLEAN: Split overflow icon with permission check */}
                  {isClipped &&
                    !isSpace &&
                    !isBreak &&
                    hasContent &&
                    !isOffShift &&
                    canEdit && (
                      <span
                        className="split-icon"
                        title="Click to split overflow into turnover"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSplitOverflow(block);
                        }}
                      >
                        ⇥
                      </span>
                    )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UserTimeline;
