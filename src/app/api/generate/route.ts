import { analyzeScene, generateMusic, generateNarrationScript, generatePoem } from "@/lib/gemini";
import {
  generateTransitionVideo,
  generate3DModel,
  uploadToFal,
} from "@/lib/fal";
import { generateEraPanel } from "@/lib/openai";
import { generateNarration } from "@/lib/elevenlabs";

export const maxDuration = 300;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("photo") as File | null;
  if (!file) {
    return Response.json({ error: "No photo provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/jpeg";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        // Step 1: Scene analysis
        send("status", { step: "Gemini is analyzing your photo..." });
        const scene = await analyzeScene(base64, mimeType);
        send("scene", scene);

        // Step 2: Parallel generation — images + music
        send("status", { step: "Generating era panels & composing music..." });

        const results = await Promise.allSettled([
          generateEraPanel(scene, "past", base64, mimeType),
          generateEraPanel(scene, "future", base64, mimeType),
          generateMusic(scene.music_past),
          generateMusic(scene.music_present),
          generateMusic(scene.music_future),
        ]);

        const pastImage = results[0].status === "fulfilled" ? results[0].value : null;
        const futureImage = results[1].status === "fulfilled" ? results[1].value : null;
        const pastMusic = results[2].status === "fulfilled" ? results[2].value : null;
        const presentMusic = results[3].status === "fulfilled" ? results[3].value : null;
        const futureMusic = results[4].status === "fulfilled" ? results[4].value : null;

        if (!pastImage || !futureImage) {
          send("error", { message: "Image generation failed" });
          controller.close();
          return;
        }

        // Step 3: Narration + poem (Gemini — no fal dependency)
        send("status", { step: "Creating narration & finishing touches..." });

        const [narrationScript, poem] = await Promise.all([
          generateNarrationScript(scene).catch(() => null),
          generatePoem(scene).catch(() => null),
        ]);

        const narrationAudio = narrationScript
          ? await generateNarration(narrationScript).catch(() => null)
          : null;

        // Step 4: fal-dependent features (videos + 3D) — fully optional
        let pastToPresent: string | null = null;
        let presentToFuture: string | null = null;
        let model3d: string | null = null;

        try {
          send("status", { step: "Generating transition videos..." });
          const [pastImageUrl, originalImageUrl] = await Promise.all([
            uploadToFal(pastImage, "image/png"),
            uploadToFal(base64, mimeType),
          ]);

          const videoResults = await Promise.allSettled([
            generateTransitionVideo(
              pastImageUrl,
              `Smooth time-lapse transition from ${scene.past_art_style} era to modern day. ${scene.scene}. Colors shift from warm sepia to vibrant modern tones. Cinematic camera movement.`
            ),
            generateTransitionVideo(
              originalImageUrl,
              `Smooth futuristic transition from modern day to ${scene.future_art_style}. ${scene.scene}. Colors shift from natural to neon and ethereal. Cinematic transformation.`
            ),
            generate3DModel(originalImageUrl),
          ]);

          pastToPresent = videoResults[0].status === "fulfilled" ? videoResults[0].value : null;
          presentToFuture = videoResults[1].status === "fulfilled" ? videoResults[1].value : null;
          model3d = videoResults[2].status === "fulfilled" ? videoResults[2].value : null;
        } catch {
          // fal unavailable — skip videos and 3D, core experience still works
        }

        send("status", { step: "All done! Assembling your timeline..." });

        send("result", {
          scene,
          panels: {
            past: `data:image/png;base64,${pastImage}`,
            present: `data:${mimeType};base64,${base64}`,
            future: `data:image/png;base64,${futureImage}`,
          },
          music: {
            past: pastMusic ? `data:audio/wav;base64,${pastMusic}` : null,
            present: presentMusic ? `data:audio/wav;base64,${presentMusic}` : null,
            future: futureMusic ? `data:audio/wav;base64,${futureMusic}` : null,
          },
          videos: {
            pastToPresent,
            presentToFuture,
          },
          model3d,
          narration: narrationAudio ? `data:audio/mpeg;base64,${narrationAudio}` : null,
          narrationScript,
          poem,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Generation failed";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
