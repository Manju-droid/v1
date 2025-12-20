'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import Image from 'next/image';

interface UserOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    participant: any;
    onRemove: (userId: string) => void;
}

export const UserOptionsModal: React.FC<UserOptionsModalProps> = ({
    isOpen,
    onClose,
    participant,
    onRemove,
}) => {
    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!participant) return null;

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
                            className="bg-[#1F2937] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden"
                        >
                            {/* Header with User Info */}
                            <div className="p-6 flex flex-col items-center border-b border-white/[0.08] bg-[#1A1F2E]">
                                <div className="relative mb-3">
                                    <Image
                                        src={participant.avatar || `https://ui-avatars.com/api/?name=${participant.displayName || participant.id}&background=random`}
                                        alt={participant.displayName}
                                        width={80}
                                        height={80}
                                        className="rounded-full w-20 h-20 border-4 border-[#1F2937]"
                                    />
                                    <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-[#1F2937] bg-teal-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-100">{participant.displayName}</h3>
                                <p className="text-sm text-gray-400">@{participant.username || 'user'}</p>
                            </div>

                            {/* Actions */}
                            <div className="p-4 space-y-3">
                                <button
                                    onClick={() => {
                                        onRemove(participant.id);
                                        onClose();
                                    }}
                                    className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-3 font-medium bg-red-600/10 text-red-500 hover:bg-red-600/20 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                                    Remove from Room
                                </button>

                                <button
                                    onClick={onClose}
                                    className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-3 font-medium text-gray-400 hover:bg-gray-700/30 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
