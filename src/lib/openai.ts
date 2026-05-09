import OpenAI, { toFile } from "openai";
import type { SceneAnalysis } from "./gemini";

const openai = new OpenAI();

export async function generateEraPanel(
  scene: SceneAnalysis,
  era: "past" | "future",
  originalImageBase64: string,
  originalMimeType: string
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearLabel =
    era === "past" ? `${currentYear - 100}` : `${currentYear + 100}`;

  const pastPrompt = `Transform this photo into a ${scene.past_art_style} style artwork, as if captured around the year ${yearLabel}.

Keep the same composition, subjects, and spatial layout. Change the art style, clothing, surroundings, and atmosphere to match the era.

IMPORTANT TEXT ELEMENTS TO RENDER LEGIBLY:
- A newspaper headline or street sign reading "DAILY GAZETTE - ${yearLabel}" in period-appropriate typography
- A small date stamp "${yearLabel}" in the corner, styled like a vintage photograph marking

Style: Warm sepia and muted tones. Visible brush strokes or film grain.
${scene.subjects} reimagined in period-appropriate clothing and context.
Art movement: ${scene.past_art_style}. Nostalgic, dreamlike quality.`;

  const futurePrompt = `Transform this photo into a ${scene.future_art_style} style artwork, as if captured around the year ${yearLabel}.

Keep the same composition, subjects, and spatial layout. Change the art style, surroundings, and atmosphere to match a speculative future.

IMPORTANT TEXT ELEMENTS TO RENDER LEGIBLY:
- A holographic display or digital sign reading "YEAR ${yearLabel}" in futuristic typography
- Floating text elements showing a short news headline in a sci-fi font

Style: Cool blues, neon accents, ethereal lighting.
${scene.subjects} reimagined in a speculative future context.
Art movement: ${scene.future_art_style}. Hopeful, otherworldly quality.`;

  const ext = originalMimeType.includes("png") ? "png" : originalMimeType.includes("webp") ? "webp" : "jpg";
  const imageFile = await toFile(
    Buffer.from(originalImageBase64, "base64"),
    `original.${ext}`,
    { type: originalMimeType },
  );

  const result = await openai.images.edit({
    model: "gpt-image-1",
    image: imageFile,
    prompt: era === "past" ? pastPrompt : futurePrompt,
    size: "1536x1024",
    quality: "medium",
    input_fidelity: "high",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`Image generation failed for ${era} era`);
  return b64;
}
