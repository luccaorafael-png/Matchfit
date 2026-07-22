import { Client, TrainingMode } from "@/lib/data";

type Props = {
  client: Client;
  activeMode: TrainingMode;
};

function modeLabel(client: Client) {
  if (client.modes.length > 1) return "Presencial e online";
  return client.modes[0] === "presencial"
    ? "Busca treino presencial"
    : "Busca aula online";
}

export default function ClientCard({ client, activeMode }: Props) {
  return (
    <div className="bg-chalk text-ink rounded-2xl p-6 w-full max-w-sm mx-auto shadow-lg">
      <div className="w-20 h-20 rounded-full bg-ink-light/10 border border-ink/10 flex items-center justify-center mx-auto mb-4 overflow-hidden">
        {client.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={client.avatarUrl}
            alt={client.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-display text-2xl text-ink/70">
            {client.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
        )}
      </div>

      <h2 className="font-display text-xl text-center tracking-wide uppercase">
        {client.name}
      </h2>
      <p className="text-center text-sm text-ink/60 mt-1">{client.goal}</p>

      <div className="flex justify-center gap-2 mt-4 flex-wrap">
        <span className="text-xs font-medium bg-teal/15 text-teal-dark px-3 py-1 rounded-full">
          {modeLabel(client)}
        </span>
        {activeMode === "presencial" && client.distanceKm !== undefined && (
          <span className="text-xs font-medium bg-coral/15 text-coral-dark px-3 py-1 rounded-full">
            {client.distanceKm < 1
              ? "menos de 1 km"
              : `${client.distanceKm.toFixed(0)} km de você`}
          </span>
        )}
      </div>

      <p className="text-sm text-ink/70 mt-4 text-center">{client.bio}</p>
    </div>
  );
}
