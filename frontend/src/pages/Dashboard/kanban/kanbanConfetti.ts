export function spawnConfetti(x: number, y: number) {
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

  for (let i = 0; i < 20; i++) {
    const dot = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 8 + 4;
    const angle = Math.random() * 360;
    const dist = Math.random() * 80 + 30;

    const dx = Math.cos((angle * Math.PI) / 180) * dist;
    const dy = Math.sin((angle * Math.PI) / 180) * dist - 50;

    Object.assign(dot.style, {
      position: "fixed",
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: Math.random() > 0.5 ? "50%" : "3px",
      background: color,
      pointerEvents: "none",
      zIndex: "9999",
      transform: "translate(-50%, -50%)",
      transition: "transform 650ms cubic-bezier(.22,1,.36,1), opacity 650ms ease",
      opacity: "1",
    });

    document.body.appendChild(dot);

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        dot.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${angle * 2}deg) scale(0)`;
        dot.style.opacity = "0";
      })
    );

    setTimeout(() => dot.remove(), 700);
  }
}