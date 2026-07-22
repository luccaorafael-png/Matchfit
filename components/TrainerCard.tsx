import { Trainer, TrainingMode } from "@/lib/data";

type Props = {
  trainer: Trainer;
  activeMode: TrainingMode;
};

function modeLabel(trainer: Trainer) {
  if (trainer.modes.length > 1) return "Presencial e online";
  return trainer.modes[0] === "presencial" ? "Atende presencial" : "Aula online";
}

export default function TrainerCard({ trainer, activeMode }: Props) {
  return (
    <div className="bg-chalk text-ink rounded-2xl p-6 w-full max-w-sm mx-auto shadow-lg">
      <div className="w-20 h-20 rounded-full bg-ink-light/10 border border-ink/10 flex items-center justify-center mx-auto mb-4 overflow-hidden">
        {trainer.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trainer.avatarUrl}
            alt={trainer.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-display text-2xl text-ink/70">
            {trainer.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
        )}
      </div>

      <h2 className="font-display text-xl text-center tracking-wide uppercase">
        {trainer.name}
      </h2>
      <p className="text-center text-sm text-ink/60 mt-1">
        {trainer.specialty}
      </p>

      <div className="flex justify-center gap-2 mt-4 flex-wrap">
        <span className="text-xs font-medium bg-coral/15 text-coral-dark px-3 py-1 rounded-full">
          {modeLabel(trainer)}
        </span>
        <span className="text-xs font-medium bg-ink/5 text-ink/70 px-3 py-1 rounded-full">
          R$ {trainer.pricePerSession}/sessão
        </span>
        {activeMode === "presencial" && trainer.distanceKm !== undefined && (
          <span className="text-xs font-medium bg-teal/15 text-teal-dark px-3 py-1 rounded-full">
            {trainer.distanceKm < 1
              ? "menos de 1 km"
              : `${trainer.distanceKm.toFixed(0)} km de você`}
          </span>
        )}
      </div>

      <p className="text-sm text-ink/70 mt-4 text-center">{trainer.bio}</p>

      <div className="flex items-center justify-center gap-1 mt-4 text-sm text-ink/60">
        <span>★</span>
        <span>{trainer.rating.toFixed(1)}</span>
      </div>
    </div>
  );
}
