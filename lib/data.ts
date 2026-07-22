export type TrainingMode = "presencial" | "online";
export type UserRole = "cliente" | "personal";

export type Trainer = {
  id: string;
  name: string;
  specialty: string;
  pricePerSession: number;
  rating: number;
  modes: TrainingMode[];
  distanceKm?: number;
  bio: string;
  avatarUrl: string | null;
};

export type Client = {
  id: string;
  name: string;
  goal: string;
  modes: TrainingMode[];
  distanceKm?: number;
  bio: string;
  avatarUrl: string | null;
};

// Lista usada nos filtros da tela de match. Na Fase 3 isso pode virar uma
// consulta "distinct" na tabela trainer_profiles em vez de lista fixa.
export const specialties = [
  "Todas",
  "Emagrecimento e HIIT",
  "Hipertrofia",
  "Funcional e mobilidade",
  "Treino de força remoto",
  "Yoga e condicionamento",
  "Corrida e resistência",
];
