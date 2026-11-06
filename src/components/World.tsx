import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { FarmScene } from "../game/scenes/FarmScene";
export function World() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current!,
      backgroundColor: "#79a94d",
      scene: [FarmScene],
      scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
      render: { antialias: true, pixelArt: false },
      fps: { target: 30 },
      input: { activePointers: 2 },
    });
    const zoom = (e: Event) =>
      game.events.emit("zoom", (e as CustomEvent).detail);
    window.addEventListener("farm-zoom", zoom);
    const home = () => game.events.emit("home");
    window.addEventListener("farm-home", home);
    return () => {
      window.removeEventListener("farm-zoom", zoom);
      window.removeEventListener("farm-home", home);
      game.destroy(true);
    };
  }, []);
  return <div className="world" ref={host} />;
}
