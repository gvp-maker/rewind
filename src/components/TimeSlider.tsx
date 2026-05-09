"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useAudioCrossfade } from "@/hooks/useAudioCrossfade";

interface RewindResult {
  scene: {
    scene: string;
    subjects: string;
    setting: string;
    mood: string;
    colors: string;
    era_guess: string;
    past_art_style: string;
    future_art_style: string;
  };
  panels: {
    past: string;
    present: string;
    future: string;
  };
  music: {
    past: string | null;
    present: string | null;
    future: string | null;
  };
  videos: {
    pastToPresent: string | null;
    presentToFuture: string | null;
  };
  narration?: string | null;
  narrationScript?: string | null;
  poem?: string | null;
}

interface TimeSliderProps {
  result: RewindResult;
}

function getEraWeights(value: number) {
  if (value <= 33) {
    const t = value / 33;
    return { past: 1 - t, present: t, future: 0 };
  } else if (value <= 66) {
    return { past: 0, present: 1, future: 0 };
  } else {
    const t = (value - 66) / 34;
    return { past: 0, present: 1 - t, future: t };
  }
}

function getEraName(value: number): string {
  if (value <= 25) return "past";
  if (value >= 75) return "future";
  return "present";
}

function getInterpolatedYear(value: number, baseYear: number): number {
  const startYear = baseYear - 100;
  const endYear = baseYear + 100;
  return Math.round(startYear + (value / 100) * (endYear - startYear));
}

function getEraHue(value: number): number {
  if (value <= 33) return 35;
  if (value >= 67) return 190;
  return 220;
}

const BASE_YEAR = new Date().getFullYear();

export default function TimeSlider({ result }: TimeSliderProps) {
  const [value, setValue] = useState(50);
  const [audioReady, setAudioReady] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [journeyActive, setJourneyActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50);
  const [narrationPlaying, setNarrationPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"score" | "scene" | "story">("scene");
  const videoRef = useRef<HTMLVideoElement>(null);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const prevEraRef = useRef("present");
  const journeyRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { init, setCrossfade, isStarted, getFrequencyData } = useAudioCrossfade();
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const waveformAnimRef = useRef<number | null>(null);

  const weights = getEraWeights(value);
  const eraLabel = getEraName(value);
  const displayYear = getInterpolatedYear(value, BASE_YEAR);
  const eraHue = getEraHue(value);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.documentElement.style.setProperty("--era-hue", String(eraHue));
  }, [eraHue]);

  const handleStartAudio = useCallback(async () => {
    if (isStarted()) return;
    await init(result.music);
    setAudioReady(true);
  }, [init, result.music, isStarted]);

  const handleSliderChange = useCallback(
    (newValue: number) => {
      setValue(newValue);
      const newWeights = getEraWeights(newValue);
      setCrossfade(newWeights);

      const currentEra = getEraName(newValue);
      const prevEra = prevEraRef.current;

      if (prevEra !== currentEra && videoRef.current) {
        let videoUrl: string | null = null;
        if (
          (prevEra === "past" && currentEra === "present") ||
          (prevEra === "present" && currentEra === "past")
        ) {
          videoUrl = result.videos.pastToPresent;
        } else if (
          (prevEra === "present" && currentEra === "future") ||
          (prevEra === "future" && currentEra === "present")
        ) {
          videoUrl = result.videos.presentToFuture;
        }

        if (videoUrl) {
          videoRef.current.src = videoUrl;
          videoRef.current.play().catch(() => {});
          setShowTransition(true);
        }
        prevEraRef.current = currentEra;
      }
    },
    [setCrossfade, result.videos]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => setShowTransition(false);
    video.addEventListener("ended", handler);
    return () => video.removeEventListener("ended", handler);
  }, []);

  const sliderChangeRef = useRef(handleSliderChange);
  sliderChangeRef.current = handleSliderChange;

  const toggleJourney = useCallback(() => {
    setJourneyActive((prev) => {
      if (prev) {
        if (journeyRef.current) cancelAnimationFrame(journeyRef.current);
        journeyRef.current = null;
        return false;
      }
      return true;
    });
  }, []);

  useEffect(() => {
    if (!journeyActive) return;
    let current = value <= 5 ? 0 : value;
    const speed = 0.15;

    function tick() {
      current += speed;
      if (current >= 100) {
        current = 100;
        setJourneyActive(false);
      }
      const rounded = Math.round(current * 10) / 10;
      setValue(rounded);
      sliderChangeRef.current(rounded);
      if (current < 100) {
        journeyRef.current = requestAnimationFrame(tick);
      }
    }
    journeyRef.current = requestAnimationFrame(tick);
    return () => {
      if (journeyRef.current) cancelAnimationFrame(journeyRef.current);
    };
  }, [journeyActive]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setValue((v) => {
          const nv = Math.max(0, v - (e.shiftKey ? 10 : 2));
          sliderChangeRef.current(nv);
          return nv;
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setValue((v) => {
          const nv = Math.min(100, v + (e.shiftKey ? 10 : 2));
          sliderChangeRef.current(nv);
          return nv;
        });
      } else if (e.key === " ") {
        e.preventDefault();
        toggleJourney();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleJourney]);

  // ── Waveform animation ──
  useEffect(() => {
    if (!audioReady) {
      if (waveformAnimRef.current) cancelAnimationFrame(waveformAnimRef.current);
      return;
    }
    const canvas = waveformRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const data = getFrequencyData();
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (!data) {
        waveformAnimRef.current = requestAnimationFrame(draw);
        return;
      }
      const bins = data.length;
      const barW = Math.max(2, (w / bins) - 2);
      const gap = (w - barW * bins) / (bins - 1);
      for (let i = 0; i < bins; i++) {
        const barH = (data[i] / 255) * h;
        const x = i * (barW + gap);
        const y = h - barH;
        ctx.fillStyle = `hsla(${eraHue}, 70%, 60%, ${0.4 + (data[i] / 255) * 0.6})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 2);
        ctx.fill();
      }
      waveformAnimRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      if (waveformAnimRef.current) cancelAnimationFrame(waveformAnimRef.current);
    };
  }, [audioReady, getFrequencyData, eraHue]);

  // ── Narration ──
  const toggleNarration = useCallback(() => {
    if (!result.narration) return;
    if (narrationRef.current) {
      narrationRef.current.pause();
      narrationRef.current = null;
      setNarrationPlaying(false);
      return;
    }
    const audio = new Audio(result.narration);
    audio.onended = () => {
      narrationRef.current = null;
      setNarrationPlaying(false);
    };
    audio.play().catch(() => {});
    narrationRef.current = audio;
    setNarrationPlaying(true);
  }, [result.narration]);

  // ── Export ──
  const handleExport = useCallback(async () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawImg = (src: string, opacity: number): Promise<void> =>
      new Promise((resolve) => {
        if (opacity <= 0.01) return resolve();
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
      });

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (compareMode) {
      const splitX = (compareSplit / 100) * canvas.width;
      // Draw past on left
      await drawImg(result.panels.past, 1);
      // Clear right side
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#000";
      ctx.fillRect(splitX, 0, canvas.width - splitX, canvas.height);
      // Draw future on right
      const futImg = new Image();
      futImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        futImg.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.rect(splitX, 0, canvas.width - splitX, canvas.height);
          ctx.clip();
          ctx.drawImage(futImg, 0, 0, canvas.width, canvas.height);
          ctx.restore();
          resolve();
        };
        futImg.onerror = () => resolve();
        futImg.src = result.panels.future;
      });
      // Divider line
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, canvas.height);
      ctx.stroke();
      // Labels
      ctx.font = "bold 28px monospace";
      ctx.fillStyle = "white";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
      ctx.fillText(String(BASE_YEAR - 100), 24, canvas.height - 24);
      ctx.fillText(String(BASE_YEAR + 100), canvas.width - 120, canvas.height - 24);
    } else {
      await drawImg(result.panels.past, weights.past);
      await drawImg(result.panels.present, weights.present);
      await drawImg(result.panels.future, weights.future);
      // Year overlay
      ctx.globalAlpha = 1;
      ctx.font = "bold 48px monospace";
      ctx.fillStyle = "white";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 15;
      ctx.fillText(String(displayYear), 24, canvas.height - 30);
    }

    // Watermark
    ctx.globalAlpha = 0.4;
    ctx.shadowBlur = 0;
    ctx.font = "14px sans-serif";
    ctx.fillText("REWIND", canvas.width - 80, 30);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rewind-${displayYear}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [compareMode, compareSplit, weights, displayYear, result.panels]);

  // ── Compare mode drag ──
  const handleCompareMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!compareMode) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setCompareSplit(Math.max(5, Math.min(95, (x / rect.width) * 100)));
    },
    [compareMode]
  );

  const hasMusic = result.music.past || result.music.present || result.music.future;

  const eraDescription = useMemo(() => {
    if (eraLabel === "past") return result.scene.past_art_style;
    if (eraLabel === "future") return result.scene.future_art_style;
    return "present day";
  }, [eraLabel, result.scene]);

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      className="animate-fade-in-up mx-auto w-full max-w-5xl space-y-5"
      tabIndex={0}
    >
      {/* ── Image Viewport ── */}
      <div
        ref={viewportRef}
        className="group relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/80 ring-1 ring-white/10"
        onMouseMove={handleCompareMouseMove}
      >
        {compareMode ? (
          <>
            {/* Side-by-side compare */}
            <img
              src={result.panels.past}
              alt="Past"
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${compareSplit}%)` }}
            >
              <img
                src={result.panels.future}
                alt="Future"
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
            </div>
            {/* Divider line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg"
              style={{ left: `${compareSplit}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-1.5 shadow-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="8,4 4,12 8,20" />
                  <polyline points="16,4 20,12 16,20" />
                </svg>
              </div>
            </div>
            {/* Era labels */}
            <div className="absolute bottom-4 left-4 rounded-lg bg-black/70 px-3 py-1.5 backdrop-blur-sm">
              <span className="font-mono text-lg font-bold text-amber-200">{BASE_YEAR - 100}</span>
            </div>
            <div className="absolute bottom-4 right-4 rounded-lg bg-black/70 px-3 py-1.5 backdrop-blur-sm">
              <span className="font-mono text-lg font-bold text-cyan-300">{BASE_YEAR + 100}</span>
            </div>
          </>
        ) : (
          <>
            {/* Crossfade mode */}
            <img src={result.panels.past} alt="Past" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: weights.past }} draggable={false} />
            <img src={result.panels.present} alt="Present" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: weights.present }} draggable={false} />
            <img src={result.panels.future} alt="Future" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: weights.future }} draggable={false} />

            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: showTransition ? 1 : 0, transition: "opacity 0.5s ease" }}
              muted
              playsInline
            />

            <div className="film-grain" style={{ opacity: weights.past * 0.6 }} />
            <div className="scan-lines" style={{ opacity: weights.future * 0.5 }} />

            {/* Poem overlay */}
            {result.poem && (
              <div className="absolute top-6 left-0 right-0 flex justify-center px-8 pointer-events-none">
                <p
                  className="text-center font-serif text-base italic leading-relaxed text-white/50 transition-opacity duration-500"
                  style={{
                    textShadow: `0 0 20px hsla(${eraHue}, 60%, 40%, 0.4), 0 1px 3px rgba(0,0,0,0.8)`,
                    maxWidth: "28rem",
                  }}
                >
                  {result.poem}
                </p>
              </div>
            )}

            {/* Year counter */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-6 pb-5 pt-16">
              <div className="flex items-end justify-between">
                <div>
                  <span
                    className="year-counter block font-mono text-5xl font-bold text-white drop-shadow-lg"
                    style={{ textShadow: `0 0 30px hsla(${eraHue}, 80%, 60%, 0.5)` }}
                  >
                    {displayYear}
                  </span>
                  <span className="mt-1 block text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                    {eraDescription}
                  </span>
                </div>
                <div
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm transition-all duration-500"
                  style={{
                    background: `hsla(${eraHue}, 60%, 30%, 0.5)`,
                    color: `hsla(${eraHue}, 80%, 80%, 1)`,
                    border: `1px solid hsla(${eraHue}, 60%, 50%, 0.3)`,
                  }}
                >
                  {eraLabel}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="vignette" />

        {/* Keyboard hint */}
        <div className="absolute top-3 left-3 rounded-md bg-black/40 px-2 py-1 text-[10px] text-white/30 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          {compareMode ? "Move cursor to drag divider" : "Arrow keys to scrub · Space to journey"}
        </div>
      </div>

      {/* ── Timeline Slider (hidden in compare mode) ── */}
      {!compareMode && (
        <div className="space-y-1 px-1">
          <div className="relative flex items-center justify-between px-1 text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
            <span className="transition-all duration-300" style={{ color: eraLabel === "past" ? "hsla(35, 80%, 70%, 1)" : undefined }}>
              {BASE_YEAR - 100}
            </span>
            <span className="transition-all duration-300" style={{ color: eraLabel === "present" ? "rgba(255,255,255,0.8)" : undefined }}>
              {BASE_YEAR}
            </span>
            <span className="transition-all duration-300" style={{ color: eraLabel === "future" ? "hsla(190, 80%, 70%, 1)" : undefined }}>
              {BASE_YEAR + 100}
            </span>
          </div>
          <div className="timeline-track relative py-2">
            <input
              type="range"
              min={0}
              max={100}
              value={value}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="time-slider w-full"
            />
          </div>
          <div className="flex justify-between px-1">
            {Array.from({ length: 21 }).map((_, i) => (
              <div
                key={i}
                className="h-1 w-px transition-all duration-300"
                style={{
                  background:
                    Math.abs(i * 5 - value) < 5
                      ? `hsla(${eraHue}, 80%, 70%, 0.6)`
                      : "rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Controls Bar ── */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Journey */}
        {!compareMode && (
          <button
            onClick={() => {
              if (!audioReady && hasMusic) handleStartAudio();
              toggleJourney();
            }}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300"
            style={{
              background: journeyActive ? `hsla(${eraHue}, 60%, 40%, 0.4)` : "rgba(255,255,255,0.08)",
              color: journeyActive ? `hsla(${eraHue}, 80%, 80%, 1)` : "rgba(255,255,255,0.7)",
              border: `1px solid ${journeyActive ? `hsla(${eraHue}, 60%, 50%, 0.4)` : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {journeyActive ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                Pause
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                Journey
              </>
            )}
          </button>
        )}

        {/* Music */}
        {hasMusic && !audioReady && (
          <button
            onClick={handleStartAudio}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/60 transition-all hover:bg-white/10 hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" /></svg>
            Music
          </button>
        )}
        {audioReady && (
          <span className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.03] px-3 py-2 text-xs text-white/30">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: `hsla(${eraHue}, 80%, 60%, 1)` }} />
            Music on
          </span>
        )}

        {/* Narration */}
        {result.narration && (
          <button
            onClick={toggleNarration}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium transition-all hover:bg-white/10"
            style={{
              background: narrationPlaying ? "rgba(168, 85, 247, 0.15)" : "rgba(255,255,255,0.05)",
              color: narrationPlaying ? "rgb(196, 148, 255)" : "rgba(255,255,255,0.6)",
              borderColor: narrationPlaying ? "rgba(168, 85, 247, 0.3)" : undefined,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
            </svg>
            {narrationPlaying ? "Stop" : "Narrate"}
          </button>
        )}

        {/* Compare toggle */}
        <button
          onClick={() => setCompareMode((p) => !p)}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium transition-all hover:bg-white/10"
          style={{
            background: compareMode ? "rgba(59, 130, 246, 0.15)" : "rgba(255,255,255,0.05)",
            color: compareMode ? "rgb(147, 197, 253)" : "rgba(255,255,255,0.6)",
            borderColor: compareMode ? "rgba(59, 130, 246, 0.3)" : undefined,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
          {compareMode ? "Timeline" : "Compare"}
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/60 transition-all hover:bg-white/10 hover:text-white"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      {/* ── Layer Tabs ── */}
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="flex gap-1 rounded-full bg-white/[0.04] p-1">
            {(["score", "scene", "story"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] transition-all"
                style={{
                  background: activeTab === tab ? `hsla(${eraHue}, 40%, 25%, 0.4)` : "transparent",
                  color: activeTab === tab ? `hsla(${eraHue}, 70%, 80%, 1)` : "rgba(255,255,255,0.3)",
                  border: activeTab === tab ? `1px solid hsla(${eraHue}, 40%, 40%, 0.2)` : "1px solid transparent",
                }}
              >
                {tab === "score" ? "The Score" : tab === "scene" ? "The Scene" : "The Story"}
              </button>
            ))}
          </div>
        </div>

        <div
          className="animate-fade-in rounded-xl border px-5 py-4 transition-all duration-500"
          style={{
            background: `hsla(${eraHue}, 30%, 8%, 0.5)`,
            borderColor: `hsla(${eraHue}, 40%, 30%, 0.2)`,
          }}
        >
          {/* THE SCORE — Music & Waveform */}
          {activeTab === "score" && (
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Audio Layers</p>
              {audioReady ? (
                <>
                  <div className="overflow-hidden rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <canvas
                      ref={waveformRef}
                      width={512}
                      height={48}
                      className="w-full"
                      style={{ height: "48px" }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: `hsla(${eraHue}, 80%, 60%, 1)` }} />
                    Crossfading between {eraLabel} era music
                  </div>
                </>
              ) : hasMusic ? (
                <p className="text-xs text-white/40">Press Music to start the audio experience</p>
              ) : (
                <p className="text-xs text-white/40">No music tracks available</p>
              )}
              <div className="flex items-center gap-2 text-xs text-white/30">
                <span className="text-amber-400/60">Jazz &middot; Ragtime</span>
                <span className="text-white/15">&rarr;</span>
                <span className="text-white/40">Modern &middot; Indie</span>
                <span className="text-white/15">&rarr;</span>
                <span className="text-cyan-400/60">Synth &middot; Ethereal</span>
              </div>
            </div>
          )}

          {/* THE SCENE — Metadata & 3D */}
          {activeTab === "scene" && (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-white/60">{result.scene.scene}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: result.scene.setting, icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" },
                  { label: result.scene.mood, icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" },
                  { label: result.scene.era_guess, icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0v10l4.5 4.5" },
                ].map(({ label, icon }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: `hsla(${eraHue}, 40%, 20%, 0.3)`,
                      color: `hsla(${eraHue}, 60%, 75%, 0.8)`,
                      border: `1px solid hsla(${eraHue}, 40%, 40%, 0.15)`,
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={icon} />
                    </svg>
                    {label}
                  </span>
                ))}
              </div>
              {result.scene.colors && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-white/20">Palette</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.scene.colors.split(",").map((color) => (
                      <span
                        key={color}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40"
                      >
                        {color.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-white/30">
                <span className="text-amber-400/60">{result.scene.past_art_style}</span>
                <span className="text-white/15">&rarr;</span>
                <span className="text-white/40">present</span>
                <span className="text-white/15">&rarr;</span>
                <span className="text-cyan-400/60">{result.scene.future_art_style}</span>
              </div>
            </div>
          )}

          {/* THE STORY — Poem & Narration */}
          {activeTab === "story" && (
            <div className="space-y-4">
              {result.poem && (
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-2">AI-Generated Poetry</p>
                  <p
                    className="font-serif text-lg italic leading-relaxed text-white/60"
                    style={{ textShadow: `0 0 20px hsla(${eraHue}, 60%, 40%, 0.3)` }}
                  >
                    {result.poem}
                  </p>
                </div>
              )}
              {result.narrationScript && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Narration Script</p>
                  <p className="text-sm italic leading-relaxed text-purple-200/60">
                    &ldquo;{result.narrationScript}&rdquo;
                  </p>
                  {result.narration && (
                    <button
                      onClick={toggleNarration}
                      className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                      style={{
                        background: narrationPlaying ? "rgba(168, 85, 247, 0.15)" : "rgba(255,255,255,0.05)",
                        color: narrationPlaying ? "rgb(196, 148, 255)" : "rgba(255,255,255,0.5)",
                        border: `1px solid ${narrationPlaying ? "rgba(168, 85, 247, 0.3)" : "rgba(255,255,255,0.1)"}`,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
                      </svg>
                      {narrationPlaying ? "Stop" : "Play Narration"}
                    </button>
                  )}
                </div>
              )}
              {!result.poem && !result.narrationScript && (
                <p className="text-center text-xs text-white/30">No story content available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
