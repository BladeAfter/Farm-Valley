import { useEffect, useRef, useState } from "react";
import { number } from "../../i18n/core";

export function ResourceCounter({
  value,
  image,
  label,
}: {
  value: number;
  image: string;
  label: string;
}) {
  const [display, setDisplay] = useState(value),
    current = useRef(value);
  useEffect(() => {
    if (current.current === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const from = current.current,
      start = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / 450);
      current.current = Math.round(
        from + (value - from) * (1 - Math.pow(1 - progress, 3)),
      );
      setDisplay(current.current);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <div className="resource-counter" aria-label={label + ": " + value}>
      <img src={image} alt="" />
      <strong>{number(display)}</strong>
    </div>
  );
}
