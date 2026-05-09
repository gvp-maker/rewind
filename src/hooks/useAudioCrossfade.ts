"use client";

import { useRef, useCallback } from "react";

interface EraWeights {
  past: number;
  present: number;
  future: number;
}

export function useAudioCrossfade() {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainsRef = useRef<GainNode[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startedRef = useRef(false);

  const init = useCallback(
    async (musicUrls: { past: string | null; present: string | null; future: string | null }) => {
      if (startedRef.current) return;

      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const urls = [musicUrls.past, musicUrls.present, musicUrls.future];

      const buffers = await Promise.all(
        urls.map(async (url) => {
          if (!url) return null;
          try {
            const resp = await fetch(url);
            const arr = await resp.arrayBuffer();
            return await ctx.decodeAudioData(arr);
          } catch {
            return null;
          }
        })
      );

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.8;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      masterGain.connect(analyser);
      analyser.connect(ctx.destination);

      buffers.forEach((buffer, i) => {
        const gain = ctx.createGain();
        gain.gain.value = i === 1 ? 1 : 0;
        gain.connect(masterGain);
        gainsRef.current[i] = gain;

        if (buffer) {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(gain);
          source.start(0);
        }
      });

      startedRef.current = true;
    },
    []
  );

  const setCrossfade = useCallback((weights: EraWeights) => {
    const ctx = ctxRef.current;
    if (!ctx || !startedRef.current) return;
    const now = ctx.currentTime;
    gainsRef.current[0]?.gain.linearRampToValueAtTime(weights.past, now + 0.1);
    gainsRef.current[1]?.gain.linearRampToValueAtTime(weights.present, now + 0.1);
    gainsRef.current[2]?.gain.linearRampToValueAtTime(weights.future, now + 0.1);
  }, []);

  const getFrequencyData = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return null;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data;
  }, []);

  const isStarted = useCallback(() => startedRef.current, []);

  return { init, setCrossfade, isStarted, getFrequencyData };
}
