import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractErrorDetails(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (/403|PERMISSION_DENIED/i.test(raw)) {
    return {
      status: 403,
      message: 'API key permission denied. Check your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (/429|RESOURCE_EXHAUSTED/i.test(raw)) {
    return {
      status: 429,
      message: 'Rate limit or quota reached for this model. Verify a billing-enabled key in Settings > Secrets.',
    };
  }
  if (/400|API_KEY_INVALID|INVALID_ARGUMENT/i.test(raw)) {
    return {
      status: 400,
      message: `Invalid request or API key: ${raw}`,
    };
  }
  return { status: 500, message: raw || 'Gemini request failed.' };
}

async function resolveAssetToInlineData(
  assetUrl: string
): Promise<{ data: string; mimeType: string } | null> {
  if (!assetUrl.startsWith('/src/assets/images/')) return null;
  const safePath = path.resolve(process.cwd(), assetUrl.slice(1));
  const allowedDir = path.resolve(process.cwd(), 'src/assets/images');
  if (!safePath.startsWith(allowedDir)) return null;
  const buf = await fs.readFile(safePath);
  const ext = path.extname(safePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  return { data: buf.toString('base64'), mimeType };
}

const DIRECTOR_SYSTEM_INSTRUCTION = `You are the Cinematography & Robotics Continuity Supervisor for "ROCKET ACADEMY: FIRST CONTACT", a 60-second (16:9, 24 fps, 1,440 frames) concept film about training autonomous robot teams across Earth, the Moon, and Mars.

Core narrative: "Every mission becomes the next lesson."
Locked robot designs:
- Scout: compact 4-wheel rover, ceramic-white body, graphite chassis, narrow amber markings, short sensor mast.
- Carrier: larger 6-wheel rover, articulated suspension, graphite chassis, white cargo enclosure, matching amber markings.

Editorial rules:
- Seven 8-second scenes (00:00-00:56) + 4-second title card (00:56-01:00).
- Earth: NASA-derived terrain -> simulated environment mesh reveal.
- Moon: hard directional light, black sky, ballistic dust, zero airborne wind or haze.
- Mars Failure (00:16) & Retry (00:48): exact same split basalt boulder beside shallow sandy rut and locked camera start; retry shows Carrier taking wider firm-ground route at reduced speed.
- Atlas (00:24): semantic search for Mars rover recoveries after wheel slip, pinned failed run beside reviewed approved recovery with synchronized traces and provenance.
- Generative AI (00:32): three match cuts (sun angle, one generated obstacle, planned route) on fixed elevated camera without terrain melting during rollouts.
- Avoid: extra wheels, floating wheels, lunar haze/wind dust, giant nearby planets, fake vendor logos, decorative hologram clutter, or fabricated performance statistics.

Keep responses concise, concrete, and directly actionable for film production and platform design.`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // 1. Low-latency check using gemini-3.1-flash-lite
  app.post('/api/gemini/fast-check', async (req: Request, res: Response) => {
    try {
      const { prompt, mode } = req.body as { prompt?: string; mode?: string };
      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Prompt text is required.' });
        return;
      }
      const ai = getAiClient();
      const started = Date.now();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt.trim(),
        config: {
          systemInstruction:
            mode === 'timing'
              ? 'You are a film voiceover pacing editor. Give a brief 2-3 sentence check on whether the line fits an 8-second warm, measured delivery with pauses.'
              : 'You are a concise robotics concept film continuity assistant. Reply in 2-4 crisp bullet points checking wheel counts (Scout=4, Carrier=6), physics contact, and lunar/Mars atmosphere rules.',
        },
      });
      const latencyMs = Date.now() - started;
      res.json({
        text: response.text ?? '',
        model: 'gemini-3.1-flash-lite',
        latencyMs,
      });
    } catch (err) {
      const { status, message } = extractErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  // 2. Multi-turn Director & Continuity Chatbot
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const {
        messages,
        model = 'gemini-4-hydrogen',
      } = req.body as {
        messages?: Array<{ role: 'user' | 'model'; text: string }>;
        model?: string;
      };
      if (!messages || messages.length === 0) {
        res.status(400).json({ error: 'At least one message is required.' });
        return;
      }
      const allowedModels = [
        'gemini-4-carbon',
        'gemini-4-argon',
        'gemini-4-hydrogen',
        'gemini-3.1-flash-lite',
      ];
      const selectedModel = allowedModels.includes(model) ? model : 'gemini-4-hydrogen';
      const ai = getAiClient();

      const history = messages.slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));
      const latest = messages[messages.length - 1];

      const chat = ai.chats.create({
        model: selectedModel,
        history,
        config: {
          systemInstruction: DIRECTOR_SYSTEM_INSTRUCTION,
        },
      });

      const response = await chat.sendMessage({ message: latest.text });
      res.json({
        text: response.text ?? '',
        model: selectedModel,
      });
    } catch (err) {
      const { status, message } = extractErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  // 3. Deep Reasoning / Platform Intelligence (gemini-4-carbon)
  app.post('/api/gemini/intelligence', async (req: Request, res: Response) => {
    try {
      const { prompt, model = 'gemini-4-carbon' } = req.body as {
        prompt?: string;
        model?: string;
      };
      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Prompt is required.' });
        return;
      }
      const ai = getAiClient();
      const selectedModel = ['gemini-4-carbon', 'gemini-4-argon', 'gemini-4-hydrogen'].includes(model)
        ? model
        : 'gemini-4-carbon';

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt.trim(),
        config: {
          systemInstruction: DIRECTOR_SYSTEM_INSTRUCTION,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      res.json({
        text: response.text ?? '',
        model: selectedModel,
      });
    } catch (err) {
      const { status, message } = extractErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  // 4. High-Quality Image Generation (gemini-3-pro-image-preview / gemini-nano-banana-2.1)
  app.post('/api/gemini/generate-image', async (req: Request, res: Response) => {
    try {
      const {
        prompt,
        aspectRatio = '16:9',
        imageSize = '2K',
        model = 'gemini-3-pro-image-preview',
        referenceAssetUrl,
        referenceBase64,
        referenceMimeType,
      } = req.body as {
        prompt?: string;
        aspectRatio?: string;
        imageSize?: string;
        model?: string;
        referenceAssetUrl?: string;
        referenceBase64?: string;
        referenceMimeType?: string;
      };

      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Image prompt is required.' });
        return;
      }

      const validRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];
      const validSizes = ['1K', '2K', '4K'];
      const safeRatio = validRatios.includes(aspectRatio) ? aspectRatio : '16:9';
      const safeSize = validSizes.includes(imageSize) ? imageSize : '2K';
      const safeModel = ['gemini-3-pro-image-preview', 'gemini-nano-banana-2.1'].includes(model)
        ? model
        : 'gemini-3-pro-image-preview';

      const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

      if (referenceBase64 && referenceMimeType) {
        parts.push({
          inlineData: { data: referenceBase64, mimeType: referenceMimeType },
        });
      } else if (referenceAssetUrl) {
        const assetData = await resolveAssetToInlineData(referenceAssetUrl);
        if (assetData) {
          parts.push({ inlineData: assetData });
        }
      }

      parts.push({
        text: `${prompt.trim()} Maintain exact robot continuity: Scout has 4 wheels, ceramic-white body, graphite chassis, narrow amber markings, short sensor mast; Carrier has 6 wheels, articulated suspension, white cargo enclosure, matching amber markings. No text overlays.`,
      });

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: safeModel,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: safeRatio,
            imageSize: safeSize,
          },
        },
      });

      let imageUrl: string | null = null;
      let notes = '';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          notes += part.text;
        }
      }

      if (!imageUrl) {
        res.status(502).json({ error: 'Model completed without returning an image part.' });
        return;
      }

      res.json({
        imageUrl,
        notes: notes.trim(),
        model: safeModel,
        aspectRatio: safeRatio,
        imageSize: safeSize,
      });
    } catch (err) {
      const { status, message } = extractErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  // 5. Image Understanding & Continuity Audit (gemini-4-argon)
  app.post('/api/gemini/analyze-image', async (req: Request, res: Response) => {
    try {
      const {
        imageBase64,
        mimeType = 'image/jpeg',
        assetUrl,
        question,
      } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        assetUrl?: string;
        question?: string;
      };

      let inline: { data: string; mimeType: string } | null = null;
      if (imageBase64) {
        inline = { data: imageBase64, mimeType };
      } else if (assetUrl) {
        inline = await resolveAssetToInlineData(assetUrl);
      }

      if (!inline) {
        res.status(400).json({ error: 'Provide an uploaded image or select a storyboard frame.' });
        return;
      }

      const ai = getAiClient();
      const auditPrompt =
        question?.trim() ||
        'Audit this frame for Rocket Academy: First Contact continuity: verify Scout wheel count (4), Carrier wheel count (6), ceramic-white/graphite/amber color discipline, wheel-to-ground contact, and environment atmosphere accuracy (Earth natural depth, Moon hard light/black sky with zero haze, Mars muted ochre).';

      const response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: {
          parts: [
            { inlineData: inline },
            { text: auditPrompt },
          ],
        },
        config: {
          systemInstruction: DIRECTOR_SYSTEM_INSTRUCTION,
        },
      });

      res.json({
        analysis: response.text ?? '',
        model: 'gemini-4-argon',
      });
    } catch (err) {
      const { status, message } = extractErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  // 6. Video Generation & Image-to-Video Animation (gemini-omni-1.2-flash via Interactions API)
  app.post('/api/gemini/generate-video', async (req: Request, res: Response) => {
    try {
      const {
        prompt,
        aspectRatio = '16:9',
        duration = '6s',
        imageBase64,
        imageMimeType = 'image/jpeg',
        assetUrl,
      } = req.body as {
        prompt?: string;
        aspectRatio?: string;
        duration?: string;
        imageBase64?: string;
        imageMimeType?: string;
        assetUrl?: string;
      };

      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Video motion prompt is required.' });
        return;
      }

      const safeRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
      const allowedDurations = ['4s', '5s', '6s', '8s', '10s'];
      const safeDuration = allowedDurations.includes(duration) ? duration : '6s';

      let startFrame: { data: string; mimeType: string } | null = null;
      if (imageBase64) {
        startFrame = { data: imageBase64, mimeType: imageMimeType };
      } else if (assetUrl) {
        startFrame = await resolveAssetToInlineData(assetUrl);
      }

      const ai = getAiClient();
      const input = startFrame
        ? [
            {
              type: 'image' as const,
              mime_type: startFrame.mimeType,
              data: startFrame.data,
            },
            {
              type: 'text' as const,
              text: `${prompt.trim()} Keep wheel counts, robot geometry, and ground contact stable throughout motion.`,
            },
          ]
        : `${prompt.trim()} Photorealistic near-future robotics cinematography, 24fps film cadence, stable robot geometry, no text overlays.`;

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: safeRatio,
            duration: safeDuration,
            resolution: '720p',
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (!videoPart) {
        res.status(502).json({ error: 'Video interaction completed without a video output.' });
        return;
      }

      if (videoPart.data) {
        const mime = videoPart.mime_type || 'video/mp4';
        res.json({
          videoUrl: `data:${mime};base64,${videoPart.data}`,
          model: 'gemini-omni-1.2-flash',
          aspectRatio: safeRatio,
          duration: safeDuration,
        });
        return;
      }

      if (videoPart.uri) {
        res.json({
          videoUrl: videoPart.uri,
          model: 'gemini-omni-1.2-flash',
          aspectRatio: safeRatio,
          duration: safeDuration,
        });
        return;
      }

      res.status(502).json({ error: 'Video output contained neither inline data nor URI.' });
    } catch (err) {
      const { status, message } = extractErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  // 7. Video Content Analysis (gemini-4-argon)
  app.post('/api/gemini/analyze-video', async (req: Request, res: Response) => {
    let tempFilePath: string | null = null;
    try {
      const {
        videoBase64,
        mimeType = 'video/mp4',
        prompt,
      } = req.body as {
        videoBase64?: string;
        mimeType?: string;
        prompt?: string;
      };

      if (!videoBase64) {
        res.status(400).json({ error: 'Uploaded video payload is required.' });
        return;
      }

      const ai = getAiClient();
      const analysisPrompt =
        prompt?.trim() ||
        'Analyze this robotics concept film clip for Rocket Academy: First Contact. Report key motion events, camera movement, Scout (4-wheel) and Carrier (6-wheel) continuity, wheel-to-terrain contact, and any physics or atmosphere issues.';

      // Use inlineData for <= 10MB raw bytes, otherwise Files API upload
      const rawBuffer = Buffer.from(videoBase64, 'base64');
      let response;
      if (rawBuffer.byteLength <= 10 * 1024 * 1024) {
        response = await ai.models.generateContent({
          model: 'gemini-4-argon',
          contents: {
            parts: [
              { inlineData: { mimeType, data: videoBase64 } },
              { text: analysisPrompt },
            ],
          },
          config: {
            systemInstruction: DIRECTOR_SYSTEM_INSTRUCTION,
          },
        });
      } else {
        tempFilePath = path.join(os.tmpdir(), `ra-clip-${Date.now()}.mp4`);
        await fs.writeFile(tempFilePath, rawBuffer);
        let uploaded = await ai.files.upload({
          file: tempFilePath,
          config: { mimeType },
        });
        while (uploaded.state === 'PROCESSING') {
          await new Promise((r) => setTimeout(r, 4000));
          uploaded = await ai.files.get({ name: uploaded.name || '' });
        }
        if (uploaded.state === 'FAILED') {
          throw new Error('Video processing in Gemini Files API failed.');
        }
        response = await ai.models.generateContent({
          model: 'gemini-4-argon',
          contents: {
            parts: [
              { fileData: { fileUri: uploaded.uri, mimeType } },
              { text: analysisPrompt },
            ],
          },
          config: {
            systemInstruction: DIRECTOR_SYSTEM_INSTRUCTION,
          },
        });
      }

      res.json({
        analysis: response.text ?? '',
        model: 'gemini-4-argon',
      });
    } catch (err) {
      const { status, message } = extractErrorDetails(err);
      res.status(status).json({ error: message });
    } finally {
      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(() => undefined);
      }
    }
  });

  // 8. Audio Transcription (gemini-3.5-transcribe)
  app.post('/api/gemini/transcribe', async (req: Request, res: Response) => {
    try {
      const {
        audioBase64,
        mimeType = 'audio/webm',
        prompt,
      } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        prompt?: string;
      };

      if (!audioBase64) {
        res.status(400).json({ error: 'Audio recording or uploaded file is required.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            { text: prompt?.trim() || 'Transcribe this narration audio verbatim with natural punctuation.' },
          ],
        },
      });

      res.json({
        transcript: (response.text ?? '').trim(),
        model: 'gemini-3.5-transcribe',
      });
    } catch (err) {
      const { status, message } = extractErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  // 9. Google Search Grounding (gemini-4-hydrogen + googleSearch)
  app.post('/api/gemini/grounding/search', async (req: Request, res: Response) => {
    try {
      const { query } = req.body as { query?: string };
      if (!query || !query.trim()) {
        res.status(400).json({ error: 'Search query is required.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: query.trim(),
        config: {
          systemInstruction:
            'You are a planetary terrain data researcher supporting Rocket Academy: First Contact. Cite authoritative NASA, USGS, LRO LOLA, MRO HiRISE, and robotics simulation datasets clearly.',
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = chunks
        .filter((c) => c.web?.uri)
        .map((c) => ({
          title: c.web?.title || c.web?.uri || 'Web Source',
          uri: c.web?.uri || '',
        }));

      res.json({
        text: response.text ?? '',
        sources,
        model: 'gemini-4-hydrogen',
      });
    } catch (err) {
      const { status, message } = extractErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  // 10. Google Maps Grounding (gemini-4-hydrogen + googleMaps)
  app.post('/api/gemini/grounding/maps', async (req: Request, res: Response) => {
    try {
      const { query, latLng } = req.body as {
        query?: string;
        latLng?: { latitude: number; longitude: number };
      };
      if (!query || !query.trim()) {
        res.status(400).json({ error: 'Location query is required.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: query.trim(),
        config: {
          tools: [{ googleMaps: {} }],
          ...(latLng
            ? {
                toolConfig: {
                  retrievalConfig: {
                    latLng: {
                      latitude: latLng.latitude,
                      longitude: latLng.longitude,
                    },
                  },
                },
              }
            : {}),
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const places = chunks
        .filter((c) => c.maps?.uri)
        .map((c) => ({
          title: c.maps?.title || 'Map Location',
          uri: c.maps?.uri || '',
          reviewSnippets: c.maps?.placeAnswerSources?.reviewSnippets ?? [],
        }));

      res.json({
        text: response.text ?? '',
        places,
        model: 'gemini-4-hydrogen',
      });
    } catch (err) {
      const { status, message } = extractErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  // 11. AI-Assisted Mission Planner (gemini-4-hydrogen structured JSON)
  app.post('/api/gemini/plan-mission', async (req: Request, res: Response) => {
    try {
      const {
        goal,
        destinationName,
        worldSummary,
        start,
        beacon,
        sampleSites,
        hazards,
        previousOutcomeSummary,
      } = req.body as {
        goal?: string;
        destinationName?: string;
        worldSummary?: string;
        start?: { x: number; y: number };
        beacon?: { x: number; y: number };
        sampleSites?: Array<{ id: string; label: string; x: number; y: number }>;
        hazards?: Array<{ id: string; label: string; kind: string; x: number; y: number; radius: number }>;
        previousOutcomeSummary?: string;
      };

      if (!goal || !goal.trim()) {
        res.status(400).json({ error: 'Describe a mission goal to generate rover commands.' });
        return;
      }

      const ai = getAiClient();
      const contextPrompt = [
        `Destination: ${destinationName || 'Mars'} — ${worldSummary || ''}`,
        `Coordinate Space: X from 0 to 1000, Y from 0 to 560.`,
        start ? `Start Pad: (${start.x}, ${start.y})` : '',
        beacon ? `Extraction Beacon: (${beacon.x}, ${beacon.y})` : '',
        sampleSites?.length
          ? `Science Targets: ${sampleSites.map((s) => `${s.label} at (${s.x}, ${s.y})`).join('; ')}`
          : '',
        hazards?.length
          ? `Known Hazards (avoid centers by hazard radius + 28px margin, or use CAUTIOUS speed + RELAY): ${hazards
              .map((h) => `${h.label} [${h.kind}] center (${h.x}, ${h.y}) radius ${h.radius}`)
              .join('; ')}`
          : '',
        previousOutcomeSummary ? `Previous Run Lesson: ${previousOutcomeSummary}` : '',
        `Mission Designer Goal: "${goal.trim()}"`,
        `Produce 4 to 8 structured rover commands that achieve the goal safely and end near the Extraction Beacon.`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: contextPrompt,
        config: {
          systemInstruction:
            'You are an autonomous robotics mission planner for Rocket Academy: First Contact. Translate mission designer goals into clean, safe, deterministic rover commands in a 1000x560 terrain coordinate system. Always route around boulder hazards (never through hazard centers), use CAUTIOUS speed or RELAY before crossing sandy/loose regolith, include SCAN or SAMPLE near targets when requested, and conclude with a DRIVE step to the Extraction Beacon.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              planTitle: {
                type: Type.STRING,
                description: 'Short 3-6 word mission plan title.',
              },
              rationale: {
                type: Type.STRING,
                description: '1-2 sentence explanation of how the route and speeds address terrain hazards.',
              },
              commands: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    action: {
                      type: Type.STRING,
                      description: 'Must be one of: DRIVE, SCAN, SAMPLE, RELAY',
                    },
                    x: {
                      type: Type.INTEGER,
                      description: 'Target X coordinate between 40 and 960 (used for DRIVE, ignored/held for in-place actions).',
                    },
                    y: {
                      type: Type.INTEGER,
                      description: 'Target Y coordinate between 40 and 520 (used for DRIVE, ignored/held for in-place actions).',
                    },
                    speed: {
                      type: Type.STRING,
                      description: 'Must be one of: CAUTIOUS, NOMINAL, FAST',
                    },
                    unit: {
                      type: Type.STRING,
                      description: 'Must be one of: SCOUT, CARRIER, TEAM',
                    },
                    note: {
                      type: Type.STRING,
                      description: 'Concise 4-8 word label for this step.',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        planTitle?: string;
        rationale?: string;
        commands?: Array<{
          action?: string;
          x?: number;
          y?: number;
          speed?: string;
          unit?: string;
          note?: string;
        }>;
      };

      res.json({
        planTitle: parsed.planTitle || 'AI-Assisted Mission Plan',
        rationale: parsed.rationale || 'Structured route generated from mission goal.',
        commands: Array.isArray(parsed.commands) ? parsed.commands : [],
        model: 'gemini-4-hydrogen',
      });
    } catch (err) {
      const { status, message } = extractErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const assetsImagesDir = path.resolve(process.cwd(), 'src/assets/images');
    app.use('/src/assets/images', express.static(assetsImagesDir));
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rocket Academy server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
