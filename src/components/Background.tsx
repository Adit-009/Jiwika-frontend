import React, { useState, useEffect } from "react";
import backgroundImg from "@/assets/nature.png";

export function Background() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 -z-50 bg-background pointer-events-none overflow-hidden select-none"
      style={{ transform: "translate3d(0,0,0)" }}
    >
      <img
        className="h-full w-full object-cover select-none pointer-events-none"
        src={backgroundImg}
        alt=""
        style={{
          willChange: "transform",

          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
        }}
      />
      {/* <div className="absolute inset-0 bg-gradient-to-bl from-primary/2 via-background to-secondary/4 pointer-events-none" /> */}
    </div>
  );
}
