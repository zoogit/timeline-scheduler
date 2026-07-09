const getTicketEnd = (ticket) =>
  ticket.start_index + (ticket.estimate || 1) * 2;

export const getScheduleSnapshot = (tickets, user, date) =>
  tickets
    .filter(
      (ticket) =>
        ticket.assigned_user === user &&
        ticket.date === date &&
        ticket.start_index !== null
    )
    .sort((a, b) => a.start_index - b.start_index)
    .map((ticket) => ({
      id: ticket.id,
      name: ticket.ticket,
      start: ticket.start_index,
      end: getTicketEnd(ticket),
      estimate: ticket.estimate,
      type: ticket.type,
    }));

export const validateSchedule = (tickets) => {
  const issues = [];
  const seenIds = new Set();
  const groups = new Map();

  tickets.forEach((ticket) => {
    if (seenIds.has(ticket.id)) {
      issues.push({
        type: 'duplicate-id',
        ticketId: ticket.id,
        message: `Ticket ${ticket.id} exists more than once in local state.`,
      });
    }
    seenIds.add(ticket.id);

    if (
      ticket.start_index !== null &&
      (!Number.isFinite(ticket.start_index) || ticket.start_index < 0)
    ) {
      issues.push({
        type: 'invalid-start',
        ticketId: ticket.id,
        message: `${ticket.ticket} has invalid start_index ${ticket.start_index}.`,
      });
    }

    if (!Number.isFinite(ticket.estimate) || ticket.estimate <= 0) {
      issues.push({
        type: 'invalid-estimate',
        ticketId: ticket.id,
        message: `${ticket.ticket} has invalid estimate ${ticket.estimate}.`,
      });
    }

    if (
      ticket.type === 'break' ||
      !ticket.assigned_user ||
      !ticket.date ||
      ticket.start_index === null
    ) {
      return;
    }

    const groupKey = `${ticket.assigned_user}::${ticket.date}`;
    const group = groups.get(groupKey) || [];
    group.push(ticket);
    groups.set(groupKey, group);
  });

  groups.forEach((groupTickets, groupKey) => {
    const sorted = [...groupTickets].sort(
      (a, b) => a.start_index - b.start_index
    );

    for (let index = 1; index < sorted.length; index++) {
      const previous = sorted[index - 1];
      const current = sorted[index];

      if (current.start_index < getTicketEnd(previous)) {
        issues.push({
          type: 'overlap',
          group: groupKey,
          ticketIds: [previous.id, current.id],
          message: `${previous.ticket} overlaps ${current.ticket}.`,
        });
      }
    }
  });

  return issues;
};

export const reportScheduleIssues = (tickets, source) => {
  const issues = validateSchedule(tickets);

  if (issues.length > 0) {
    console.warn(
      `[SCHEDULE_ISSUES] ${JSON.stringify({ source, issues })}`
    );
  }

  return issues;
};

export const recordScheduleMove = (record) => {
  if (typeof window !== 'undefined') {
    const history = window.__scheduleMoveDiagnostics || [];
    window.__scheduleMoveDiagnostics = [...history.slice(-9), record];
  }

  console.warn(`[SCHEDULE_MOVE] ${JSON.stringify(record)}`);
};
