'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DebateCard } from './DebateCard';
import { Debate } from '@/lib/mock-debates';

interface DebateCarouselProps {
  debates: Debate[];
  title: string;
  onRegister?: (debateId: string) => void;
  onUnregister?: (debateId: string) => void;
  onDelete?: (debateId: string) => void;
  registeredDebates?: Set<string>;
}

export const DebateCarousel: React.FC<DebateCarouselProps> = ({ debates, title, onRegister, onUnregister, onDelete, registeredDebates = new Set() }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [debates]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cardWidth = 280; // Approximate card width
    const scrollAmount = cardWidth * 2; // Scroll 2 cards at a time
    const targetScroll = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  if (debates.length === 0) {
    return (
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-5 text-gray-100">{title}</h2>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-12 text-center"
        >
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No debates found</h3>
          <p className="text-gray-500">Check back later or create your own!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mb-8 sm:mb-10 group/carousel">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-5 text-gray-100">{title}</h2>

      <div className="relative">
        {/* Left Arrow */}
        <AnimatePresence>
          {showLeftArrow && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full bg-gradient-to-r from-[#0C1117] via-[#0C1117]/80 to-transparent flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
              aria-label="Scroll left"
            >
              <div className="w-10 h-10 rounded-full bg-gray-800/90 hover:bg-gray-700 flex items-center justify-center border border-white/10 transition-all hover:scale-110">
                <svg className="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right Arrow */}
        <AnimatePresence>
          {showRightArrow && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full bg-gradient-to-l from-[#0C1117] via-[#0C1117]/80 to-transparent flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
              aria-label="Scroll right"
            >
              <div className="w-10 h-10 rounded-full bg-gray-800/90 hover:bg-gray-700 flex items-center justify-center border border-white/10 transition-all hover:scale-110">
                <svg className="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-6 px-6 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {debates.map((debate, index) => (
            <div
              key={debate.id}
              className="flex-shrink-0 w-[85vw] min-w-[280px] sm:w-[calc(50%-8px)] md:w-[280px] max-w-[360px]"
            >
              <DebateCard
                debate={debate}
                index={index}
                onRegister={onRegister}
                onUnregister={onUnregister}
                onDelete={onDelete}
                isRegistered={registeredDebates.has(debate.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
