import { useIsFocused } from "expo-router";
import { StatusBar, type StatusBarStyle } from "expo-status-bar";

/**
 * Tab screens stay mounted when you leave them, so a plain <StatusBar> on each
 * would fight over the style. Only the focused screen renders one.
 */
export function FocusStatusBar({ style }: { style: StatusBarStyle }) {
  const focused = useIsFocused();
  return focused ? <StatusBar style={style} animated /> : null;
}
