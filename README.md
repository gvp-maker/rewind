# REWIND

**Travel through time with any photo.** Upload an image and watch AI reimagine it across 200 years of history — from the past through the present and into the future — with generated artwork, era-specific music, narration, transition videos, and even a 3D model.

## How It Works

1. **Upload a photo** — drag and drop or click to browse (JPG, PNG, WebP)
2. **AI analyzes the scene** — Gemini Flash identifies subjects, setting, mood, and color palette
3. **Parallel generation kicks off** — multiple AI models work simultaneously to produce the experience
4. **Explore the timeline** — scrub through 200 years with a slider, play music, listen to narration, and compare eras side by side

## AI Pipeline

| Step | Model | What It Does |
|------|-------|--------------|
| Scene Analysis | **Gemini 2.5 Flash** | Analyzes the uploaded photo — identifies subjects, setting, mood, art styles, and writes music prompts |
| Era Panels | **GPT Image 1** (OpenAI) | Generates past and future versions of the photo, preserving composition while transforming art style and context |
| Music | **Lyria 3** (Google) | Composes three era-appropriate music tracks (e.g., ragtime for the past, synth for the future) |
| Narration Script | **Gemini 2.5 Flash** | Writes a short cinematic voiceover script spanning past, present, and future |
| Voice Narration | **ElevenLabs** | Converts the narration script to speech with a warm narrator voice |
| Transition Videos | **Kling Video 2.1** (fal.ai) | Creates smooth cinematic transitions between era panels |
| 3D Model | **TripoSR** (fal.ai) | Generates an interactive 3D model of the scene |
| Poetry | **Gemini 2.5 Flash** | Writes a two-line poem inspired by the scene's journey through time |

## Features

- **Timeline Slider** — smoothly crossfade between past, present, and future with interpolated year display
- **Audio Crossfade** — era-specific music blends seamlessly as you scrub the timeline
- **Journey Mode** — auto-play through the full 200-year timeline (press Space or click Journey)
- **Compare Mode** — side-by-side past vs. future with a draggable split divider
- **Narration** — AI-generated documentary-style voiceover with ElevenLabs
- **3D Viewer** — interactive 3D model of your scene (drag to rotate)
- **Poetry Overlay** — AI-generated poem displayed over the image
- **Export** — download the current timeline frame as a PNG with year and watermark
- **Keyboard Controls** — arrow keys to scrub, Shift+arrow for large jumps, Space for journey mode

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Streaming:** Server-Sent Events (SSE) for real-time progress updates

## Getting Started

### Prerequisites

You need API keys for the following services:

- [Google AI (Gemini)](https://ai.google.dev/) — scene analysis, music generation, narration scripts, poetry
- [OpenAI](https://platform.openai.com/) — image generation
- [ElevenLabs](https://elevenlabs.io/) — voice narration
- [fal.ai](https://fal.ai/) — transition videos and 3D models

### Setup

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/gvp-maker/rewind.git
cd rewind
npm install
```

2. Create a `.env.local` file with your API keys:

```
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
FAL_KEY=your_fal_api_key
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) and upload a photo.

## Architecture

```
src/
  app/
    page.tsx              # Main UI — upload, loading, result states
    api/generate/route.ts # SSE endpoint orchestrating the full AI pipeline
    layout.tsx            # Root layout with metadata and fonts
    globals.css           # Tailwind + custom animations and effects
  components/
    UploadZone.tsx        # Drag-and-drop photo upload
    TimeSlider.tsx        # Timeline viewer with crossfade, compare, and controls
  hooks/
    useAudioCrossfade.ts  # Web Audio API hook for three-track crossfading
  lib/
    gemini.ts             # Gemini Flash + Lyria 3 integration
    openai.ts             # GPT Image 1 era panel generation
    elevenlabs.ts         # ElevenLabs text-to-speech
    fal.ts                # fal.ai video generation + 3D model + storage
```

The backend streams results via SSE as each AI model completes, so the frontend shows real-time progress rather than waiting for everything to finish. Image generation and music composition run in parallel to minimize total wait time.
