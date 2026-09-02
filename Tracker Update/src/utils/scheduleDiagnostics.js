const getTicketEnd = (ticket) =>
  ticket.start_index + Math.max(1, Math.ceil((ticket.estimate || 1) * 2));

const DIAGNOSTIC_STORAGE_KEY = 'timelineSchedulerDiagnostics';
const MAX_DIAGNOSTIC_EVENTS = 80;

const safeReadStoredEvents = () => {
  if (typeof window === 'undefined') return [];

  try {
    const rawEvents = window.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
    const parsedEvents = rawEvents ? JSON.parse(rawEvents) : [];
    return Array.isArray(parsedEvents) ? parsedEvents : [];
  } catch (error) {
    return [];
  }
};

const safeWriteStoredEvents = (events) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      DIAGNOSTIC_STORAGE_KEY,
      JSON.stringify(events.slice(-MAX_DIAGNOSTIC_EVENTS))
    );
  } catch (error) {
    // Diagnostic logging should never interrupt scheduling.
  }
};

export const recordDiagnosticEvent = (event) => {
  const normalizedEvent = {
    at: new Date().toISOString(),
    ...event,
  };

  if (typeof window !== 'undefined') {
    const history = window.__timelineDiagnostics || safeReadStoredEvents();
    const nextHistory = [...history, normalizedEvent].slice(-MAX_DIAGNOSTIC_EVENTS);
    window.__timelineDiagnostics = nextHistory;
    safeWriteStoredEvents(nextHistory);
  }

  return normalizedEvent;
};

export const buildDiagnosticReport = ({
  selectedDate,
  selectedTeam,
  viewAll,
  timezone,
  userRole,
  canEdit,
  ticketCount,
  lobbyTicketCount,
  scheduleIssueCount,
}) => {
  const storedEvents = safeReadStoredEvents();
  const memoryEvents =
    typeof window !== 'undefined' ? window.__timelineDiagnostics || [] : [];
  const moveDiagnostics =
    typeof window !== 'undefined' ? window.__scheduleMoveDiagnostics || [] : [];
  const events = (memoryEvents.length > 0 ? memoryEvents : storedEvents).slice(
    -MAX_DIAGNOSTIC_EVENTS
  );

  const report = {
    createdAt: new Date().toISOString(),
    app: {
      selectedDate,
      selectedTeam,
      viewAll,
      timezone,
      userRole,
      canEdit,
      ticketCount,
      lobbyTicketCount,
      scheduleIssueCount,
    },
    browser:
      typeof window !== 'undefined'
        ? {
            userAgent: window.navigator.userAgent,
            online: window.navigator.onLine,
            language: window.navigator.language,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          }
        : null,
    recentEvents: events,
    recentMoves: moveDiagnostics,
  };

  return JSON.stringify(report, null, 2);
};

export const installDiagnosticListeners = () => {
  if (typeof window === 'undefined' || window.__timelineDiagnosticListeners) {
    return;
  }

  window.__timelineDiagnosticListeners = true;

  window.addEventListener('error', (event) => {
    recordDiagnosticEvent({
      type: 'browser-error',
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    recordDiagnosticEvent({
      type: 'unhandled-promise',
      message:
        event.reason?.message ||
        event.reason?.error_description ||
        String(event.reason),
    });
  });
};

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
  recordDiagnosticEvent({
    type: 'schedule-move',
    ...record,
  });

  if (typeof window !== 'undefined') {
    const history = window.__scheduleMoveDiagnostics || [];
    window.__scheduleMoveDiagnostics = [...history.slice(-9), record];
  }

  console.warn(`[SCHEDULE_MOVE] ${JSON.stringify(record)}`);
};
