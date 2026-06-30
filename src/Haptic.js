/** Thin wrapper around the Vibration API for mobile haptic feedback. */
export function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (_) {}
}
