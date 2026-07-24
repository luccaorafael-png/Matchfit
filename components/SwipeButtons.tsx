type Props = {
  onPass: () => void;
  onLike: () => void;
};

export default function SwipeButtons({ onPass, onLike }: Props) {
  return (
    <div className="flex justify-center gap-6 mt-6">
      <button
        onClick={onPass}
        aria-label="Passar"
        className="w-14 h-14 rounded-full border border-chalk/20 flex items-center justify-center text-xl hover:bg-ink-light transition"
      >
        ✕
      </button>
      <button
        onClick={onLike}
        aria-label="Curtir"
        className="w-14 h-14 rounded-full bg-coral flex items-center justify-center text-xl text-ink hover:bg-coral-dark transition"
      >
        ♥
      </button>
    </div>
  );
}
