import { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';

export const useOffDays = (selectedDate) => {
  const [offUsers, setOffUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format date to ensure consistency (YYYY-MM-DD)
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  };

  // Load off days for the selected date
  const loadOffDays = useCallback(async (date) => {
    if (!date) {
      console.log('📅 OFF-DAYS: No date provided, skipping load');
      setLoading(false);
      return;
    }

    console.log(`📅 OFF-DAYS: Loading for ${date}`);
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('user_off_days')
        .select('*')
        .eq('off_date', date);

      console.log('📊 OFF-DAYS: Query result:', {
        data,
        error: queryError,
        date,
      });

      if (queryError) {
        console.error('❌ OFF-DAYS: Query error:', queryError);
        setError(queryError.message);
        setLoading(false);
        return;
      }

      // 🔧 FIX: Process the data correctly into offUsers object
      const newOffUsers = {};

      if (data && Array.isArray(data)) {
        console.log(
          `📋 OFF-DAYS: Processing ${data.length} records for ${date}`
        );

        data.forEach((record) => {
          if (record.user_name) {
            newOffUsers[record.user_name] = {
              off_date: record.off_date,
              reason: record.reason,
              id: record.id,
            };
            console.log(
              `👤 OFF-DAYS: Loaded ${record.user_name} as OFF on ${record.off_date}`
            );
          }
        });
      } else {
        console.log('📋 OFF-DAYS: No data returned from query');
      }

      console.log(
        `✅ OFF-DAYS: Loaded ${
          Object.keys(newOffUsers).length
        } off users for ${date}:`,
        newOffUsers
      );
      setOffUsers(newOffUsers);
    } catch (err) {
      console.error('❌ OFF-DAYS: Unexpected error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data when selectedDate changes
  useEffect(() => {
    const formattedDate = formatDate(selectedDate);
    if (formattedDate) {
      console.log(
        `🔄 OFF-DAYS: Date changed to ${formattedDate}, reloading...`
      );
      loadOffDays(formattedDate);
    } else {
      console.log('⚠️ OFF-DAYS: Invalid date format, clearing state');
      setOffUsers({});
      setLoading(false);
    }
  }, [selectedDate, loadOffDays]);

  // Check if a specific user is off on a specific date
  const isUserOff = useCallback(
    (userName, date) => {
      if (!userName || !date) {
        console.log('🔍 OFF-DAYS: Missing userName or date for check');
        return false;
      }

      const formattedDate = formatDate(date);
      const userRecord = offUsers[userName];
      const isOff = userRecord && userRecord.off_date === formattedDate;

      console.log(`🔍 OFF-DAYS: ${userName} off on ${formattedDate}: ${isOff}`);
      return isOff;
    },
    [offUsers]
  );

  // Set a user's off day status
  const setUserOffDay = useCallback(
    async (userName, date, isOff, reason = 'Off') => {
      if (!userName || !date) {
        console.error(
          '❌ OFF-DAYS: Missing userName or date for setUserOffDay'
        );
        return;
      }

      const formattedDate = formatDate(date);
      if (!formattedDate) {
        console.error('❌ OFF-DAYS: Invalid date format');
        return;
      }

      try {
        if (isOff) {
          // Setting user OFF
          console.log(
            `🔄 OFF-DAYS: Setting ${userName} to OFF on ${formattedDate}`
          );

          // Optimistically update UI first
          setOffUsers((prev) => ({
            ...prev,
            [userName]: {
              off_date: formattedDate,
              reason: reason,
              id: Date.now(), // Temporary ID
            },
          }));

          // Insert or update in database
          const { data, error } = await supabase
            .from('user_off_days')
            .upsert(
              {
                user_name: userName,
                off_date: formattedDate,
                reason: reason,
              },
              {
                onConflict: 'user_name,off_date',
              }
            )
            .select();

          if (error) {
            console.error('❌ OFF-DAYS: Database error setting OFF:', error);
            // Revert optimistic update
            setOffUsers((prev) => {
              const updated = { ...prev };
              delete updated[userName];
              return updated;
            });
            setError(error.message);
            return;
          }

          // Update with real database record
          if (data && data[0]) {
            setOffUsers((prev) => ({
              ...prev,
              [userName]: {
                off_date: data[0].off_date,
                reason: data[0].reason,
                id: data[0].id,
              },
            }));
          }

          console.log(
            `✅ OFF-DAYS: ${userName} set to OFF on ${formattedDate}`
          );
        } else {
          // Setting user ON (removing from off days)
          console.log(
            `🔄 OFF-DAYS: Setting ${userName} to ON on ${formattedDate}`
          );

          // Optimistically update UI first
          setOffUsers((prev) => {
            const updated = { ...prev };
            delete updated[userName];
            return updated;
          });

          // Delete from database
          const { error } = await supabase
            .from('user_off_days')
            .delete()
            .eq('user_name', userName)
            .eq('off_date', formattedDate);

          if (error) {
            console.error('❌ OFF-DAYS: Database error setting ON:', error);
            // Revert optimistic update
            setOffUsers((prev) => ({
              ...prev,
              [userName]: {
                off_date: formattedDate,
                reason: reason,
                id: Date.now(),
              },
            }));
            setError(error.message);
            return;
          }

          console.log(`✅ OFF-DAYS: ${userName} set to ON on ${formattedDate}`);
        }
      } catch (err) {
        console.error('❌ OFF-DAYS: Unexpected error in setUserOffDay:', err);
        setError(err.message);
      }
    },
    []
  );

  // Refresh function to reload data
  const refreshOffDays = useCallback(() => {
    const formattedDate = formatDate(selectedDate);
    if (formattedDate) {
      console.log('🔄 OFF-DAYS: Manual refresh requested');
      loadOffDays(formattedDate);
    }
  }, [selectedDate, loadOffDays]);

  return {
    offUsers,
    isUserOff,
    setUserOffDay,
    loading,
    error,
    refreshOffDays,
  };
};
