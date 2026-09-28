import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// What this phone remembers on its own. Everything about the bride herself
// (her bookings, her saved artists) lives on the Saaj server instead, so it
// follows her to any phone she signs in on.

type SajState = {
  /** false until the saved values have been read from storage */
  hydrated: boolean;
  /** She has been past the opening screen once, so the app starts at Home. */
  onboarded: boolean;
  finishOnboarding: () => void;
};

const ONBOARDED_KEY = "saj-onboarded";

const SajContext = createContext<SajState | null>(null);

export function SajProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((value) => setOnboarded(value === "true"))
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const finishOnboarding = () => {
    setOnboarded(true);
    AsyncStorage.setItem(ONBOARDED_KEY, "true").catch(() => {});
  };

  return <SajContext.Provider value={{ hydrated, onboarded, finishOnboarding }}>{children}</SajContext.Provider>;
}

export function useSaj() {
  const ctx = useContext(SajContext);
  if (!ctx) throw new Error("useSaj must be used inside <SajProvider>");
  return ctx;
}
