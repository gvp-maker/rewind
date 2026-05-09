import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface SceneAnalysis {
  scene: string;
  subjects: string;
  setting: string;
  mood: string;
  colors: string;
  era_guess: string;
  music_past: string;
  music_present: string;
  music_future: string;
  past_art_style: string;
  future_art_style: string;
}

export async function analyzeScene(
  imageBase64: string,
  mimeType: string
): Promise<SceneAnalysis> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          },
          {
            text: `Analyze this photo and return JSON with these exact fields:
{
  "scene": "one-sentence description of the scene",
  "subjects": "people/objects/animals in the photo",
  "setting": "location type (urban, rural, indoor, beach, etc.)",
  "mood": "emotional tone of the image",
  "colors": "dominant color palette",
  "era_guess": "estimated decade/era the photo is from",
  "music_past": "A 30-second music prompt for ~100 years ago version of this scene. Include genre (ragtime/jazz/classical), instruments, tempo, mood. Be vivid and specific about era-appropriate style.",
  "music_present": "A 30-second music prompt for a modern version of this scene. Include genre (indie/pop/electronic/ambient), instruments, tempo, mood.",
  "music_future": "A 30-second music prompt for ~100 years in the future version of this scene. Include genre (ambient/synthwave/ethereal/cosmic), instruments, tempo, mood.",
  "past_art_style": "art movement for the past panel (e.g., impressionist, art nouveau, vintage sepia photography, ukiyo-e)",
  "future_art_style": "art movement for the future panel (e.g., cyberpunk, solarpunk, ethereal digital art, biopunk)"
}
Return ONLY valid JSON, no markdown fences.`,
          },
        ],
      },
    ],
    config: {
      temperature: 0.9,
    },
  });

  const text = response.text ?? "";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

export async function generateMusic(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "lyria-3-clip-preview",
    contents: prompt,
    config: {
      responseModalities: [Modality.AUDIO],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return part.inlineData.data;
    }
  }
  throw new Error("Lyria returned no audio data");
}

export async function generateNarrationScript(
  scene: SceneAnalysis
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a documentary narrator. Write a short, evocative narration (3-4 sentences, under 40 words) for a time-travel experience across 200 years.

Scene: ${scene.scene}
Setting: ${scene.setting}
Mood: ${scene.mood}
Past art style (${currentYear - 100}): ${scene.past_art_style}
Future art style (${currentYear + 100}): ${scene.future_art_style}

The narration should:
- Start with the past, transition through present, end with the future
- Be poetic but concise
- Feel like a cinematic voiceover
- NOT mention specific years, just "a century ago", "today", "a century from now"

Return ONLY the narration text, no quotes or formatting.`,
          },
        ],
      },
    ],
    config: {
      temperature: 0.8,
    },
  });

  return (response.text ?? "").trim();
}

export async function generatePoem(scene: SceneAnalysis): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Write exactly 2 lines of evocative poetry inspired by this scene's journey through time.

Scene: ${scene.scene}
Setting: ${scene.setting}
Mood: ${scene.mood}
Past era: ${scene.past_art_style}
Future era: ${scene.future_art_style}

Rules:
- Exactly 2 lines, separated by a newline
- Evoke the passage of time — past through future
- Be vivid, sensory, and concise
- No titles, no attribution, no quotes
- Under 20 words total

Return ONLY the two lines of poetry.`,
          },
        ],
      },
    ],
    config: {
      temperature: 1.0,
    },
  });

  return (response.text ?? "").trim();
}
