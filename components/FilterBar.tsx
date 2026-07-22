"use client";

import { useEffect, useState } from "react";
import { specialties } from "@/lib/data";

export type Filters = {
  specialty: string;
  maxPrice: number;
  maxDistance: number;
};

type Props = {
  filters: Filters;
  onChange: (filters: Filters) => void;
  showDistance: boolean;
};

const PRICE_MIN = 10;
const PRICE_MAX = 500;
const DISTANCE_MIN = 1;
const DISTANCE_MAX = 20;

export default function FilterBar({ filters, onChange, showDistance }: Props) {
  // Estado local só pra o número andar suave enquanto arrasta o slider.
  // O onChange do componente pai (que dispara a busca no banco) só é
  // chamado quando o usuário solta o slider — não a cada pixel arrastado.
  const [draftPrice, setDraftPrice] = useState(filters.maxPrice);
  const [draftDistance, setDraftDistance] = useState(filters.maxDistance);

  useEffect(() => setDraftPrice(filters.maxPrice), [filters.maxPrice]);
  useEffect(() => setDraftDistance(filters.maxDistance), [filters.maxDistance]);

  function commitPrice(value: number) {
    onChange({ ...filters, maxPrice: value });
  }

  function commitDistance(value: number) {
    onChange({ ...filters, maxDistance: value });
  }

  return (
    <details className="w-full max-w-sm mt-4 bg-ink-light rounded-xl px-4 py-3">
      <summary className="text-sm text-chalk/70 cursor-pointer select-none">
        Filtros
      </summary>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-xs text-chalk/60 mb-1">
            Especialidade
          </label>
          <select
            value={filters.specialty}
            onChange={(e) =>
              onChange({ ...filters, specialty: e.target.value })
            }
            className="w-full bg-ink text-chalk border border-chalk/20 rounded-lg px-3 py-2 text-sm"
          >
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-chalk/60 mb-1">
            Preço máximo: R$ {draftPrice}
            {draftPrice >= PRICE_MAX ? "+" : ""}
          </label>
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={5}
            value={draftPrice}
            onChange={(e) => setDraftPrice(Number(e.target.value))}
            onMouseUp={(e) => commitPrice(Number((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => commitPrice(Number((e.target as HTMLInputElement).value))}
            onKeyUp={(e) => commitPrice(Number((e.target as HTMLInputElement).value))}
            className="w-full accent-coral"
          />
        </div>

        {showDistance && (
          <div>
            <label className="block text-xs text-chalk/60 mb-1">
              Distância máxima: {draftDistance} km
            </label>
            <input
              type="range"
              min={DISTANCE_MIN}
              max={DISTANCE_MAX}
              step={1}
              value={draftDistance}
              onChange={(e) => setDraftDistance(Number(e.target.value))}
              onMouseUp={(e) => commitDistance(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => commitDistance(Number((e.target as HTMLInputElement).value))}
              onKeyUp={(e) => commitDistance(Number((e.target as HTMLInputElement).value))}
              className="w-full accent-teal"
            />
          </div>
        )}
      </div>
    </details>
  );
}
