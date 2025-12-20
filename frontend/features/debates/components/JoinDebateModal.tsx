'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface JoinDebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSide: (side: 'agree' | 'disagree') => void;
  debateTitle: string;
}

export const JoinDebateModal: React.FC<JoinDebateModalProps> = ({
  isOpen,
  onClose,
  onSelectSide,
  debateTitle,
}) => {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1F2937] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto relative"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-gray-200"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modal Content */}
              <div className="p-6 sm:p-8">
                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-100 mb-2">
                  Choose your side
                </h2>
                
                {/* Subtitle */}
                <p className="text-gray-400 text-sm mb-6">
                  Which side do you want to join?
                </p>

                {/* Debate Title */}
                <div className="mb-6 p-4 rounded-lg bg-gray-800/50 border border-white/[0.06]">
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {debateTitle}
                  </p>
                </div>

                {/* Side Selection Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Agree Button */}
                  <motion.button
                    onClick={() => onSelectSide('agree')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500/30 hover:border-green-500/50 transition-all group"
                  >
                    <svg
                      className="w-8 h-8 text-green-400 group-hover:scale-110 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-lg font-semibold text-green-400">Agree</span>
                    <span className="text-xs text-gray-400">Support this side</span>
                  </motion.button>

                  {/* Disagree Button */}
                  <motion.button
                    onClick={() => onSelectSide('disagree')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 border-2 border-red-500/30 hover:border-red-500/50 transition-all group"
                  >
                    <svg
                      className="w-8 h-8 text-red-400 group-hover:scale-110 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-lg font-semibold text-red-400">Disagree</span>
                    <span className="text-xs text-gray-400">Oppose this side</span>
                  </motion.button>
                </div>

                {/* Info text */}
                <p className="text-xs text-gray-500 text-center mt-6">
                  You can switch sides once during the debate
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

