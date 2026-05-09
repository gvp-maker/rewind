"use client";

import { useState, useCallback, useEffect } from "react";
import UploadZone from "@/components/UploadZone";
import TimeSlider from "@/components/TimeSlider";

interface LoadingStep {
  label: string;
  detail: string;
  done: boolean;
}

function useDemo() {
  const [demoResult, setDemoResult] = useState<unknown>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      fetch("/demo-result.json")
        .then((r) => r.json())
        .then((data) => {
          if (data.panels?.past) setDemoResult(data);
        })
        .catch(() => {});
    }
  }, []);
  return demoResult;
}

const INITIAL_STEPS: LoadingStep[] = [
  { label: "Gemini Flash", detail: "Analyzing scene", done: false },
  { label: "GPT Image", detail: "Generating era panels", done: false },
  { label: "Lyria 3", detail: "Composing music", done: false },
  { label: "ElevenLabs", detail: "Narrating the story", done: false },
  { label: "fal.ai", detail: "Creating transitions", done: false },
];

function stepIndexFromMessage(msg: string): number {
  if (msg.includes("analyzing") || msg.includes("Analyzing")) return 0;
  if (msg.includes("panels") || msg.includes("Generating era")) return 1;
  if (msg.includes("music") || msg.includes("composing")) return 1;
  if (msg.includes("narration") || msg.includes("Narrat")) return 3;
  if (msg.includes("transition") || msg.includes("video")) return 4;
  if (msg.includes("done") || msg.includes("Done") || msg.includes("Assembling")) return 5;
  return -1;
}

export default function Home() {
  const demoResult = useDemo();
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [steps, setSteps] = useState<LoadingStep[]>(INITIAL_STEPS);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (demoResult) setResult(demoResult);
  }, [demoResult]);

  // Update steps when status message changes
  useEffect(() => {
    if (!statusMessage) return;
    const idx = stepIndexFromMessage(statusMessage);
    if (idx < 0) return;
    setSteps((prev) =>
      prev.map((s, i) => (i < idx ? { ...s, done: true } : s))
    );
  }, [statusMessage]);

  const handleUpload = useCallback(async (file: File, previewUrl: string) => {
    setPreview(previewUrl);
    setError(null);
    setResult(null);
    setLoading(true);
    setSteps(INITIAL_STEPS);
    setStatusMessage("Uploading your photo...");

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) {
        throw new Error("Generation failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ") && eventType) {
            const data = JSON.parse(line.slice(6));

            if (eventType === "status") {
              setStatusMessage(data.step);
            } else if (eventType === "result") {
              setSteps((prev) => prev.map((s) => ({ ...s, done: true })));
              setResult(data);
              setLoading(false);
            } else if (eventType === "error") {
              throw new Error(data.message);
            }
            eventType = "";
          }
        }
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }, []);

  const handleReset = () => {
    setLoading(false);
    setResult(null);
    setPreview(null);
    setError(null);
    setStatusMessage("");
    setSteps(INITIAL_STEPS);
  };

  return (
    <>
      {/* Ambient glow background */}
      <div className="ambient-glow" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="shimmer-text font-mono text-6xl font-bold tracking-tight">
            REWIND
          </h1>
          <p className="mt-3 text-xs tracking-[0.25em] text-white/30">
            TRAVEL THROUGH TIME WITH ANY PHOTO
          </p>
        </header>

        {/* Upload state */}
        {!loading && !result && !error && (
          <div className="w-full max-w-lg">
            <UploadZone onUpload={handleUpload} />
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="animate-fade-in flex w-full max-w-2xl flex-col items-center gap-8">
            {/* Preview image with overlay */}
            {preview && (
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
                <img
                  src={preview}
                  alt="Uploaded"
                  className="h-full w-full object-cover opacity-30 blur-[1px]"
                />
                <div className="vignette" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
                    <p className="text-sm font-medium text-white/70">
                      {statusMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step-by-step progress */}
            <div className="w-full max-w-sm space-y-2.5">
              {steps.map((step, i) => (
                <div
                  key={step.label}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-500"
                  style={{
                    opacity: step.done ? 1 : 0.4,
                    background: step.done ? "rgba(255,255,255,0.03)" : "transparent",
                  }}
                >
                  <div
                    className="step-check transition-all duration-300"
                    style={{
                      background: step.done
                        ? "rgba(34, 197, 94, 0.2)"
                        : "rgba(255,255,255,0.05)",
                      color: step.done
                        ? "rgb(34, 197, 94)"
                        : "rgba(255,255,255,0.2)",
                      border: `1px solid ${step.done ? "rgba(34, 197, 94, 0.3)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    {step.done ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="block h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white/80">{step.label}</span>
                    <span className="ml-2 text-xs text-white/30">{step.detail}</span>
                  </div>
                  {!step.done && i === steps.findIndex((s) => !s.done) && (
                    <div className="h-3 w-3 animate-spin rounded-full border border-white/10 border-t-cyan-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="animate-fade-in w-full max-w-md space-y-4 text-center">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
            <button
              onClick={handleReset}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Result state */}
        {result && (
          <div className="w-full space-y-6">
            <TimeSlider result={result} />
            <div className="flex justify-center gap-3">
              <button
                onClick={handleReset}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white/50 transition-all hover:bg-white/10 hover:text-white/80"
              >
                Try Another Photo
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-14 text-center">
          <div className="flex items-center justify-center gap-3 text-[10px] tracking-[0.15em] text-white/15">
            <span>GEMINI LYRIA 3</span>
            <span className="text-white/10">&middot;</span>
            <span>GPT IMAGE</span>
            <span className="text-white/10">&middot;</span>
            <span>FAL.AI</span>
          </div>
        </footer>
      </main>
    </>
  );
}
