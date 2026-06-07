"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Slide = {
  emoji: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    emoji: "🥗",
    title: "Welcome to Numa",
    body: "Eat well, waste less. Numa turns “what's for dinner?” into a plan that fits your goals — and your kitchen.",
  },
  {
    emoji: "🌍",
    title: "Why we built it",
    body: "Good food gets binned every day because planning is hard and life is busy. Numa makes eating well the easy choice — better for you, your wallet, and the planet.",
  },
  {
    emoji: "🧊",
    title: "It knows your kitchen",
    body: "Tell Numa what's in your pantry and it plans around it — using what you already have first, and only shopping for what's actually missing.",
  },
  {
    emoji: "🎯",
    title: "Made for your goals",
    body: "Set a goal, share your tastes in a quick chat, and let Numa build meal plans and shopping lists that actually fit your life.",
  },
];

export default function WelcomeCarousel() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  function finish() {
    router.push("/onboarding");
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      {/* Card */}
      <div className="w-full rounded-3xl border border-stone-200/80 bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 text-4xl">
          {slide.emoji}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {slide.title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-stone-600">{slide.body}</p>

        {/* Dots */}
        <div className="mt-8 flex items-center justify-center gap-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === i ? "w-6 bg-brand-600" : "w-2 bg-stone-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex w-full items-center justify-between gap-4">
        {i > 0 ? (
          <button
            type="button"
            onClick={() => setI((v) => v - 1)}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-stone-500 hover:text-stone-800"
          >
            Back
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-stone-400 hover:text-stone-700"
          >
            Skip
          </button>
        )}

        {last ? (
          <button
            type="button"
            onClick={finish}
            className="rounded-full bg-brand-600 px-7 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Get started
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setI((v) => v + 1)}
            className="rounded-full bg-brand-600 px-7 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
