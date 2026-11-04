import { create } from 'zustand';

/** Ephemeral UI-only state; it is never an authorization or server-data source. */
type FoundationState = {
  welcomeDismissed: boolean;
  dismissWelcome: () => void;
};

export const useFoundationStore = create<FoundationState>((set) => ({
  welcomeDismissed: false,
  dismissWelcome: () => set({ welcomeDismissed: true }),
}));
