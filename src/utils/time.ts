export function formatTime(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds >= 3600)
    return (
      Math.floor(seconds / 3600) +
      ":" +
      String(Math.floor(seconds / 60) % 60).padStart(2, "0") +
      ":" +
      String(seconds % 60).padStart(2, "0")
    );
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}
