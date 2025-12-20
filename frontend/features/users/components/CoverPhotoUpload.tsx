'use client';

import React, { useRef, useState } from 'react';
import { uploadCoverPhoto, removeCoverPhoto } from '../stores/profileAPI';

interface CoverPhotoUploadProps {
  currentCoverPhoto?: string;
  onCoverPhotoChange: (newCoverPhoto?: string) => void;
}

export const CoverPhotoUpload: React.FC<CoverPhotoUploadProps> = ({ currentCoverPhoto, onCoverPhotoChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const newCoverPhoto = await uploadCoverPhoto(file);
      onCoverPhotoChange(newCoverPhoto);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload cover photo');
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
      await removeCoverPhoto();
      onCoverPhotoChange(undefined);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove cover photo');
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
        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : currentCoverPhoto ? 'Change Cover Photo' : 'Add Cover Photo'}
      </button>
      {currentCoverPhoto && (
        <button
          onClick={handleRemove}
          className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold transition-colors"
        >
          Remove Cover Photo
        </button>
      )}
    </div>
  );
};

