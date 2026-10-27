"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { DRAWING_HEIGHT, DRAWING_WIDTH } from "@/lib/slide-drawing";

interface SlideStageProps {
  children: ReactNode;
  className: string;
}

// A slide has one coordinate system. Text, graphs, and ink scale together;
// viewport breakpoints must never reflow content underneath saved annotations.
export function SlideStage({ children, className }: SlideStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale({ x: entry.contentRect.width / DRAWING_WIDTH, y: entry.contentRect.height / DRAWING_HEIGHT });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={stageRef} id="presentation-slide-stage" className={className}>
      <div className="presentation-slide-inner" style={{ width: DRAWING_WIDTH, height: DRAWING_HEIGHT, transform: `scale(${scale.x}, ${scale.y})` }}>{children}</div>
    </div>
  );
}
