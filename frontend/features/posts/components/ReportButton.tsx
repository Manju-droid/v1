'use client';

import React, { useState } from 'react';
import { postAPI } from '@v/api-client';
import { currentUserMock } from '@/lib/store';

interface ReportButtonProps {
  postId: string;
  onReported?: () => void;
}

export const ReportButton: React.FC<ReportButtonProps> = ({ postId, onReported }) => {
  const [isReporting, setIsReporting] = useState(false);

  const handleReport = async () => {
    if (!confirm('Report this post? It will be reviewed by moderators.')) {
      return;
    }

    if (!currentUserMock?.id) {
      alert('Please log in to report posts');
      return;
    }

    setIsReporting(true);
    try {
      await postAPI.report(postId, currentUserMock.id);
      onReported?.();
    } catch (error: any) {
      console.error('Report error:', error);
      // Check if it's a network error (backend not running)
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError') || error?.message?.includes('Load failed')) {
        alert('Cannot connect to server. Please make sure the backend server is running on http://localhost:8080');
      } else {
        const errorMessage = error?.message || error?.toString() || 'Failed to report post. Please try again.';
        alert(errorMessage);
      }
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <button
      onClick={handleReport}
      disabled={isReporting}
      className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3 disabled:opacity-50"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {isReporting ? 'Reporting...' : 'Report Post'}
    </button>
  );
};

