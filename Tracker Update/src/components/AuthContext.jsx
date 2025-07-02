// src/components/AuthContext.jsx
// Conservative version focused on reliable page refresh and loading

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import supabase from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const subscriptionRef = useRef(null);
  const fetchingRef = useRef(false);
  const initializingRef = useRef(false);

  // ✅ SIMPLE: Basic cache without aggressive timeouts
  const profileCacheRef = useRef({
    userId: null,
    data: null,
    timestamp: null,
  });

  // Reset mounted ref
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  });

  const signIn = async (email, password) => {
    try {
      console.log('🔐 Starting sign in for:', email);
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        throw error;
      }

      console.log('✅ Sign in successful');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Sign in failed:', error.message);
      setError(error.message);
      setLoading(false);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log('👋 Starting sign out');
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      // Clear all state and cache
      setSession(null);
      setUser(null);
      setUserProfile(null);
      profileCacheRef.current = { userId: null, data: null, timestamp: null };
      fetchingRef.current = false;

      console.log('✅ Sign out successful');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign out error:', error.message);
      setError(error.message);
      setLoading(false);
      return { error };
    }
  };

  const signUp = async (email, password, fullName, role, team, userName) => {
    try {
      console.log('📝 Starting sign up:', { email, role, team, userName });
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            permissions: role,
            team: team,
            user_name: userName,
          },
        },
      });

      if (error) {
        console.error('❌ Sign up error:', error);
        throw error;
      }

      console.log('✅ Sign up successful');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Sign up failed:', error.message);
      setError(error.message);
      setLoading(false);
      return { data: null, error };
    }
  };

  // ✅ SIMPLIFIED: Basic profile fetch without aggressive timeouts
  const fetchUserProfile = async (userId, forceRefresh = false) => {
    if (!userId) {
      console.error('❌ No userId provided');
      return null;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current && !forceRefresh) {
      console.log('🔄 Profile fetch already in progress');
      return;
    }

    // Check cache (10-minute cache for stability)
    const cache = profileCacheRef.current;
    const cacheAge = cache.timestamp ? Date.now() - cache.timestamp : Infinity;
    const cacheValidTime = 10 * 60 * 1000; // 10 minutes

    if (!forceRefresh && cache.userId === userId && cacheAge < cacheValidTime) {
      console.log(
        `📦 Using cached profile (${Math.round(cacheAge / 1000)}s old)`
      );
      if (mountedRef.current && cache.data) {
        setUserProfile(cache.data);
        setError(null);
      }
      return cache.data;
    }

    fetchingRef.current = true;
    console.log(`👤 Fetching profile for: ${userId}`);

    try {
      // ✅ SIMPLE: Basic query without timeouts - let Supabase handle it
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('📊 Profile query result:', {
        hasData: !!data,
        hasError: !!error,
        errorCode: error?.code,
      });

      if (error) {
        console.warn('⚠️ Profile query error:', error.code, error.message);

        // Handle missing profile
        if (
          error.code === 'PGRST116' ||
          error.message.includes('No rows found')
        ) {
          console.log('📝 Profile not found, creating fallback');
          return createFallbackProfile(userId);
        }

        // Try cache on error if available
        if (cache.userId === userId && cache.data) {
          console.log('🔄 Using cached profile due to query error');
          if (mountedRef.current) {
            setUserProfile(cache.data);
          }
          return cache.data;
        }

        // Create fallback if no cache
        return createFallbackProfile(userId);
      }

      // Process and cache successful result
      const processedProfile = processProfileData(data);

      // Update cache
      profileCacheRef.current = {
        userId,
        data: processedProfile,
        timestamp: Date.now(),
      };

      if (mountedRef.current) {
        setUserProfile(processedProfile);
        setError(null);
        console.log(
          '✅ Profile loaded:',
          processedProfile.user_name,
          processedProfile.role
        );
      }

      return processedProfile;
    } catch (error) {
      console.warn('⚠️ Profile fetch failed:', error.message);

      // Try cache first
      if (cache.userId === userId && cache.data) {
        console.log('🔄 Using cached profile due to fetch failure');
        if (mountedRef.current) {
          setUserProfile(cache.data);
        }
        return cache.data;
      }

      // Create fallback
      return createFallbackProfile(userId);
    } finally {
      fetchingRef.current = false;
    }
  };

  // Process profile data with role syncing
  const processProfileData = (data) => {
    const validRoles = ['manager', 'coordinator', 'team_member'];

    let role = data.role || data.permissions || 'team_member';

    // Handle legacy read_only role
    if (role === 'read_only') {
      console.log('🔄 Auto-migrating read_only to team_member');
      role = 'team_member';
    }

    // Validate role
    if (!validRoles.includes(role)) {
      console.log(`🔄 Invalid role "${role}", defaulting to team_member`);
      role = 'team_member';
    }

    const processedProfile = {
      ...data,
      role: role,
      permissions: role,
      is_active: data.is_active !== false,
    };

    // Background sync if needed
    if (data.role !== role || data.permissions !== role) {
      console.log('🔄 Syncing role/permissions in background');
      supabase
        .from('user_profiles')
        .update({ role: role, permissions: role })
        .eq('id', data.id)
        .then(({ error }) => {
          if (error) {
            console.warn('⚠️ Failed to sync role/permissions:', error);
          } else {
            console.log('✅ Role/permissions synced');
          }
        });
    }

    return processedProfile;
  };

  // Create fallback profile
  const createFallbackProfile = (userId) => {
    console.log('🔄 Creating fallback profile for:', userId);

    let authRole = null;
    let authEmail = null;
    let authName = null;
    let authUserName = null;
    let authTeam = null;

    // Try current session/user metadata
    if (session?.user) {
      authRole =
        session.user.user_metadata?.role ||
        session.user.user_metadata?.permissions;
      authEmail = session.user.email;
      authName = session.user.user_metadata?.full_name;
      authUserName = session.user.user_metadata?.user_name;
      authTeam = session.user.user_metadata?.team;
    } else if (user) {
      authRole = user.user_metadata?.role || user.user_metadata?.permissions;
      authEmail = user.email;
      authName = user.user_metadata?.full_name;
      authUserName = user.user_metadata?.user_name;
      authTeam = user.user_metadata?.team;
    }

    const validRoles = ['manager', 'coordinator', 'team_member'];
    let finalRole =
      authRole && validRoles.includes(authRole) ? authRole : 'team_member';

    const fallbackProfile = {
      id: userId,
      email: authEmail || 'unknown@example.com',
      role: finalRole,
      permissions: finalRole,
      team: authTeam || null,
      full_name: authName || 'User',
      user_name: authUserName || authEmail?.split('@')[0] || 'User',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('🔄 Created fallback profile:', {
      user_name: fallbackProfile.user_name,
      role: fallbackProfile.role,
      email: fallbackProfile.email,
    });

    if (mountedRef.current) {
      setUserProfile(fallbackProfile);
      if (!authRole && !authEmail) {
        setError(
          'Profile not found - using basic access. Contact administrator.'
        );
      }
    }

    return fallbackProfile;
  };

  const refreshUserProfile = async (forceRefresh = true) => {
    if (!user?.id) {
      console.error('❌ No user ID for refresh');
      return;
    }

    console.log('🔄 Refreshing user profile');

    if (forceRefresh) {
      profileCacheRef.current = { userId: null, data: null, timestamp: null };
    }

    await fetchUserProfile(user.id, forceRefresh);
  };

  // Permission helpers
  const canEdit = () => {
    const userPermission =
      userProfile?.permissions || userProfile?.role || 'team_member';
    return userPermission === 'manager' || userPermission === 'coordinator';
  };

  const canDelete = () => {
    const userPermission =
      userProfile?.permissions || userProfile?.role || 'team_member';
    return userPermission === 'manager';
  };

  const isManager = () => {
    const userPermission =
      userProfile?.permissions || userProfile?.role || 'team_member';
    return userPermission === 'manager';
  };

  const isCoordinator = () => {
    const userPermission =
      userProfile?.permissions || userProfile?.role || 'team_member';
    return userPermission === 'coordinator';
  };

  const isTeamMember = () => {
    const userPermission =
      userProfile?.permissions || userProfile?.role || 'team_member';
    return userPermission === 'team_member';
  };

  const canManageTeam = () => {
    return isManager() || isCoordinator();
  };

  // ✅ CONSERVATIVE: Very simple auth initialization for reliable page refresh
  useEffect(() => {
    if (initializingRef.current) {
      return;
    }

    initializingRef.current = true;
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');

        // ✅ SIMPLE: Get session without complex timeout logic
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('⚠️ Session error:', sessionError);
          // Don't fail - continue with initialization
        }

        if (!mounted) return;

        console.log('📱 Session result:', {
          hasSession: !!initialSession,
          userId: initialSession?.user?.id,
        });

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);

          // ✅ SIMPLE: Fetch profile without complex timeout handling
          console.log('👤 Fetching profile...');
          fetchUserProfile(initialSession.user.id).catch((error) => {
            console.warn('⚠️ Profile fetch failed during init:', error.message);
            // Fallback is handled in fetchUserProfile
          });
        }

        if (mounted) {
          setLoading(false);
          console.log('✅ Auth initialization complete');
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);

        if (mounted) {
          setLoading(false);
          // Don't set error immediately - give the app a chance to work
        }
      } finally {
        initializingRef.current = false;
      }
    };

    initializeAuth();

    // ✅ SIMPLE: Basic auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, !!session);

      if (!mounted) return;

      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        console.log('👤 Auth change - fetching profile...');
        fetchUserProfile(session.user.id, true).catch((error) => {
          console.warn(
            '⚠️ Profile fetch failed on auth change:',
            error.message
          );
        });
      } else {
        console.log('👤 Auth change - clearing profile');
        setUserProfile(null);
        profileCacheRef.current = { userId: null, data: null, timestamp: null };
        fetchingRef.current = false;
      }

      setLoading(false);
    });

    subscriptionRef.current = subscription;

    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      initializingRef.current = false;
    };
  }, []);

  const value = {
    // Core auth state
    session,
    user,
    userProfile,
    loading,
    error,

    // Auth methods
    signIn,
    signUp,
    signOut,
    refreshUserProfile,

    // Helper getters
    isAuthenticated: !!session,
    canEdit: canEdit(),
    canDelete: canDelete(),
    canViewLinks: true,
    userRole: userProfile?.permissions || userProfile?.role || 'team_member',
    userName: userProfile?.user_name,
    userTeam: userProfile?.team,

    // Permission helpers
    isManager: isManager(),
    isCoordinator: isCoordinator(),
    isTeamMember: isTeamMember(),
    canManageTeam: canManageTeam(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
