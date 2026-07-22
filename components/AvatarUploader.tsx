"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/session";

export default function AvatarUploader() {
  const { user, updateUser } = useSession();
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem (jpg, png, etc).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande — o limite é 5MB.");
      return;
    }

    // Guarda o arquivo escolhido e mostra uma prévia local — o upload só
    // acontece de verdade quando a pessoa clicar em "Salvar foto".
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleCancelPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    setError(null);
  }

  async function handleSave() {
    if (!pendingFile || !user) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    const ext = pendingFile.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, pendingFile, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    // Adiciona um timestamp na URL só pra "furar" o cache do navegador
    // quando a pessoa troca a foto (o nome do arquivo continua o mesmo).
    await updateUser({ avatarUrl: `${publicUrl}?t=${Date.now()}` });

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    setUploading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  const displayUrl = previewUrl ?? user.avatarUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-24 h-24 rounded-full overflow-hidden bg-coral/20 border border-coral/40 flex items-center justify-center">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt="Sua foto de perfil"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl font-medium text-coral">
            {initials || "?"}
          </span>
        )}
      </div>

      {pendingFile ? (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={uploading}
            className="text-xs text-ink bg-teal px-4 py-2 rounded-full hover:bg-teal-dark transition disabled:opacity-50"
          >
            {uploading ? "Salvando..." : "Salvar foto"}
          </button>
          <button
            onClick={handleCancelPreview}
            disabled={uploading}
            className="text-xs text-chalk/60 hover:underline disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <label className="text-xs text-teal cursor-pointer hover:underline">
          Trocar foto
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      )}

      {error && <p className="text-coral text-xs text-center">{error}</p>}
      {success && (
        <p className="text-teal text-xs text-center">Foto salva com sucesso!</p>
      )}
    </div>
  );
}
