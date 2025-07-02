// src/components/ProfileEditor.jsx
// Enhanced with automatic role/permissions syncing

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import supabase from '../supabaseClient';

const ProfileEditor = ({ profileId = null, onClose = null, onSave = null }) => {
  const { user, userProfile, userRole, isManager, canManageTeam } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    user_name: '',
    role: 'team_member',
    team: '',
    is_active: true,
  });

  // Available options
  const roles = [
    {
      value: 'team_member',
      label: 'Team Member',
      description: 'Can edit schedules and tickets',
    },
    {
      value: 'coordinator',
      label: 'Coordinator',
      description: 'Can edit schedules and manage team',
    },
    {
      value: 'manager',
      label: 'Manager',
      description: 'Full access to all features',
    },
  ];

  const teams = [
    { value: 'London', label: 'London Team (Shift III)' },
    { value: 'Day', label: 'Day Team (Shift I)' },
    { value: 'Night', label: 'Night Team (Shift II)' },
    { value: 'SP', label: 'SP Team (Special Projects)' },
  ];

  // Determine if this is editing own profile or another user's profile
  const isEditingOwnProfile = !profileId || profileId === user?.id;
  const canEditRole = isManager && !isEditingOwnProfile;
  const canEditTeam = canManageTeam;

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (isEditingOwnProfile && userProfile) {
        // Load current user's profile from context
        setFormData({
          email: userProfile.email || '',
          full_name: userProfile.full_name || '',
          user_name: userProfile.user_name || '',
          role: userProfile.role || userProfile.permissions || 'team_member',
          team: userProfile.team || '',
          is_active: userProfile.is_active !== false,
        });
      } else if (profileId) {
        // Load another user's profile
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', profileId)
            .single();

          if (error) throw error;

          // ✅ ROLE SYNC: Process role data consistently
          const profileRole = processRoleData(data);

          setFormData({
            email: data.email || '',
            full_name: data.full_name || '',
            user_name: data.user_name || '',
            role: profileRole,
            team: data.team || '',
            is_active: data.is_active !== false,
          });
        } catch (err) {
          console.error('Error loading profile:', err);
          setError(`Failed to load profile: ${err.message}`);
        } finally {
          setLoading(false);
        }
      }
    };

    loadProfile();
  }, [profileId, userProfile, isEditingOwnProfile]);

  // ✅ ROLE SYNC: Process role data consistently
  const processRoleData = (data) => {
    const validRoles = ['manager', 'coordinator', 'team_member'];

    // Get role from either field
    let role = data.role || data.permissions || 'team_member';

    // Auto-migrate read_only
    if (role === 'read_only') {
      console.log('🔄 ProfileEditor: Auto-migrating read_only to team_member');
      role = 'team_member';
    }

    // Validate role
    if (!validRoles.includes(role)) {
      console.log(
        `🔄 ProfileEditor: Invalid role "${role}", defaulting to team_member`
      );
      role = 'team_member';
    }

    return role;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Validate form data
  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.user_name.trim()) {
      setError('Username is required');
      return false;
    }
    if (!formData.role) {
      setError('Role is required');
      return false;
    }

    // Validate role is one of the valid options
    const validRoles = ['manager', 'coordinator', 'team_member'];
    if (!validRoles.includes(formData.role)) {
      setError('Invalid role selected');
      return false;
    }

    return true;
  };

  // ✅ ENHANCED: Handle form submission with role syncing
  const handleSave = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const targetId = profileId || user?.id;

      if (!targetId) {
        throw new Error('No profile ID available');
      }

      // ✅ ROLE SYNC: Prepare update data with synced role/permissions
      const updateData = {
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
        user_name: formData.user_name.trim(),
        team: formData.team || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      // ✅ SYNC: Always set both role and permissions together
      if (canEditRole || isEditingOwnProfile) {
        updateData.role = formData.role;
        updateData.permissions = formData.role; // Keep them in sync
      }

      console.log('💾 Updating profile:', { targetId, updateData });

      // Update the profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Profile updated successfully:', data);
      setSuccess('Profile updated successfully!');

      // ✅ CACHE: Invalidate auth cache for this user if it's current user
      if (isEditingOwnProfile && onSave) {
        // This will trigger cache refresh in AuthContext
        onSave(data);
      } else if (onSave) {
        onSave(data);
      }

      // Auto-close after success if it's a modal
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('❌ Error saving profile:', err);
      setError(`Failed to save profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="profile-editor-container">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-editor-container">
      <div className="profile-editor">
        <div className="profile-editor-header">
          <h2>
            {isEditingOwnProfile ? 'Edit Your Profile' : 'Edit User Profile'}
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="close-button"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSave} className="profile-form">
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={!isEditingOwnProfile}
              className={!isEditingOwnProfile ? 'disabled-field' : ''}
            />
            {!isEditingOwnProfile && (
              <small className="form-help">
                Email can only be changed by the user themselves
              </small>
            )}
          </div>

          {/* Full Name Field */}
          <div className="form-group">
            <label htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleInputChange}
              required
              placeholder="Enter full name"
            />
          </div>

          {/* Username Field */}
          <div className="form-group">
            <label htmlFor="user_name">Username</label>
            <input
              id="user_name"
              name="user_name"
              type="text"
              value={formData.user_name}
              onChange={handleInputChange}
              required
              placeholder="e.g., Andrei, Claire, Ashley"
            />
            <small className="form-help">
              This should match the names used in your team schedules
            </small>
          </div>

          {/* Role Field */}
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              disabled={!canEditRole && !isEditingOwnProfile}
              className={
                !canEditRole && !isEditingOwnProfile ? 'disabled-field' : ''
              }
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {!canEditRole && !isEditingOwnProfile && (
              <small className="form-help">
                Only managers can change user roles
              </small>
            )}
            <small className="form-help">
              {roles.find((r) => r.value === formData.role)?.description}
            </small>
          </div>

          {/* Team Field */}
          <div className="form-group">
            <label htmlFor="team">Team</label>
            <select
              id="team"
              name="team"
              value={formData.team}
              onChange={handleInputChange}
              disabled={!canEditTeam}
              className={!canEditTeam ? 'disabled-field' : ''}
            >
              <option value="">Select Team</option>
              {teams.map((team) => (
                <option key={team.value} value={team.value}>
                  {team.label}
                </option>
              ))}
            </select>
            {!canEditTeam && (
              <small className="form-help">
                Only managers and coordinators can change team assignments
              </small>
            )}
          </div>

          {/* Active Status (only for managers editing other profiles) */}
          {canEditRole && !isEditingOwnProfile && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                />
                <span>Active User</span>
              </label>
              <small className="form-help">
                Inactive users cannot access the system
              </small>
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
                disabled={saving}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="save-button" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* ✅ CLEAN: Optional role sync notification only when needed */}
        {formData.role !== (userProfile?.role || userProfile?.permissions) && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#e8f4fd',
              borderRadius: '6px',
              fontSize: '14px',
              border: '1px solid #b3d9ff',
            }}
          >
            <strong>Note:</strong> Role and permissions will be automatically
            synchronized when saved.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileEditor;
