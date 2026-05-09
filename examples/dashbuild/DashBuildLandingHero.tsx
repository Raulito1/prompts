import React from "react";
import { ArrowRight } from "lucide-react";

type DashBuildLandingHeroProps = {
  onGetStarted?: () => void;
  getStartedHref?: string;
  /** Use the full generated landing page image as the background. */
  backgroundImageSrc: string;
};

export default function DashBuildLandingHero({
  onGetStarted,
  getStartedHref,
  backgroundImageSrc,
}: DashBuildLandingHeroProps) {
  const buttonClassName =
    "inline-flex h-12 items-center gap-3 rounded-xl border border-[#8f5736] bg-[#f1a978] px-7 text-base font-bold text-[#080604] shadow-[0_0_32px_rgba(226,161,120,0.35)] transition hover:-translate-y-0.5 hover:bg-[#f7bd91] focus:outline-none focus:ring-2 focus:ring-[#f1a978] focus:ring-offset-2 focus:ring-offset-black";

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-[#f7efe3]">
      <img
        src={backgroundImageSrc}
        alt="Dash Build AI-powered engineering dashboard landing page"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      <div className="absolute inset-0 bg-black/10" />

      <section className="relative z-10 flex min-h-screen items-end justify-center px-4 pb-[8vh] sm:pb-[10vh] lg:pb-[12vh]">
        {getStartedHref ? (
          <a href={getStartedHref} className={buttonClassName}>
            Get Started
            <ArrowRight className="h-5 w-5" />
          </a>
        ) : (
          <button type="button" onClick={onGetStarted} className={buttonClassName}>
            Get Started
            <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </section>
    </main>
  );
}

