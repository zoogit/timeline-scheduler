// src/components/UserMenu.jsx
// Clean version without debug elements

import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import ProfileEditor from './ProfileEditor';
import { useProfileEditor } from '../hooks/useProfileEditor';

const UserMenu = () => {
  const { user, userProfile, loading, signOut, canEdit, canDelete, userRole } =
    useAuth();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Use the ProfileEditor hook
  const {
    isOpen: isProfileEditorOpen,
    openOwnProfile,
    closeEditor,
    handleSave,
  } = useProfileEditor();

  // Don't render if still loading or no user
  if (loading || !user) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse h-8 w-8 bg-gray-200 rounded-full"></div>
        <div className="animate-pulse h-4 w-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Safe fallback values
  const displayName =
    userProfile?.user_name || userProfile?.full_name || user.email || 'User';
  const displayRole = userProfile?.role || 'team_member';
  const displayEmail = user.email || 'No email';

  const handleEditProfileClick = () => {
    setIsDropdownOpen(false); // Close dropdown
    openOwnProfile(); // Open profile editor
  };

  const handleCloseEditor = () => {
    closeEditor();
  };

  const handleProfileSave = (updatedProfile) => {
    handleSave(updatedProfile);
    // Optionally refresh auth context or show success message
  };

  return (
    <>
      <div className="relative">
        {/* User Menu Button */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {/* Avatar */}
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>

          {/* User Info */}
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {displayName}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {displayRole.replace('_', ' ')}
            </div>
          </div>

          {/* Dropdown Arrow */}
          <svg
            className={`w-4 h-4 text-gray-400 transform transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            {/* User Info Section */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{displayName}</div>
                  <div className="text-sm text-gray-500">{displayEmail}</div>
                  <div className="text-xs text-blue-600 capitalize font-medium">
                    {displayRole.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions Section */}
            <div className="p-4 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-700 mb-2">
                Permissions
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div
                  className={`flex items-center space-x-1 ${
                    canEdit ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canEdit ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  ></div>
                  <span>Edit</span>
                </div>
                <div
                  className={`flex items-center space-x-1 ${
                    canDelete ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canDelete ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  ></div>
                  <span>Delete</span>
                </div>
                <div className="flex items-center space-x-1 text-green-600">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>View</span>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="p-2">
              {/* Edit Profile Button */}
              <button
                onClick={handleEditProfileClick}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-2"
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

              {/* Sign Out Button */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  signOut();
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-2"
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
          </div>
        )}

        {/* Click outside to close */}
        {isDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>

      {/* Profile Editor Modal */}
      {isProfileEditorOpen && (
        <div className="profile-editor-overlay">
          <ProfileEditor
            profileId={null} // null means editing own profile
            onClose={handleCloseEditor}
            onSave={handleProfileSave}
          />
        </div>
      )}
    </>
  );
};

export default UserMenu;
