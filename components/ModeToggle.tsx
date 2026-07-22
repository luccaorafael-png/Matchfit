"use client";

import { TrainingMode } from "@/lib/data";

type Props = {
  mode: TrainingMode;
  onChange: (mode: TrainingMode) => void;
};

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex bg-ink-light rounded-full p-1 w-full max-w-xs mx-auto">
      <button
        onClick={() => onChange("presencial")}
        className={`flex-1 py-2 rounded-full text-sm font-medium transition ${
          mode === "presencial" ? "bg-coral text-ink" : "text-chalk/60"
        }`}
      >
        Presencial
      </button>
      <button
        onClick={() => onChange("online")}
        className={`flex-1 py-2 rounded-full text-sm font-medium transition ${
          mode === "online" ? "bg-teal text-ink" : "text-chalk/60"
        }`}
      >
        Online
      </button>
    </div>
  );
}
