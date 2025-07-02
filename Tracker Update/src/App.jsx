import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import LoginForm from './components/LoginForm';
import ProfileEditor from './components/ProfileEditor';
import { useProfileEditor } from './hooks/useProfileEditor';
import { useOffDays } from './hooks/useOffDays';
import TicketForm from './components/TicketForm';
import TicketLobby from './components/TicketLobby';
import TimelineHeader from './components/TimelineHeader';
import UserTimeline from './components/UserTimeline';
import ExportButton from './components/ExportButton';
import supabase from './supabaseClient';
import './styles.css';

const TEAMS = {
  London: [
    'Andrei',
    'Andrew',
    'Bella',
    'Emma',
    'Goldee',
    'Mitchell',
    'Nicole',
    'Simona',
    'Solveiga',
  ],
  Day: [
    'Ade',
    'Claire',
    'Gabrielle',
    'Jane',
    'Melanie',
    'Nousha',
    'Paulina',
    'Rose',
    'Stephanie',
    'Susan',
    'Toby',
    'Victoria',
  ],
  Night: ['Ashley', 'Doue', 'Danissa', 'Matt', 'Marie', 'Shaida'],
  SP: ['Beth', 'James', 'Lisa', 'Sophia', 'Jessica'],
};

const SHIFT_CONFIG = {
  London: { startHour: 0, blockCount: 18 },
  Day: { startHour: 6, blockCount: 22 },
  Night: { startHour: 13, blockCount: 22 },
  SP: { startHour: 0, blockCount: 32 },
};

const VIEW_ALL_TEAM_CONFIG = {
  London: { startHour: 0, startIndexOffset: 0 },
  Day: { startHour: 6, startIndexOffset: 12 },
  Night: { startHour: 13, startIndexOffset: 26 },
  SP: { startHour: 0, startIndexOffset: 0 },
};

// Helper functions - memoized to prevent recalculation
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getUserTimezoneAbbr = () => {
  try {
    const now = new Date();
    const timeZoneString = now.toLocaleDateString('en-US', {
      timeZoneName: 'short',
    });
    const match = timeZoneString.match(/\b[A-Z]{2,4}\b/);
    return match ? match[0] : 'Local';
  } catch (error) {
    return 'Local';
  }
};

// Memoized business week calculation
const getBusinessWeekDates = (startDate) => {
  const [yearStr, monthStr, dayStr] = startDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const inputDate = new Date(year, month, day);
  const current = new Date(inputDate);
  const currentDay = current.getDay();

  let daysToMonday;
  if (currentDay === 0) {
    // Sunday
    daysToMonday = 1;
  } else if (currentDay === 1) {
    // Monday
    daysToMonday = 0;
  } else {
    // Tuesday through Saturday
    daysToMonday = -(currentDay - 1);
  }

  current.setDate(current.getDate() + daysToMonday);

  const dates = [];
  for (let i = 0; i < 5; i++) {
    const dateStr = `${current.getFullYear()}-${String(
      current.getMonth() + 1
    ).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    dates.push(dateStr);
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

// ✅ UPDATED: Inline Profile Controls Component with Portal
const InlineProfileControls = () => {
  const { user, userProfile, signOut, canEdit, canDelete, userRole } =
    useAuth();

  const [showDropdown, setShowDropdown] = useState(false);

  // Use the ProfileEditor hook
  const {
    isOpen: isProfileEditorOpen,
    openOwnProfile,
    closeEditor,
    handleSave,
  } = useProfileEditor();

  // Safe fallback values
  const displayName =
    userProfile?.user_name || userProfile?.full_name || user?.email || 'User';
  const displayRole =
    userProfile?.role || userProfile?.permissions || 'team_member';

  const handleEditProfileClick = () => {
    setShowDropdown(false);
    openOwnProfile();
  };

  const handleCloseEditor = () => {
    closeEditor();
  };

  const handleProfileSave = (updatedProfile) => {
    handleSave(updatedProfile);
  };

  // ✅ NEW: Prevent body scroll when modal is open
  useEffect(() => {
    if (isProfileEditorOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isProfileEditorOpen]);

  return (
    <>
      <div className="inline-profile-controls">
        {/* User Info with Dropdown Trigger */}
        <div className="user-info-inline">
          <span className="welcome-text">Welcome, {displayName}!</span>
          <div className="user-controls">
            <span className="user-role">{displayRole.replace('_', ' ')}</span>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="profile-menu-btn"
              title="Profile & Settings"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Compact Dropdown Menu */}
        {showDropdown && (
          <>
            <div className="inline-dropdown">
              <div className="dropdown-header">
                <div className="user-avatar-small">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="user-name-small">{displayName}</div>
                  <div className="user-email-small">{user?.email}</div>
                </div>
              </div>

              <div className="dropdown-actions">
                <button
                  onClick={handleEditProfileClick}
                  className="dropdown-action-btn edit-btn"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Profile
                </button>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    signOut();
                  }}
                  className="dropdown-action-btn signout-btn"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign Out
                </button>
              </div>

              {/* Quick Permissions Display */}
              <div className="permissions-quick">
                <span
                  className={`permission-indicator ${
                    canEdit ? 'active' : 'inactive'
                  }`}
                >
                  Edit {canEdit ? '✓' : '✗'}
                </span>
                <span
                  className={`permission-indicator ${
                    canDelete ? 'active' : 'inactive'
                  }`}
                >
                  Delete {canDelete ? '✓' : '✗'}
                </span>
              </div>
            </div>

            {/* Click outside to close */}
            <div
              className="dropdown-overlay"
              onClick={() => setShowDropdown(false)}
            />
          </>
        )}
      </div>

      {/* ✅ FIXED: Profile Editor Modal with Portal - Renders at document root */}
      {isProfileEditorOpen &&
        createPortal(
          <div className="profile-editor-modal-portal">
            <ProfileEditor
              profileId={null}
              onClose={handleCloseEditor}
              onSave={handleProfileSave}
            />
          </div>,
          document.body // Render directly to document.body
        )}
    </>
  );
};

// Main App Component Content
function AppContent() {
  const {
    isAuthenticated,
    loading: authLoading,
    error: authError,
    canEdit,
    canDelete,
    userRole,
    userName,
    userTeam,
    userProfile,
  } = useAuth();

  // ✅ CLEAN: Derive permission flags from the three valid roles
  const isManager = userRole === 'manager';
  const isCoordinator = userRole === 'coordinator';
  const isTeamMember = userRole === 'team_member';
  const canManageTeam = isManager || isCoordinator;

  // Console logging for debugging (keeping these)
  console.log('🔍 Permission Debug:', {
    userRole,
    isManager,
    isCoordinator,
    isTeamMember,
    canEdit,
    canDelete,
    canManageTeam,
    userProfile,
  });

  // Initialize state with stable defaults
  const todayDate = useMemo(() => getLocalDateString(), []);
  const initialWeekDates = useMemo(
    () => getBusinessWeekDates(todayDate),
    [todayDate]
  );

  const [selectedTeam, setSelectedTeam] = useState('London');
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [weekDates, setWeekDates] = useState(initialWeekDates);
  const [tickets, setTickets] = useState([]);
  const [viewAll, setViewAll] = useState(false);
  const [globalOffset, setGlobalOffset] = useState(0);
  const [blockCount, setBlockCount] = useState(18);
  const [forceRenderKey, setForceRenderKey] = useState(0);
  const [timezone, setTimezone] = useState('PST');

  // ✅ OPTIMIZED: Loading state management
  const [appReady, setAppReady] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);

  // Refs for optimistic updates
  const placingTicketIdRef = useRef(null);
  const [pendingUpdates, setPendingUpdates] = useState(new Set());

  // Use database-backed off days
  const {
    offUsers,
    isUserOff,
    setUserOffDay,
    loading: offDaysLoading,
    error: offDaysError,
    refreshOffDays,
  } = useOffDays(selectedDate);

  // ✅ FASTER: Enhanced app ready check
  useEffect(() => {
    // More permissive ready state - don't wait for everything
    const ready =
      !authLoading && (!isAuthenticated || (isAuthenticated && userProfile));
    setAppReady(ready);

    if (ready) {
      setShowTimeout(false);
    }
  }, [authLoading, isAuthenticated, userProfile]); // ✅ CHANGE: Added userProfile dependency

  // ✅ SHORTER: Reduced timeout for stuck loading from 10s to 6s
  useEffect(() => {
    if (!appReady) {
      const timer = setTimeout(() => {
        setShowTimeout(true);
      }, 6000); // ✅ REDUCED: From 10 seconds to 6 seconds

      return () => {
        clearTimeout(timer);
      };
    }
  }, [appReady]);

  // Update week dates when selectedDate changes
  useEffect(() => {
    const newWeekDates = getBusinessWeekDates(selectedDate);
    setWeekDates(newWeekDates);
  }, [selectedDate]);

  // Calculate display values
  const USERS = TEAMS[selectedTeam] || [];
  const { startHour, blockCount: teamBlockCount } = SHIFT_CONFIG[
    selectedTeam
  ] || { startHour: 0, blockCount: 18 };

  // Update global offset and block count based on team selection
  useEffect(() => {
    if (viewAll) {
      setGlobalOffset(0);
      setBlockCount(48);
    } else {
      setGlobalOffset(startHour * 2);
      setBlockCount(teamBlockCount);
    }
  }, [selectedTeam, viewAll, startHour, teamBlockCount]);

  // Fetch tickets from database - only when authenticated
  useEffect(() => {
    if (!isAuthenticated || !selectedDate) return;

    const fetchTickets = async () => {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .or(`date.eq.${selectedDate},date.is.null`);

        if (error) throw error;
        setTickets(data || []);
      } catch (error) {
        console.error('❌ Error fetching tickets:', error.message);
      }
    };

    fetchTickets();
  }, [selectedDate, isAuthenticated]);

  // Real-time subscription - simplified
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('realtime-tickets-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        (payload) => {
          if (pendingUpdates.has(payload.new?.id || payload.old?.id)) {
            return;
          }

          if (payload.eventType === 'INSERT') {
            setTickets((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setTickets((prev) =>
              prev.map((t) => (t.id === payload.new.id ? payload.new : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
          }

          setForceRenderKey((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isAuthenticated, pendingUpdates]);

  // Optimistic update functions
  const applyOptimisticUpdate = useCallback((ticketId, updatedFields) => {
    setPendingUpdates((prev) => new Set([...prev, ticketId]));
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, ...updatedFields } : ticket
      )
    );
    setForceRenderKey((prev) => prev + 1);

    setTimeout(() => {
      setPendingUpdates((prev) => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
    }, 1000);
  }, []);

  const applyOptimisticDelete = useCallback((ticketId) => {
    setPendingUpdates((prev) => new Set([...prev, ticketId]));
    setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
    setForceRenderKey((prev) => prev + 1);

    setTimeout(() => {
      setPendingUpdates((prev) => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
    }, 1000);
  }, []);

  const setPlacingTicketId = useCallback((ticketId) => {
    placingTicketIdRef.current = ticketId;
    setForceRenderKey((prev) => prev + 1);
    setTimeout(() => {
      if (placingTicketIdRef.current === ticketId) {
        placingTicketIdRef.current = null;
        setForceRenderKey((prev) => prev + 1);
      }
    }, 3000);
  }, []);

  // Day navigation
  const navigateDay = (direction) => {
    const [yearStr, monthStr, dayStr] = selectedDate.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const current = new Date(year, month, day);

    let newDate = new Date(current);

    if (direction === 'prev') {
      newDate.setDate(current.getDate() - 1);
      if (newDate.getDay() === 0) {
        newDate.setDate(newDate.getDate() - 2);
      } else if (newDate.getDay() === 6) {
        newDate.setDate(newDate.getDate() - 1);
      }
    } else {
      newDate.setDate(current.getDate() + 1);
      if (newDate.getDay() === 6) {
        newDate.setDate(newDate.getDate() + 2);
      } else if (newDate.getDay() === 0) {
        newDate.setDate(newDate.getDate() + 1);
      }
    }

    const newYear = newDate.getFullYear();
    const newMonth = String(newDate.getMonth() + 1).padStart(2, '0');
    const newDay = String(newDate.getDate()).padStart(2, '0');
    const newDateString = `${newYear}-${newMonth}-${newDay}`;

    setSelectedDate(newDateString);
  };

  // ✅ CLEAN: Clear All function - Only managers
  const handleClearAll = async () => {
    if (!isManager) {
      alert(
        'You do not have permission to clear all tickets. Only managers can perform this action.'
      );
      return;
    }

    const confirmMessage = `Are you sure you want to clear ALL tickets for ${selectedDate}?\n\nThis will:\n- Remove all assigned tickets from timelines\n- Send them back to the lobby\n- This action cannot be undone\n\nType "CLEAR" to confirm:`;

    const userInput = prompt(confirmMessage);

    if (userInput !== 'CLEAR') {
      return;
    }

    try {
      const assignedTickets = tickets.filter(
        (t) =>
          t.assigned_user && t.start_index !== null && t.date === selectedDate
      );

      if (assignedTickets.length === 0) {
        alert('No assigned tickets found for this date.');
        return;
      }

      // Apply optimistic updates first
      assignedTickets.forEach((ticket) => {
        applyOptimisticUpdate(ticket.id, {
          assigned_user: null,
          start_index: null,
          date: null,
        });
      });

      // Update database
      const { error } = await supabase
        .from('tickets')
        .update({
          assigned_user: null,
          start_index: null,
          date: null,
        })
        .in(
          'id',
          assignedTickets.map((t) => t.id)
        );

      if (error) {
        console.error('❌ Error clearing tickets:', error);
        // Rollback optimistic updates
        assignedTickets.forEach((ticket) => {
          applyOptimisticUpdate(ticket.id, {
            assigned_user: ticket.assigned_user,
            start_index: ticket.start_index,
            date: ticket.date,
          });
        });
        alert('Failed to clear tickets. Please try again.');
      } else {
        alert(
          `Successfully cleared ${assignedTickets.length} tickets for ${selectedDate}`
        );
      }
    } catch (error) {
      console.error('❌ Error in handleClearAll:', error);
      alert('An error occurred while clearing tickets. Please try again.');
    }
  };

  // ✅ UPDATED: Timeline data processing to include SP team
  const timelineData = useMemo(() => {
    const data = {};
    const currentUsers = viewAll
      ? [...TEAMS.London, ...TEAMS.Day, ...TEAMS.Night, ...TEAMS.SP] // ✅ ADD SP team here
      : USERS;

    // Initialize timeline arrays for each user
    currentUsers.forEach((user) => {
      data[user] = Array(viewAll ? 48 : blockCount).fill(null);
    });

    // Place assigned tickets on timeline
    const assignedTickets = tickets.filter(
      (t) =>
        t.assigned_user && t.start_index !== null && t.date === selectedDate
    );

    assignedTickets.forEach((ticket) => {
      const duration = Math.ceil((ticket.estimate || 1) * 2);
      const startIndex = viewAll
        ? ticket.start_index
        : ticket.start_index - globalOffset;

      if (data[ticket.assigned_user]) {
        for (let i = 0; i < duration; i++) {
          const index = startIndex + i;
          if (index >= 0 && index < data[ticket.assigned_user].length) {
            data[ticket.assigned_user][index] = {
              ticket: ticket.ticket,
              user: ticket.assigned_user,
              type: ticket.type || 'normal',
            };
          }
        }
      }
    });

    return data;
  }, [
    tickets,
    selectedDate,
    selectedTeam,
    viewAll,
    globalOffset,
    blockCount,
    USERS,
    forceRenderKey,
  ]);

  // Today comparison helper
  const isToday = (dateString) => {
    return dateString === getLocalDateString();
  };

  // ✅ IMPROVED: Better loading screen with more specific messages
  if (!appReady && !showTimeout) {
    return (
      <div className="app-container">
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            maxWidth: '500px',
            margin: '100px auto',
            background: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
          }}
        >
          <div className="loading-spinner"></div>
          <h3 style={{ margin: '20px 0 10px', color: '#495057' }}>
            Loading Timeline App
          </h3>

          {authLoading && (
            <p style={{ color: '#6c757d', margin: '5px 0' }}>
              🔐 Checking authentication...
            </p>
          )}

          {!authLoading && isAuthenticated && !userProfile && (
            <p style={{ color: '#6c757d', margin: '5px 0' }}>
              👤 Loading your profile...
            </p>
          )}

          {!authLoading && isAuthenticated && offDaysLoading && (
            <p style={{ color: '#6c757d', margin: '5px 0' }}>
              📅 Loading schedule data...
            </p>
          )}

          {authError && (
            <p style={{ color: '#dc3545', fontSize: '14px', margin: '10px 0' }}>
              Auth Error: {authError}
            </p>
          )}

          {offDaysError && (
            <p style={{ color: '#dc3545', fontSize: '14px', margin: '10px 0' }}>
              Schedule Error: {offDaysError}
            </p>
          )}

          {/* ✅ NEW: Progress indicator */}
          <div style={{ marginTop: '20px' }}>
            <div
              style={{
                width: '100%',
                height: '4px',
                background: '#e9ecef',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: authLoading ? '33%' : !userProfile ? '66%' : '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #0267ff, #0056d3)',
                  transition: 'width 0.3s ease',
                  borderRadius: '2px',
                }}
              ></div>
            </div>
            <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
              Step {authLoading ? '1' : !userProfile ? '2' : '3'} of 3
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ IMPROVED: Better timeout screen with more helpful options
  if (showTimeout) {
    return (
      <div className="app-container">
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '100px auto',
            background: '#fff3cd',
            borderRadius: '12px',
            border: '1px solid #ffeaa7',
          }}
        >
          <h3 style={{ color: '#856404', margin: '0 0 20px' }}>
            ⚠️ Loading Taking Longer Than Expected
          </h3>

          <p style={{ color: '#856404', marginBottom: '20px' }}>
            This usually happens due to:
          </p>

          <ul
            style={{
              textAlign: 'left',
              color: '#856404',
              marginBottom: '20px',
              paddingLeft: '20px',
            }}
          >
            <li>Slow internet connection</li>
            <li>Server warming up (first visit of the day)</li>
            <li>Temporary network issues</li>
          </ul>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 20px',
                background: '#0267ff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              🔄 Refresh Page
            </button>

            <button
              onClick={() => {
                setShowTimeout(false);
                setAppReady(true);
              }}
              style={{
                padding: '12px 20px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              ▶️ Continue Anyway
            </button>

            {/* ✅ NEW: Check connection button */}
            <button
              onClick={async () => {
                try {
                  const response = await fetch(
                    'https://rfqvvxqjicnwvsovdmac.supabase.co/rest/v1/',
                    {
                      method: 'HEAD',
                    }
                  );
                  if (response.ok) {
                    alert(
                      '✅ Connection to server is working. Try refreshing.'
                    );
                  } else {
                    alert(
                      '❌ Server connection issue. Please wait a moment and try again.'
                    );
                  }
                } catch (error) {
                  alert(
                    '❌ Network error. Please check your internet connection.'
                  );
                }
              }}
              style={{
                padding: '12px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              🔍 Test Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // ✅ ENHANCED: Better error display for off days
  const showOffDaysWarning = offDaysError && !offDaysLoading;

  return (
    <div className="app-container">
      {/* App Header with User Controls */}
      <div
        className="app-header"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '15px 20px',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          marginBottom: '20px',
        }}
      >
        <InlineProfileControls />
      </div>

      {/* ✅ ENHANCED: Better error display for off days */}
      {showOffDaysWarning && (
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            color: '#856404',
            padding: '12px 15px',
            borderRadius: '6px',
            margin: '10px 0',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>
            ⚠️ Schedule data couldn't be loaded: {offDaysError}
            <br />
            <small>
              The app will work normally, but off-day information may not be
              current.
            </small>
          </span>
          <button
            onClick={refreshOffDays}
            style={{
              background: '#856404',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              marginLeft: '10px',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="day-navigation">
        <button className="day-nav-btn" onClick={() => navigateDay('prev')}>
          ◀ Previous Day
        </button>
        <div className="current-day-display">
          <div className="day-indicator">
            {(() => {
              const [year, month, day] = selectedDate.split('-');
              const dateObj = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day)
              );
              return dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
            })()}
            {isToday(selectedDate) && (
              <span className="today-badge">Today</span>
            )}
            <span className="user-timezone">({getUserTimezoneAbbr()})</span>
          </div>
        </div>
        <button className="day-nav-btn" onClick={() => navigateDay('next')}>
          Next Day ▶
        </button>
      </div>

      {/* Week Navigation Tabs */}
      <div className="week-overview-tabs">
        {weekDates.map((date) => {
          const isCurrentDay = isToday(date);
          const isSelected = date === selectedDate;

          return (
            <button
              key={date}
              className={`day-tab ${isSelected ? 'selected' : ''} ${
                isCurrentDay ? 'today' : ''
              }`}
              onClick={() => setSelectedDate(date)}
            >
              {(() => {
                const [year, month, day] = date.split('-');
                const dateObj = new Date(
                  parseInt(year),
                  parseInt(month) - 1,
                  parseInt(day)
                );
                return dateObj.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
              })()}
            </button>
          );
        })}
      </div>

      {/* Team Selection Buttons */}
      <div className="team-buttons">
        <button
          className={`${selectedTeam === 'London' && !viewAll ? 'active' : ''}`}
          onClick={() => {
            setSelectedTeam('London');
            setViewAll(false);
          }}
        >
          <div className="team-main-name">Shift III</div>
          <div className="team-sub-name">London</div>
        </button>
        <button
          className={`${selectedTeam === 'Day' && !viewAll ? 'active' : ''}`}
          onClick={() => {
            setSelectedTeam('Day');
            setViewAll(false);
          }}
        >
          <div className="team-main-name">Shift I</div>
          <div className="team-sub-name">US Day</div>
        </button>
        <button
          className={`${selectedTeam === 'Night' && !viewAll ? 'active' : ''}`}
          onClick={() => {
            setSelectedTeam('Night');
            setViewAll(false);
          }}
        >
          <div className="team-main-name">Shift II</div>
          <div className="team-sub-name">US Night</div>
        </button>
        <button
          className={`${selectedTeam === 'SP' && !viewAll ? 'active' : ''}`}
          onClick={() => {
            setSelectedTeam('SP');
            setViewAll(false);
          }}
        >
          <div className="team-main-name">Special</div>
          <div className="team-sub-name">Projects</div>
        </button>
        <button
          className={`${viewAll ? 'active' : ''}`}
          onClick={() => setViewAll(true)}
        >
          <div className="team-main-name">View All</div>
          <div className="team-sub-name">Teams</div>
        </button>
      </div>

      {/* ✅ CLEAN: Ticket Form - Only for managers and coordinators */}
      {canEdit && (
        <TicketForm
          tickets={tickets}
          setTickets={setTickets}
          selectedDate={selectedDate}
        />
      )}

      {/* Main Content Area */}
      <div className="main-content">
        {/* ✅ CLEAN: Ticket Lobby - Only for managers and coordinators */}
        {canEdit && (
          <TicketLobby
            tickets={tickets}
            setTickets={setTickets}
            selectedDate={selectedDate}
            applyOptimisticUpdate={applyOptimisticUpdate}
            applyOptimisticDelete={applyOptimisticDelete}
          />
        )}

        {/* Timeline Container */}
        <div className="timeline-container-wrapper">
          {/* Timezone Selection */}
          <div className="timeline-controls-header">
            <div className="timezone-toggle-enhanced">
              <span className="timezone-label">Time:</span>
              <div className="timezone-buttons">
                {['PST', 'CST', 'GMT'].map((tz) => (
                  <button
                    key={tz}
                    className={`timezone-btn ${
                      timezone === tz ? 'active' : ''
                    } ${tz.toLowerCase()}`}
                    onClick={() => setTimezone(tz)}
                  >
                    {tz}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline Container */}
          <div className="timeline-scroll-container">
            {viewAll ? (
              // ✅ UPDATED: View All Mode - Include SP Team
              ['London', 'Day', 'Night', 'SP'].map((teamKey) => {
                const USERS = TEAMS[teamKey];
                const teamConfig = VIEW_ALL_TEAM_CONFIG[teamKey];
                const teamStart = teamConfig.startIndexOffset;
                const teamBlocks = SHIFT_CONFIG[teamKey].blockCount;

                return (
                  <div key={teamKey} className="team-section">
                    <h3 className="team-section-title">
                      {(() => {
                        switch (teamKey) {
                          case 'London':
                            return 'Shift III - London';
                          case 'Day':
                            return 'Shift I - US Day';
                          case 'Night':
                            return 'Shift II - US Night';
                          case 'SP':
                            return 'Special Projects';
                          default:
                            return `${teamKey} Team`;
                        }
                      })()}
                    </h3>

                    <TimelineHeader
                      startHour={0}
                      blockCount={48}
                      timezone={timezone}
                      isViewAll={true}
                    />

                    {USERS.map((user) => (
                      <UserTimeline
                        key={`${user}-${selectedDate}-${forceRenderKey}`}
                        user={user}
                        blocks={Array(48).fill(null)}
                        shiftWindow={{
                          start: teamStart,
                          end: teamStart + teamBlocks,
                        }}
                        tickets={tickets}
                        setTickets={setTickets}
                        setPlacingTicketId={setPlacingTicketId}
                        forceRefresh={forceRenderKey}
                        isViewAll={true}
                        globalOffset={0}
                        selectedDate={selectedDate}
                        applyOptimisticUpdate={applyOptimisticUpdate}
                        isUserOff={isUserOff}
                        setUserOffDay={setUserOffDay}
                        // ✅ CLEAN: Pass simple boolean permissions
                        canEdit={canEdit}
                        canDelete={canDelete}
                        canManageTeam={canManageTeam}
                      />
                    ))}
                  </div>
                );
              })
            ) : (
              // Single Team Mode
              <>
                <TimelineHeader
                  startHour={startHour}
                  blockCount={blockCount}
                  timezone={timezone}
                  isViewAll={false}
                />

                {USERS.map((user) => (
                  <UserTimeline
                    key={`${user}-${selectedDate}-${forceRenderKey}`}
                    user={user}
                    blocks={Array(blockCount).fill(null)}
                    shiftWindow={{ start: 0, end: blockCount }}
                    tickets={tickets}
                    setTickets={setTickets}
                    setPlacingTicketId={setPlacingTicketId}
                    forceRefresh={forceRenderKey}
                    isViewAll={false}
                    globalOffset={globalOffset}
                    selectedDate={selectedDate}
                    applyOptimisticUpdate={applyOptimisticUpdate}
                    isUserOff={isUserOff}
                    setUserOffDay={setUserOffDay}
                    // ✅ CLEAN: Pass simple boolean permissions
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canManageTeam={canManageTeam}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* ✅ CLEAN: Bottom Controls - Hide for team members */}
        {!isTeamMember && (
          <div className="bottom-controls">
            <ExportButton
              timelineData={timelineData}
              startHour={startHour}
              blockCount={blockCount}
            />

            {/* ✅ CLEAN: Clear All Button - Only for managers */}
            {isManager && (
              <div className="clear-all-container">
                <button
                  className="clear-all-button"
                  onClick={handleClearAll}
                  title={`Clear all tickets for ${selectedDate}`}
                >
                  Clear All ({selectedDate})
                </button>
              </div>
            )}
          </div>
        )}

        {/* ✅ CLEAN: Team Member Info Panel */}
        {isTeamMember && (
          <div
            style={{
              textAlign: 'center',
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              marginTop: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 10px', color: '#495057' }}>
              📅 Team Member View
            </h3>
            <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
              You can view all team schedules and click ticket links. Contact a
              manager or coordinator to make schedule changes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App component with AuthProvider wrapper
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
