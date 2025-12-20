'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
  isRequesting: boolean;
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  isOpen,
  onAllow,
  onDeny,
  isRequesting,
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isRequesting) {
        onDeny();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, isRequesting, onDeny]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isRequesting ? undefined : onDeny}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1F2937] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto"
            >
              {/* Icon */}
              <div className="p-8 text-center">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                  }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-cyan-500/20 flex items-center justify-center"
                >
                  <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </motion.div>

                <h2 className="text-2xl font-bold text-gray-100 mb-3">
                  Microphone Access Required
                </h2>

                <p className="text-gray-400 text-sm mb-6">
                  This debate room needs access to your microphone to allow you to speak.
                  Your audio will only be shared when you're given permission to speak by the host.
                </p>

                <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
                  <div className="flex items-start gap-3 mb-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-200">Start muted by default</p>
                      <p className="text-xs text-gray-500 mt-1">You can unmute yourself anytime to speak</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-200">Full control</p>
                      <p className="text-xs text-gray-500 mt-1">Mute and unmute yourself freely during the debate</p>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    onClick={onDeny}
                    disabled={isRequesting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="py-3 px-4 rounded-xl font-medium text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Not Now
                  </motion.button>

                  <motion.button
                    onClick={onAllow}
                    disabled={isRequesting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="py-3 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isRequesting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Requesting...
                      </>
                    ) : (
                      'Allow Microphone'
                    )}
                  </motion.button>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  You can change this permission anytime in your browser settings
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

