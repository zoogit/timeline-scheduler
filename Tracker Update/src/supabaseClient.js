// src/supabaseClient.js
// Fixed version that properly sends API keys

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfqvvxqjicnwvsovdmac.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcXZ2eHFqaWNud3Zzb3ZkbWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMDI4ODYsImV4cCI6MjA2MjU3ODg4Nn0.zyDCwqwi7dzC06BQOkZIL_fjoH3YUE88EbuWno92kjQ';

// ✅ FIXED: Simplified configuration that ensures API key is sent
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  
  realtime: {
    // Conservative realtime settings
    params: {
      eventsPerSecond: 3
    },
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: function (tries) {
      return Math.min(Math.pow(2, tries) * 1000, 30000);
    },
    timeout: 15000
  }
  
  // ✅ REMOVED: Custom fetch wrapper that was interfering with API key headers
  // Let Supabase handle the API key authentication automatically
});

// ✅ SIMPLIFIED: Only add logging in development, don't modify the client
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Supabase client initialized:', {
    url: supabaseUrl,
    hasKey: !!supabaseKey,
    keyLength: supabaseKey.length
  });
}

// ✅ SIMPLIFIED: Basic connection health check without custom headers
export const checkConnectionHealth = async () => {
  try {
    const start = Date.now();
    
    // ✅ FIXED: Use a simple query that should work if auth is set up
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
      
    const duration = Date.now() - start;
    
    if (error) {
      console.warn(`🔗 Health check failed (${duration}ms):`, error.message);
      return false;
    }
    
    console.log(`✅ Connection healthy (${duration}ms)`);
    return true;
    
  } catch (error) {
    console.warn('🔗 Health check exception:', error.message);
    return false;
  }
};

// ✅ CONNECTION STATUS: For debugging
export const getConnectionStatus = () => ({
  healthy: true, // We'll assume healthy unless proven otherwise
  lastCheck: Date.now()
});

// ✅ SIMPLIFIED: Remove custom fetch wrapper, let Supabase handle everything
export default supabase;
export { supabaseUrl, supabaseKey };