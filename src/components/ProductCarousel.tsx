"use client";

import { useEffect, useMemo, useState } from "react";

type ProductCarouselProps = {
  images: string[];
  className?: string;
  aspectClassName?: string;
};

export function ProductCarousel({
  images,
  className,
  aspectClassName = "aspect-[4/3]",
}: ProductCarouselProps) {
  const validImages = useMemo(
    () => images.filter((image) => Boolean(image)),
    [images]
  );
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const total = validImages.length;
  const current = total > 0 ? validImages[index % total] : "";

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % total);
  };

  return (
    <div
      className={`relative w-full overflow-hidden bg-slate-100 ${aspectClassName} ${className ?? ""}`}
    >
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt="Imagem do produto"
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
          Sem imagem
        </div>
      )}

      {mounted && total > 1 ? (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-xs text-slate-700 shadow-sm transition hover:bg-white"
          >
            {"<"}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-xs text-slate-700 shadow-sm transition hover:bg-white"
          >
            {">"}
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            {validImages.map((_, dotIndex) => (
              <span
                key={dotIndex}
                className={`h-1.5 w-1.5 rounded-full ${
                  dotIndex === index ? "bg-slate-900" : "bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
