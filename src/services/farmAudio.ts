let context: AudioContext | null = null;
let enabled = true;
export const setFarmSound = (value: boolean) => {
  enabled = value;
};
export function unlockFarmAudio() {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
  } catch {}
}
/** Original quiet synthesized cues; no audio downloads or continuous playback. */
export function playFarmSound(kind: "collect" | "start") {
  if (!enabled || !context || context.state !== "running") return;
  const start = context.currentTime;
  for (let i = 0; i < (kind === "collect" ? 2 : 1); i++) {
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = kind === "collect" ? 660 + i * 220 : 440;
    gain.gain.setValueAtTime(0, start + i * 0.075);
    gain.gain.linearRampToValueAtTime(0.025, start + i * 0.075 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.075 + 0.14);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start + i * 0.075);
    oscillator.stop(start + i * 0.075 + 0.15);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
}
