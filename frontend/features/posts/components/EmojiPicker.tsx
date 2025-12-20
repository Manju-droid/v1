'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

const emojiCategories = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥'],
  'Gestures': ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🙏', '✍️', '👏', '🙌', '👐', '🤲'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '💫', '⭐', '🌟', '💯', '🎉', '🎊'],
  'Objects': ['💻', '📱', '⌨️', '🖥️', '🖨️', '🖱️', '💾', '💿', '📷', '📸', '🎥', '🎬', '📺', '📻', '🎙️', '🎚️', '🎛️', '🎧', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '📚', '📖', '✏️', '✒️', '🖊️', '🖋️'],
  'Nature': ['🌍', '🌎', '🌏', '🌐', '🗺️', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🌊', '💧', '💦', '☔', '⛈️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⚡', '🌈', '⭐', '🌟', '✨', '🔥'],
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ isOpen, onClose, onEmojiSelect }) => {
  const [activeCategory, setActiveCategory] = React.useState<string>('Smileys');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Picker */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-0 mb-2 z-50 bg-gray-900 border border-white/[0.06] rounded-xl shadow-2xl shadow-black/50 w-80"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-1 p-2 border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
            {Object.keys(emojiCategories).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Emoji Grid */}
          <div className="p-3 grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
            {emojiCategories[activeCategory as keyof typeof emojiCategories].map((emoji, index) => (
              <motion.button
                key={`${emoji}-${index}`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onEmojiSelect(emoji);
                  onClose();
                }}
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-800/50 rounded transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

