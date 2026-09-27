import confetti from "canvas-confetti";

const COLORS = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

/** Fires confetti from both sides of the screen for a second. */
export function celebrate() {
  const end = Date.now() + 1000;
  const frame = () => {
    if (Date.now() > end) return;
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.5 },
      colors: COLORS,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.5 },
      colors: COLORS,
    });
    requestAnimationFrame(frame);
  };
  frame();
}
