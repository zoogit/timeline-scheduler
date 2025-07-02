// src/hooks/useProfileEditor.jsx
// Hook for managing ProfileEditor modal state and actions
import { useState, useCallback } from 'react';

export const useProfileEditor = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);

  // Open editor for current user's profile
  const openOwnProfile = useCallback(() => {
    setEditingProfileId(null); // null means editing own profile
    setIsOpen(true);
  }, []);

  // Open editor for another user's profile (managers only)
  const openUserProfile = useCallback((userId) => {
    setEditingProfileId(userId);
    setIsOpen(true);
  }, []);

  // Close the editor
  const closeEditor = useCallback(() => {
    setIsOpen(false);
    setEditingProfileId(null);
  }, []);

  // Handle successful save
  const handleSave = useCallback((updatedProfile) => {
    console.log('Profile saved successfully:', updatedProfile);
    // You can add additional logic here like:
    // - Refresh user context
    // - Show global success message
    // - Trigger data refetch
  }, []);

  return {
    isOpen,
    editingProfileId,
    openOwnProfile,
    openUserProfile,
    closeEditor,
    handleSave,
  };
};
