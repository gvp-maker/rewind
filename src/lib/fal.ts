import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateTransitionVideo(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  let operation = await ai.models.generateVideos({
    model: "veo-2.0-generate-001",
    source: {
      prompt,
      image: {
        imageBytes: imageBase64,
        mimeType,
      },
    },
    config: {
      numberOfVideos: 1,
    },
  });

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({
      operation: operation,
    });
  }

  const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) throw new Error("Video generation returned no URI");
  return uri;
}
