'use client';

import React, { useRef, useState } from 'react';
import { uploadAvatar, removeAvatar } from '../stores/profileAPI';

interface AvatarUploadProps {
  currentAvatar: string;
  onAvatarChange: (newAvatar: string) => void;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ currentAvatar, onAvatarChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const newAvatar = await uploadAvatar(file);
      onAvatarChange(newAvatar);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    try {
      await removeAvatar();
      const defaultAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=CurrentUser&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf';
      onAvatarChange(defaultAvatar);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove avatar');
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Change Photo'}
      </button>
      {currentAvatar && currentAvatar !== 'https://api.dicebear.com/7.x/bottts/svg?seed=CurrentUser&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf' && (
        <button
          onClick={handleRemove}
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold transition-colors"
        >
          Remove Photo
        </button>
      )}
    </div>
  );
};

