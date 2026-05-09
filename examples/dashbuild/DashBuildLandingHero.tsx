import React from "react";
import { ArrowRight } from "lucide-react";

type MetricCard = {
  title: string;
  value: string;
  delta: string;
  deltaDirection?: "up" | "down";
};

type DashBuildLandingHeroProps = {
  onGetStarted?: () => void;
  getStartedHref?: string;
  astronautImageSrc?: string;
};

const METRICS: MetricCard[] = [
  {
    title: "Deployment Frequency",
    value: "24.8/day",
    delta: "18.6%",
    deltaDirection: "up",
  },
  {
    title: "Change Failure Rate",
    value: "12.4%",
    delta: "8.3%",
    deltaDirection: "down",
  },
  {
    title: "MTTR",
    value: "2.4 hrs",
    delta: "16.7%",
    deltaDirection: "down",
  },
  {
    title: "Lead Time for Changes",
    value: "3.2 days",
    delta: "12.1%",
    deltaDirection: "down",
  },
];

function MiniBarChart() {
  const bars = [48, 44, 52, 61, 57, 66, 69, 82];

  return (
    <div className="flex h-24 items-end gap-2 border-b border-[#5f3823]/60 pb-2">
      {bars.map((height, index) => (
        <div
          key={index}
          className="w-full rounded-t-sm bg-gradient-to-t from-[#8b4f30] to-[#e2a178] shadow-[0_0_14px_rgba(226,161,120,0.25)]"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function MiniLineChart({ direction = "up" }: { direction?: "up" | "down" }) {
  const points =
    direction === "up"
      ? "M 0 72 C 20 54, 28 60, 42 44 S 74 28, 92 36 S 120 8, 144 18 S 168 4, 190 14"
      : "M 0 14 C 18 24, 30 46, 48 42 S 78 56, 92 48 S 126 72, 146 58 S 166 78, 190 72";

  return (
    <svg viewBox="0 0 190 90" className="h-28 w-full overflow-visible">
      <defs>
        <linearGradient id={`line-fill-${direction}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d8956a" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#d8956a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${points} L 190 90 L 0 90 Z`} fill={`url(#line-fill-${direction})`} />
      <path d={points} fill="none" stroke="#e2a178" strokeWidth="2.5" strokeLinecap="round" />
      {[24, 48, 72].map((y) => (
        <line key={y} x1="0" x2="190" y1={y} y2={y} stroke="#3a2a22" strokeWidth="1" />
      ))}
    </svg>
  );
}

function MetricsSummaryCard() {
  return (
    <div className="rounded-2xl border border-[#3b2b22]/90 bg-[#080604]/75 p-5 shadow-[0_0_40px_rgba(226,161,120,0.08)] backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[#efe7d9]">DORA Summary</p>
        <p className="text-xs text-[#d8956a]">This Quarter</p>
      </div>

      <div className="space-y-4">
        {METRICS.map((metric) => (
          <div key={metric.title} className="flex items-center justify-between gap-4 border-b border-[#2b211b] pb-3 last:border-0 last:pb-0">
            <div>
              <p className="text-xs text-[#8f8378]">{metric.title}</p>
              <p className="mt-1 text-lg font-semibold text-[#efe7d9]">{metric.value}</p>
            </div>
            <p className="text-xs font-medium text-[#d8956a]">
              {metric.deltaDirection === "up" ? "↑" : "↓"} {metric.delta}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashBuildLandingHero({
  onGetStarted,
  getStartedHref,
  astronautImageSrc,
}: DashBuildLandingHeroProps) {
  const handleGetStarted = () => {
    onGetStarted?.();
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#030302] px-4 py-10 text-[#f7efe3] sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(226,161,120,0.16),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(226,161,120,0.28),transparent_24%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(#d8956a_1px,transparent_1px)] [background-size:54px_54px]" />
      <div className="absolute -bottom-44 left-1/2 h-[390px] w-[115vw] -translate-x-1/2 rounded-[100%] border-t border-[#f0b487]/60 bg-[radial-gradient(circle_at_50%_0%,rgba(226,161,120,0.32),rgba(27,15,10,0.15)_42%,transparent_72%)] shadow-[0_-18px_80px_rgba(226,161,120,0.28)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col items-center justify-center gap-10">
        <div className="absolute left-0 top-[18%] hidden w-64 rotate-[-3deg] lg:block xl:w-72">
          <MetricsSummaryCard />
        </div>

        <div className="absolute bottom-[12%] left-0 hidden w-72 rounded-2xl border border-[#3b2b22]/90 bg-[#080604]/75 p-5 backdrop-blur-md lg:block">
          <p className="text-sm text-[#efe7d9]">Change Failure Rate</p>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-3xl font-semibold">12.4%</p>
            <p className="pb-1 text-sm text-[#d8956a]">↓ 8.3%</p>
          </div>
          <MiniLineChart />
        </div>

        <div className="absolute right-0 top-[28%] hidden w-72 rounded-2xl border border-[#3b2b22]/90 bg-[#080604]/75 p-5 backdrop-blur-md lg:block xl:w-80">
          <p className="text-sm text-[#efe7d9]">Deployment Frequency</p>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-3xl font-semibold">24.8</p>
            <p className="pb-1 text-sm text-[#8f8378]">/day</p>
            <p className="pb-1 text-sm text-[#d8956a]">↑ 18.6%</p>
          </div>
          <div className="mt-5">
            <MiniBarChart />
          </div>
        </div>

        <div className="absolute bottom-[10%] right-0 hidden w-72 rounded-2xl border border-[#3b2b22]/90 bg-[#080604]/75 p-5 backdrop-blur-md lg:block xl:w-80">
          <p className="text-sm text-[#efe7d9]">MTTR</p>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-3xl font-semibold">2.4</p>
            <p className="pb-1 text-sm text-[#8f8378]">hrs</p>
            <p className="pb-1 text-sm text-[#d8956a]">↓ 16.7%</p>
          </div>
          <MiniLineChart direction="down" />
        </div>

        <div className="relative z-10 w-full max-w-4xl text-center">
          <div className="relative mx-auto mb-8 flex items-center justify-center gap-3 sm:gap-6">
            <h1 className="text-6xl font-black italic tracking-tight text-[#f1a978] drop-shadow-[0_0_32px_rgba(226,161,120,0.35)] sm:text-7xl lg:text-8xl">
              Dash
            </h1>

            <div className="relative -mx-2 h-28 w-28 sm:h-36 sm:w-36 lg:h-44 lg:w-44">
              {astronautImageSrc ? (
                <img
                  src={astronautImageSrc}
                  alt="AI agent astronaut mascot"
                  className="h-full w-full object-contain drop-shadow-[0_0_28px_rgba(226,161,120,0.4)]"
                />
              ) : (
                <div className="flex h-full w-full rotate-12 items-center justify-center rounded-full border border-[#5f3823] bg-[#120d09] shadow-[0_0_42px_rgba(226,161,120,0.24)]">
                  <div className="rounded-full border border-[#d8956a] px-5 py-4 text-lg font-black text-[#f1a978]">AI</div>
                </div>
              )}
              <div className="absolute -bottom-6 left-0 h-16 w-40 -rotate-[22deg] rounded-full bg-gradient-to-r from-transparent via-[#f1a978]/70 to-transparent blur-xl" />
            </div>

            <h1 className="text-6xl font-black tracking-tight text-[#efe7d9] drop-shadow-[0_0_26px_rgba(239,231,217,0.22)] sm:text-7xl lg:text-8xl">
              Build
            </h1>
          </div>

          <p className="mx-auto max-w-3xl text-lg font-medium text-[#efe7d9] sm:text-2xl">
            Build AI-powered engineering dashboards from your data with a faster, guided experience.
          </p>

          <div className="mt-8 flex justify-center">
            {getStartedHref ? (
              <a
                href={getStartedHref}
                className="inline-flex h-12 items-center gap-3 rounded-xl border border-[#8f5736] bg-[#f1a978] px-7 text-base font-bold text-[#080604] shadow-[0_0_32px_rgba(226,161,120,0.28)] transition hover:-translate-y-0.5 hover:bg-[#f7bd91]"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </a>
            ) : (
              <button
                type="button"
                onClick={handleGetStarted}
                className="inline-flex h-12 items-center gap-3 rounded-xl border border-[#8f5736] bg-[#f1a978] px-7 text-base font-bold text-[#080604] shadow-[0_0_32px_rgba(226,161,120,0.28)] transition hover:-translate-y-0.5 hover:bg-[#f7bd91]"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
