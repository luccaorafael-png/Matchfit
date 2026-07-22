"use client";

import { useRef, useState, ReactNode } from "react";

type Props = {
  cardKey: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: ReactNode;
  rightLabel?: string;
  leftLabel?: string;
};

const SWIPE_THRESHOLD = 100;

export default function SwipeCard({
  cardKey,
  onSwipeLeft,
  onSwipeRight,
  children,
  rightLabel = "Curtir",
  leftLabel = "Passar",
}: Props) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  function handlePointerDown(e: React.PointerEvent) {
    setDragging(true);
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  }

  function handlePointerUp() {
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      onSwipeRight();
    } else if (dragX < -SWIPE_THRESHOLD) {
      onSwipeLeft();
    }
    setDragX(0);
  }

  const rotation = dragX / 20;
  const opacity = dragging ? 1 - Math.min(Math.abs(dragX) / 300, 0.4) : 1;

  return (
    <div
      key={cardKey}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
        opacity,
        transition: dragging ? "none" : "transform 0.25s ease, opacity 0.25s ease",
        touchAction: "pan-y",
        cursor: dragging ? "grabbing" : "grab",
      }}
      className="relative select-none"
    >
      {dragX > 30 && (
        <span className="absolute top-4 left-4 text-teal font-display text-lg uppercase rotate-[-12deg] border-2 border-teal px-2 rounded z-10">
          {rightLabel}
        </span>
      )}
      {dragX < -30 && (
        <span className="absolute top-4 right-4 text-coral font-display text-lg uppercase rotate-[12deg] border-2 border-coral px-2 rounded z-10">
          {leftLabel}
        </span>
      )}
      {children}
    </div>
  );
}
