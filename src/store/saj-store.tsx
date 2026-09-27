import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { BookingSelection } from "@/data/catalogue";

// The web prototype kept these in localStorage. Phones have no localStorage,
// so AsyncStorage (the same store Supabase will use for the session) does it.

export type Booking = { date: string; time: string; selection: BookingSelection; artist: string; location: string };

type SajState = {
  /** false until the saved values have been read from storage */
  hydrated: boolean;
  onboarded: boolean;
  saved: number[];
  booking: Booking | null;
  finishOnboarding: () => void;
  toggleSave: (id: number) => void;
  confirmBooking: (booking: Booking) => void;
};

const KEYS = { onboarded: "saj-onboarded", saved: "saj-saved", booking: "saj-booking" } as const;

const SajContext = createContext<SajState | null>(null);

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function SajProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [saved, setSaved] = useState<number[]>([2]);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    AsyncStorage.multiGet([KEYS.onboarded, KEYS.saved, KEYS.booking])
      .then((entries) => {
        const map = Object.fromEntries(entries);
        setOnboarded(map[KEYS.onboarded] === "true");
        setSaved(parse(map[KEYS.saved] ?? null, [2]));
        const stored = parse<Booking | null>(map[KEYS.booking] ?? null, null);
        if (stored?.selection) setBooking(stored);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const finishOnboarding = () => {
    setOnboarded(true);
    AsyncStorage.setItem(KEYS.onboarded, "true").catch(() => {});
  };

  const toggleSave = (id: number) => {
    setSaved((old) => {
      const next = old.includes(id) ? old.filter((x) => x !== id) : [...old, id];
      AsyncStorage.setItem(KEYS.saved, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const confirmBooking = (next: Booking) => {
    setBooking(next);
    AsyncStorage.setItem(KEYS.booking, JSON.stringify(next)).catch(() => {});
  };

  return (
    <SajContext.Provider value={{ hydrated, onboarded, saved, booking, finishOnboarding, toggleSave, confirmBooking }}>
      {children}
    </SajContext.Provider>
  );
}

export function useSaj() {
  const ctx = useContext(SajContext);
  if (!ctx) throw new Error("useSaj must be used inside <SajProvider>");
  return ctx;
}
