import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Participant {
  id: string;
  displayName: string;
  handle: string;
  avatar: string;
  side: 'agree' | 'disagree' | 'spectator' | 'neutral';
  isHost: boolean;
  isSpeaking: boolean;
  hasSwitched: boolean;
  isMutedByHost: boolean; // New field
}

export interface SpeakRequest {
  userId: string;
  userName: string;
  side: 'agree' | 'disagree';
  timestamp: number;
}

export interface DebateRoomState {
  // Room state
  debateId: string | null;
  userSide: 'agree' | 'disagree' | 'spectator' | 'neutral' | null;
  hasJoined: boolean;
  hasSwitched: boolean;
  isSpectator: boolean;

  // Mock participants
  participants: Participant[];
  currentSpeakerId: string | null;
  speakQueue: SpeakRequest[]; // Kept for compatibility but unused

  // Actions
  joinRoom: (debateId: string, side: 'agree' | 'disagree' | 'spectator' | 'neutral', userId: string) => void;
  leaveRoom: () => void;
  switchSide: (userId: string) => void;

  // Open Mic Actions
  toggleSelfMute: (userId: string) => void;

  // Host actions
  muteParticipant: (userId: string) => void; // Host mute (force)
  unmuteParticipant: (userId: string) => void; // Host unmute (allow)
  removeParticipant: (userId: string) => void;

  // Helpers
  getSideCounts: () => { agree: number; disagree: number; spectators: number; neutral: number };
  isJoinLocked: (startTime: string) => boolean;
}

export const useDebateRoomStore = create<DebateRoomState>()(
  persist(
    (set, get) => ({
      debateId: null,
      userSide: null,
      hasJoined: false,
      hasSwitched: false,
      isSpectator: false,
      participants: [],
      currentSpeakerId: null,
      speakQueue: [],

      joinRoom: (debateId, side, userId) => {
        set({
          debateId,
          userSide: side,
          hasJoined: true,
          isSpectator: side === 'spectator',
          hasSwitched: false,
        });
      },

      leaveRoom: () => {
        set({
          debateId: null,
          userSide: null,
          hasJoined: false,
          hasSwitched: false,
          isSpectator: false,
          currentSpeakerId: null,
          speakQueue: [],
        });
      },

      switchSide: (userId) => {
        const state = get();
        if (state.hasSwitched || state.isSpectator || state.userSide === 'neutral') return;

        const newSide = state.userSide === 'agree' ? 'disagree' : 'agree';

        set({
          userSide: newSide,
          hasSwitched: true,
        });
      },

      toggleSelfMute: (userId) => {
        const state = get();
        // If currently speaking, stop speaking (mute)
        if (state.currentSpeakerId === userId) {
          set({ currentSpeakerId: null });
        } else {
          // If not speaking, try to speak (unmute)
          // In open mic, we just take the floor. 
          // Ideally we should check if muted by host
          // For now, we assume check is done in component or here
          set({ currentSpeakerId: userId });
        }
      },

      muteParticipant: (userId) => {
        set((state) => ({
          currentSpeakerId: state.currentSpeakerId === userId ? null : state.currentSpeakerId,
          // In a real app, we'd update the participant's isMutedByHost flag in the participants array
          // But here participants array is empty/mock. 
          // We rely on the component to handle the UI state for isMutedByHost
        }));
      },

      unmuteParticipant: (userId) => {
        // Just clears the force mute, doesn't auto-speak
      },

      removeParticipant: (userId) => {
        set((state) => ({
          currentSpeakerId: state.currentSpeakerId === userId ? null : state.currentSpeakerId,
        }));
      },

      getSideCounts: () => {
        return {
          agree: 0,
          disagree: 0,
          spectators: 0,
          neutral: 0,
        };
      },

      isJoinLocked: (startTime) => {
        const start = new Date(startTime).getTime();
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        return now > start + tenMinutes;
      },
    }),
    {
      name: 'debate-room-storage',
      partialize: (state) => ({
        debateId: state.debateId,
        userSide: state.userSide,
        hasJoined: state.hasJoined,
        hasSwitched: state.hasSwitched,
        isSpectator: state.isSpectator,
      }),
    }
  )
);

