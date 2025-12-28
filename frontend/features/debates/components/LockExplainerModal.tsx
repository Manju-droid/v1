'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Simplified Lock Explainer Modal - Pure Cinematic Focus
interface LockExplainerModalProps {
    isOpen: boolean;
    onClose: () => void;
    unlockPhase?: number;
}

export const LockExplainerModal: React.FC<LockExplainerModalProps> = ({
    isOpen,
    onClose,
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-sm bg-[#0F1621] border border-cyan-500/20 rounded-2xl shadow-[0_0_50px_-12px_rgba(6,182,212,0.25)] overflow-hidden"
                >
                    {/* Cinematic Header with Pulsing Lock */}
                    <div className="h-48 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/30 via-[#0F1621] to-[#0F1621] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

                        {/* Animated Spotlight */}
                        <motion.div
                            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-cyan-500/20 blur-[60px] rounded-full"
                        />

                        {/* Centered Lock Icon with Pulse */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="relative z-10"
                        >
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border border-cyan-500/30 flex items-center justify-center backdrop-blur-xl shadow-2xl skew-y-3">
                                <motion.svg
                                    animate={{ rotate: [0, -5, 5, -5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                    className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </motion.svg>
                            </div>
                        </motion.div>
                    </div>

                    <div className="p-8 pt-0 text-center relative z-20">
                        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 mb-4 tracking-wider">
                            COMING SOON
                        </h3>
                        <p className="text-gray-300 text-lg italic font-medium leading-relaxed mb-8">
                            "The greatest debates are worth the wait."
                        </p>

                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-medium rounded-lg transition-colors border border-white/5"
                        >
                            Got it
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
