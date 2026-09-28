import { router } from "expo-router";

// A guest who taps Save or Book is sent to sign in with `then=back`: once she
// is in, she returns to exactly where she was. From the opening screen there
// is no `then`, and signing in goes to Home.

/** Leaves the sign-in / sign-up screens after success. */
export function leaveAuth(then: string | undefined) {
  if (then === "back" && router.canGoBack()) router.back();
  else router.replace("/home");
}

/**
 * Switches between sign-in and sign-up. With `then=back` the one screen is
 * swapped for the other (not stacked), so one "back" still returns her to
 * where she was.
 */
export function switchAuth(to: "/sign-in" | "/sign-up", then: string | undefined) {
  if (then === "back") router.replace({ pathname: to, params: { then } });
  else if (to === "/sign-in" && router.canGoBack()) router.back();
  else if (to === "/sign-in") router.replace("/sign-in");
  else router.push("/sign-up");
}
