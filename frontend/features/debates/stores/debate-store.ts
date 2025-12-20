import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DebateStore {
  endedDebates: Set<string>;
  endDebate: (debateId: string) => void;
  isEnded: (debateId: string) => boolean;
}

export const useDebateStore = create<DebateStore>()(
  persist(
    (set, get) => ({
      endedDebates: new Set<string>(),
      
      endDebate: (debateId: string) => {
        set((state) => {
          const newEnded = new Set(state.endedDebates);
          newEnded.add(debateId);
          return { endedDebates: newEnded };
        });
      },
      
      isEnded: (debateId: string) => {
        return get().endedDebates.has(debateId);
      },
    }),
    {
      name: 'debate-store',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              endedDebates: new Set(parsed.state.endedDebates || []),
            },
          };
        },
        setItem: (name, value) => {
          localStorage.setItem(
            name,
            JSON.stringify({
              ...value,
              state: {
                ...value.state,
                endedDebates: Array.from(value.state.endedDebates),
              },
            })
          );
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

