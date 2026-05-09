import { createFalClient } from "@fal-ai/client";

const fal = createFalClient({
  credentials: process.env.FAL_KEY,
});

export async function uploadToFal(
  base64: string,
  mimeType: string
): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const blob = new Blob([buffer], { type: mimeType });
  return fal.storage.upload(blob);
}

export async function generateTransitionVideo(
  imageUrl: string,
  prompt: string
): Promise<string> {
  const result = await fal.subscribe(
    "fal-ai/kling-video/v2.1/standard/image-to-video",
    {
      input: {
        prompt,
        image_url: imageUrl,
        duration: "5" as const,
      },
    }
  );
  const data = result.data as { video?: { url?: string } };
  const url = data?.video?.url;
  if (!url) throw new Error("Video generation returned no URL");
  return url;
}

export async function generate3DModel(imageUrl: string): Promise<string> {
  const result = await fal.subscribe("fal-ai/triposr", {
    input: {
      image_url: imageUrl,
    },
  });
  const data = result.data as { model_mesh?: { url?: string } };
  const url = data?.model_mesh?.url;
  if (!url) throw new Error("3D generation returned no URL");
  return url;
}
