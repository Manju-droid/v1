'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));

export const ToastContainer: React.FC = () => {
  // Only render on client side
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const { toasts, removeToast } = useToast();

    if (!toasts || toasts.length === 0) {
      return null;
    }

    return (
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] space-y-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm flex items-center gap-3 min-w-[280px] max-w-md ${
                toast.type === 'success'
                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-100'
                  : toast.type === 'error'
                  ? 'bg-red-500/20 border-red-500/30 text-red-100'
                  : 'bg-gray-800/90 border-gray-700 text-gray-100'
              }`}
            >
              {/* Icon */}
              {toast.type === 'success' && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              
              {/* Message */}
              <span className="text-sm font-medium flex-1">{toast.message}</span>
              
              {/* Close button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  } catch (error) {
    console.error('ToastContainer error:', error);
    // Return null on error to prevent app crash
    return null;
  }
};
