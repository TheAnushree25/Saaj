import { createContext, useContext, type ReactNode } from "react";
import { useWindowDimensions } from "react-native";

type Screen = { width: number; height: number };

const ScreenContext = createContext<Screen | null>(null);

/** Provided by the laptop phone frame so layouts size themselves to the frame, not the browser. */
export function ScreenProvider({ value, children }: { value: Screen; children: ReactNode }) {
  return <ScreenContext.Provider value={value}>{children}</ScreenContext.Provider>;
}

/**
 * The size of the phone screen the app is drawn on. On a phone this is the
 * window; in the laptop browser preview it is the 390 × 844 phone frame.
 * Use this instead of useWindowDimensions for any layout maths.
 */
export function useScreen(): Screen {
  const window = useWindowDimensions();
  return useContext(ScreenContext) ?? { width: window.width, height: window.height };
}
