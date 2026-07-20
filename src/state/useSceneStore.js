import { create } from 'zustand'

export const useSceneStore = create((set) => ({
  introComplete: false,
  setIntroComplete: (introComplete) => set({ introComplete }),
}))
