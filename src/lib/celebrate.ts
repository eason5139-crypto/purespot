export async function celebrate() {
  if (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const { default: confetti } = await import("canvas-confetti");
  await confetti({
    particleCount: 65,
    spread: 65,
    startVelocity: 25,
    gravity: 0.9,
    ticks: 130,
    colors: ["#4f8ab8", "#b9d3e4", "#d6b477", "#6c8d7d"],
    disableForReducedMotion: true,
    origin: { y: 0.65 },
  });
}
