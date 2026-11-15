import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Film,
  Image as ImageIcon,
  ScanEye,
  Upload,
  Video,
} from 'lucide-react';
import {
  FILM_SCENES,
  FilmScene,
  GENERATED_ASSETS,
} from '../data/storyboard';
import {
  ALLOWED_ASPECT_RATIOS,
  ALLOWED_IMAGE_SIZES,
  ALLOWED_VIDEO_ASPECT_RATIOS,
  AllowedAspectRatio,
  AllowedImageSize,
  AllowedVideoAspectRatio,
  auditAvoidRules,
} from '../utils/filmTimeline';
import { SafeImage } from './SafeImage';

type StudioMode = 'image' | 'video' | 'analyze';

interface MediaStudioProps {
  initialScene?: FilmScene | null;
}

const REFERENCE_PRESETS = [
  { id: 'none', label: 'No Reference Image', url: '' },
  { id: 'continuity', label: 'Locked Rover Continuity Sheet', url: GENERATED_ASSETS.continuitySheet },
  { id: 'mars', label: 'Locked Mars Boulder & Rut Site', url: GENERATED_ASSETS.marsBoulder },
  { id: 'earth', label: 'Earth Desert Valley Frame', url: GENERATED_ASSETS.earth },
  { id: 'moon', label: 'Lunar Ridge Frame', url: GENERATED_ASSETS.moon },
];

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      const commaIdx = res.indexOf(',');
      const base64 = commaIdx >= 0 ? res.slice(commaIdx + 1) : res;
      resolve({ base64, mimeType: file.type || 'application/octet-stream' });
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

export const MediaStudio: React.FC<MediaStudioProps> = ({ initialScene }) => {
  const [mode, setMode] = useState<StudioMode>('image');

  // Image generation state
  const [imageModel, setImageModel] = useState<'gemini-3-pro-image' | 'gemini-nano-banana-2.1'>('gemini-3-pro-image');
  const [aspectRatio, setAspectRatio] = useState<AllowedAspectRatio>('16:9');
  const [imageSize, setImageSize] = useState<AllowedImageSize>('2K');
  const [imagePrompt, setImagePrompt] = useState<string>(
    initialScene?.generationPrompt || FILM_SCENES[0].generationPrompt
  );
  const [refPreset, setRefPreset] = useState<string>('continuity');
  const [uploadedRef, setUploadedRef] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<
    Array<{ url: string; ratio: string; size: string; model: string; prompt: string }>
  >([]);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  // Video generation state
  const [videoMode, setVideoMode] = useState<'text' | 'animate'>('animate');
  const [videoRatio, setVideoRatio] = useState<AllowedVideoAspectRatio>('16:9');
  const [videoDuration, setVideoDuration] = useState<'4s' | '6s' | '8s'>('6s');
  const [videoPrompt, setVideoPrompt] = useState<string>(
    'Track low beside the six-wheel Carrier rover as it slows smoothly and steers onto the firmer rocky shoulder around the split basalt boulder while the four-wheel Scout leads ahead.'
  );
  const [videoAssetUrl, setVideoAssetUrl] = useState<string>(GENERATED_ASSETS.marsBoulder);
  const [videoUploadedFrame, setVideoUploadedFrame] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
    name: string;
  } | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<{
    url: string;
    ratio: string;
    duration: string;
  } | null>(null);
  const [vidLoading, setVidLoading] = useState(false);
  const [vidError, setVidError] = useState<string | null>(null);

  // Image & Video analysis state
  const [analyzeKind, setAnalyzeKind] = useState<'image' | 'video'>('image');
  const [analyzeAssetUrl, setAnalyzeAssetUrl] = useState<string>(GENERATED_ASSETS.continuitySheet);
  const [analyzeUploaded, setAnalyzeUploaded] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
    name: string;
  } | null>(null);
  const [analyzeQuestion, setAnalyzeQuestion] = useState<string>(
    'Verify Scout (4 wheels) and Carrier (6 wheels) design continuity, ground contact, and adherence to the Rocket Academy visual direction.'
  );
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    if (initialScene) {
      setImagePrompt(initialScene.generationPrompt);
      if (initialScene.imagePath) {
        setVideoAssetUrl(initialScene.imagePath);
        setAnalyzeAssetUrl(initialScene.imagePath);
      }
    }
  }, [initialScene]);

  const avoidFindings = auditAvoidRules(mode === 'video' ? videoPrompt : imagePrompt);

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setImgError(null);
    if (!imagePrompt.trim()) {
      setImgError('Enter a scene prompt before generating an image.');
      return;
    }
    setImgLoading(true);
    try {
      const selectedPreset = REFERENCE_PRESETS.find((r) => r.id === refPreset);
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio,
          imageSize,
          model: imageModel,
          referenceAssetUrl: !uploadedRef && selectedPreset?.url ? selectedPreset.url : undefined,
          referenceBase64: uploadedRef?.base64,
          referenceMimeType: uploadedRef?.mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Image generation failed.');
      }
      setGeneratedImages((prev) => [
        {
          url: data.imageUrl,
          ratio: data.aspectRatio,
          size: data.imageSize,
          model: data.model,
          prompt: imagePrompt,
        },
        ...prev,
      ]);
    } catch (err) {
      setImgError(err instanceof Error ? err.message : 'Image generation failed.');
    } finally {
      setImgLoading(false);
    }
  };

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setVidError(null);
    if (!videoPrompt.trim()) {
      setVidError('Enter a motion prompt before generating video.');
      return;
    }
    setVidLoading(true);
    try {
      const payload: Record<string, unknown> = {
        prompt: videoPrompt,
        aspectRatio: videoRatio,
        duration: videoDuration,
      };
      if (videoMode === 'animate') {
        if (videoUploadedFrame) {
          payload.imageBase64 = videoUploadedFrame.base64;
          payload.imageMimeType = videoUploadedFrame.mimeType;
        } else if (videoAssetUrl) {
          payload.assetUrl = videoAssetUrl;
        }
      }
      const res = await fetch('/api/gemini/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Video generation failed.');
      }
      setGeneratedVideo({
        url: data.videoUrl,
        ratio: data.aspectRatio,
        duration: data.duration,
      });
    } catch (err) {
      setVidError(err instanceof Error ? err.message : 'Video generation failed.');
    } finally {
      setVidLoading(false);
    }
  };

  const handleAnalyzeMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzeError(null);
    setAnalyzeLoading(true);
    try {
      if (analyzeKind === 'image') {
        const res = await fetch('/api/gemini/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: analyzeUploaded?.base64,
            mimeType: analyzeUploaded?.mimeType,
            assetUrl: analyzeUploaded ? undefined : analyzeAssetUrl,
            question: analyzeQuestion,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Image analysis failed.');
        setAnalysisResult(data.analysis);
      } else {
        let videoBase64 = analyzeUploaded?.base64;
        let mimeType = analyzeUploaded?.mimeType || 'video/mp4';
        if (!videoBase64 && generatedVideo?.url.startsWith('data:')) {
          const [header, b64] = generatedVideo.url.split(',');
          const m = header.match(/data:(.*?);base64/);
          if (m) mimeType = m[1];
          videoBase64 = b64;
        }
        if (!videoBase64) {
          throw new Error('Upload a video clip (or generate one in Video Studio first) to analyze.');
        }
        const res = await fetch('/api/gemini/analyze-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoBase64,
            mimeType,
            prompt: analyzeQuestion,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Video analysis failed.');
        setAnalysisResult(data.analysis);
      }
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setAnalyzeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-100">
            Scene & Continuity Studio
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Generate resolution-controlled reference frames, animate shots into video, and audit robot continuity.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0B0F17] p-1" role="tablist" aria-label="Studio tools">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'image'}
            onClick={() => setMode('image')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              mode === 'image' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Image Studio
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'video'}
            onClick={() => setMode('video')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              mode === 'video' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Video className="h-3.5 w-3.5" aria-hidden="true" />
            Video & Animate
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'analyze'}
            onClick={() => setMode('analyze')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              mode === 'analyze' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <ScanEye className="h-3.5 w-3.5" aria-hidden="true" />
            Continuity Audit
          </button>
        </div>
      </div>

      {avoidFindings.length > 0 && mode !== 'analyze' && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold">Brief AVOID Rule Flagged</p>
            {avoidFindings.map((f) => (
              <p key={f.matchedTerm}>
                Matched “{f.matchedTerm}” — {f.rule}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* MODE 1: HIGH-QUALITY IMAGE GENERATION + ASPECT RATIO CONTROL */}
      {mode === 'image' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleGenerateImage}
            className="space-y-5 rounded-lg border border-slate-800 bg-[#0B0F17] p-5 lg:col-span-5"
          >
            <div className="space-y-2">
              <label htmlFor="scene-preset-select" className="block text-xs font-medium text-slate-300">
                Load Storyboard Scene Prompt
              </label>
              <select
                id="scene-preset-select"
                onChange={(e) => {
                  const found = FILM_SCENES.find((s) => s.id === e.target.value);
                  if (found) setImagePrompt(found.generationPrompt);
                }}
                defaultValue=""
                className="w-full rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="" disabled>
                  Choose a scene preset...
                </option>
                {FILM_SCENES.filter((s) => s.kind !== 'title').map((s) => (
                  <option key={s.id} value={s.id}>
                    Scene {s.index}: {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="image-prompt" className="block text-xs font-medium text-slate-300">
                Shot Generation Prompt
              </label>
              <textarea
                id="image-prompt"
                rows={4}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-[#07090E] p-3 text-xs leading-relaxed text-slate-100 focus:border-cyan-400 focus:outline-none"
                placeholder="Describe terrain, Scout (4W) and Carrier (6W) positions, lighting, and camera angle..."
              />
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-300">
                Generation Model
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setImageModel('gemini-3-pro-image')}
                  className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                    imageModel === 'gemini-3-pro-image'
                      ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                      : 'border-slate-800 bg-[#07090E] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Studio Quality (Pro)
                </button>
                <button
                  type="button"
                  onClick={() => setImageModel('gemini-nano-banana-2.1')}
                  className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                    imageModel === 'gemini-nano-banana-2.1'
                      ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                      : 'border-slate-800 bg-[#07090E] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Nano Banana 2.1
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-300">
                Aspect Ratio
              </span>
              <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Image aspect ratio">
                {ALLOWED_ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`rounded border px-2 py-1.5 font-mono text-xs tabular-nums transition-colors ${
                      aspectRatio === ratio
                        ? 'border-cyan-400 bg-cyan-500 text-slate-950 font-semibold'
                        : 'border-slate-800 bg-[#07090E] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-300">
                Resolution Size
              </span>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Image resolution size">
                {ALLOWED_IMAGE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setImageSize(size)}
                    className={`rounded border px-3 py-1.5 font-mono text-xs tabular-nums transition-colors ${
                      imageSize === size
                        ? 'border-cyan-400 bg-cyan-500 text-slate-950 font-semibold'
                        : 'border-slate-800 bg-[#07090E] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="ref-preset" className="block text-xs font-medium text-slate-300">
                Continuity Reference Lock
              </label>
              <select
                id="ref-preset"
                value={refPreset}
                onChange={(e) => {
                  setRefPreset(e.target.value);
                  setUploadedRef(null);
                }}
                className="w-full rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                {REFERENCE_PRESETS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>

              <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-300 hover:border-cyan-500/60">
                <Upload className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                <span>{uploadedRef ? `Custom: ${uploadedRef.name}` : 'Or upload custom reference image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const { base64, mimeType } = await fileToBase64(file);
                    setUploadedRef({ base64, mimeType, name: file.name });
                  }}
                />
              </label>
            </div>

            {imgError && (
              <p role="alert" className="rounded border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                {imgError}
              </p>
            )}

            <button
              type="submit"
              disabled={imgLoading}
              className="w-full rounded-md bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {imgLoading ? `Generating ${imageSize} (${aspectRatio})...` : `Generate ${imageSize} Frame (${aspectRatio})`}
            </button>
          </form>

          <div className="space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-5 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Generated Storyboard Frames
              </h2>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {generatedImages.length} rendered
              </span>
            </div>

            {generatedImages.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded border border-dashed border-slate-800 bg-[#07090E] p-8 text-center">
                <ImageIcon className="h-8 w-8 text-slate-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-slate-300">
                  No custom frames generated yet
                </p>
                <p className="mt-1 max-w-md text-xs text-slate-500">
                  Select an aspect ratio (1:1 through 21:9) and size (1K, 2K, 4K), lock a continuity reference, and render a frame.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedImages.map((item, idx) => (
                  <div key={idx} className="overflow-hidden rounded-lg border border-slate-800 bg-[#07090E]">
                    <img
                      src={item.url}
                      alt={item.prompt}
                      referrerPolicy="no-referrer"
                      className="max-h-[420px] w-full object-contain bg-black"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-400">
                      <span className="font-mono tabular-nums">
                        {item.ratio} · {item.size} · {item.model}
                      </span>
                      <a
                        href={item.url}
                        download={`rocket-academy-${item.ratio.replace(':', 'x')}-${item.size}.png`}
                        className="font-medium text-cyan-400 hover:text-cyan-300"
                      >
                        Download Frame
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: VIDEO GENERATION & ANIMATE PHOTO INTO VIDEO */}
      {mode === 'video' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleGenerateVideo}
            className="space-y-5 rounded-lg border border-slate-800 bg-[#0B0F17] p-5 lg:col-span-5"
          >
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Video generation mode">
              <button
                type="button"
                onClick={() => setVideoMode('animate')}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  videoMode === 'animate'
                    ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-800 bg-[#07090E] text-slate-400 hover:text-slate-200'
                }`}
              >
                Animate Photo to Video
              </button>
              <button
                type="button"
                onClick={() => setVideoMode('text')}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  videoMode === 'text'
                    ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-800 bg-[#07090E] text-slate-400 hover:text-slate-200'
                }`}
              >
                Text-to-Video Clip
              </button>
            </div>

            {videoMode === 'animate' && (
              <div className="space-y-2.5">
                <label htmlFor="video-start-frame" className="block text-xs font-medium text-slate-300">
                  Starting Photo / Locked Scene Frame
                </label>
                <select
                  id="video-start-frame"
                  value={videoAssetUrl}
                  onChange={(e) => {
                    setVideoAssetUrl(e.target.value);
                    setVideoUploadedFrame(null);
                  }}
                  className="w-full rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value={GENERATED_ASSETS.marsBoulder}>Mars Split Boulder & Rut (Scene 3 & 7)</option>
                  <option value={GENERATED_ASSETS.earth}>Earth Desert Test Valley (Scene 1)</option>
                  <option value={GENERATED_ASSETS.moon}>Lunar Surface Ridge (Scene 2)</option>
                  <option value={GENERATED_ASSETS.marsVariants}>Mars Elevated Scenario Variants (Scene 5)</option>
                  <option value={GENERATED_ASSETS.continuitySheet}>Rover Continuity Sheet</option>
                </select>

                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-300 hover:border-cyan-500/60">
                  <Upload className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>
                    {videoUploadedFrame
                      ? `Uploaded: ${videoUploadedFrame.name}`
                      : 'Upload a photo to animate into video'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const { base64, mimeType } = await fileToBase64(file);
                      setVideoUploadedFrame({
                        base64,
                        mimeType,
                        previewUrl: URL.createObjectURL(file),
                        name: file.name,
                      });
                    }}
                  />
                </label>

                <div className="aspect-video w-full overflow-hidden rounded border border-slate-800">
                  <SafeImage
                    src={videoUploadedFrame?.previewUrl || videoAssetUrl}
                    alt="Selected starting frame for video animation"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="video-prompt" className="block text-xs font-medium text-slate-300">
                Motion & Camera Direction
              </label>
              <textarea
                id="video-prompt"
                rows={4}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-[#07090E] p-3 text-xs leading-relaxed text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="block text-xs font-medium text-slate-300">Aspect Ratio</span>
                <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Video aspect ratio">
                  {ALLOWED_VIDEO_ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setVideoRatio(ratio)}
                      className={`rounded border px-3 py-1.5 font-mono text-xs tabular-nums transition-colors ${
                        videoRatio === ratio
                          ? 'border-cyan-400 bg-cyan-500 text-slate-950 font-semibold'
                          : 'border-slate-800 bg-[#07090E] text-slate-300'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-medium text-slate-300">Clip Length</span>
                <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Video clip duration">
                  {(['4s', '6s', '8s'] as const).map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setVideoDuration(dur)}
                      className={`rounded border px-2 py-1.5 font-mono text-xs tabular-nums transition-colors ${
                        videoDuration === dur
                          ? 'border-cyan-400 bg-cyan-500 text-slate-950 font-semibold'
                          : 'border-slate-800 bg-[#07090E] text-slate-300'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {vidError && (
              <p role="alert" className="rounded border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                {vidError}
              </p>
            )}

            <button
              type="submit"
              disabled={vidLoading}
              className="w-full rounded-md bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {vidLoading
                ? 'Rendering clip via Omni Flash (may take ~1-2 min)...'
                : videoMode === 'animate'
                  ? `Animate Photo (${videoRatio} · ${videoDuration})`
                  : `Generate Video (${videoRatio} · ${videoDuration})`}
            </button>
          </form>

          <div className="space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-5 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Generated Video Preview (Omni Flash)
              </h2>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {videoRatio} · {videoDuration}
              </span>
            </div>

            {generatedVideo ? (
              <div className="space-y-3">
                <video
                  src={generatedVideo.url}
                  controls
                  autoPlay
                  loop
                  className="max-h-[460px] w-full rounded border border-slate-800 bg-black"
                />
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">
                    {generatedVideo.ratio} · {generatedVideo.duration} · gemini-omni-1.2-flash
                  </span>
                  <a
                    href={generatedVideo.url}
                    download="rocket-academy-scene.mp4"
                    className="font-medium text-cyan-400 hover:text-cyan-300"
                  >
                    Download MP4
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded border border-dashed border-slate-800 bg-[#07090E] p-8 text-center">
                <Film className="h-8 w-8 text-slate-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-slate-300">
                  Ready to generate motion clip
                </p>
                <p className="mt-1 max-w-md text-xs text-slate-500">
                  Animate any uploaded photo or locked scene frame into 16:9 widescreen or 9:16 vertical video using the Gemini Interactions API.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: IMAGE & VIDEO CONTINUITY ANALYZER (gemini-4-argon) */}
      {mode === 'analyze' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleAnalyzeMedia}
            className="space-y-5 rounded-lg border border-slate-800 bg-[#0B0F17] p-5 lg:col-span-5"
          >
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Inspection target type">
              <button
                type="button"
                onClick={() => {
                  setAnalyzeKind('image');
                  setAnalyzeUploaded(null);
                }}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  analyzeKind === 'image'
                    ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-800 bg-[#07090E] text-slate-400 hover:text-slate-200'
                }`}
              >
                Analyze Image Frame
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnalyzeKind('video');
                  setAnalyzeUploaded(null);
                }}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  analyzeKind === 'video'
                    ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-800 bg-[#07090E] text-slate-400 hover:text-slate-200'
                }`}
              >
                Analyze Video Clip
              </button>
            </div>

            {analyzeKind === 'image' ? (
              <div className="space-y-2.5">
                <label htmlFor="analyze-frame-select" className="block text-xs font-medium text-slate-300">
                  Select Storyboard Frame or Upload Photo
                </label>
                <select
                  id="analyze-frame-select"
                  value={analyzeAssetUrl}
                  onChange={(e) => {
                    setAnalyzeAssetUrl(e.target.value);
                    setAnalyzeUploaded(null);
                  }}
                  className="w-full rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value={GENERATED_ASSETS.continuitySheet}>Rover Continuity Reference Sheet</option>
                  <option value={GENERATED_ASSETS.earth}>Scene 1 · Earth Desert Valley</option>
                  <option value={GENERATED_ASSETS.moon}>Scene 2 · Lunar Ridge</option>
                  <option value={GENERATED_ASSETS.marsBoulder}>Scene 3 & 7 · Mars Split Boulder</option>
                  <option value={GENERATED_ASSETS.marsVariants}>Scene 5 · Mars Scenario Variants</option>
                </select>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-300 hover:border-cyan-500/60">
                  <Upload className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>{analyzeUploaded ? analyzeUploaded.name : 'Upload photo to audit'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const { base64, mimeType } = await fileToBase64(file);
                      setAnalyzeUploaded({
                        base64,
                        mimeType,
                        previewUrl: URL.createObjectURL(file),
                        name: file.name,
                      });
                    }}
                  />
                </label>
                <div className="aspect-video w-full overflow-hidden rounded border border-slate-800">
                  <SafeImage
                    src={analyzeUploaded?.previewUrl || analyzeAssetUrl}
                    alt="Frame under continuity inspection"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 bg-[#07090E] px-3 py-4 text-xs text-slate-300 hover:border-cyan-500/60">
                  <Upload className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  <span>
                    {analyzeUploaded
                      ? `Uploaded: ${analyzeUploaded.name}`
                      : generatedVideo
                        ? 'Using generated Video Studio clip (or click to upload MP4/WebM)'
                        : 'Upload video clip (MP4 / WebM) for Gemini 4 Argon analysis'}
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const { base64, mimeType } = await fileToBase64(file);
                      setAnalyzeUploaded({
                        base64,
                        mimeType,
                        previewUrl: URL.createObjectURL(file),
                        name: file.name,
                      });
                    }}
                  />
                </label>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="analyze-question" className="block text-xs font-medium text-slate-300">
                Inspection Criteria
              </label>
              <textarea
                id="analyze-question"
                rows={3}
                value={analyzeQuestion}
                onChange={(e) => setAnalyzeQuestion(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-[#07090E] p-3 text-xs leading-relaxed text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {analyzeError && (
              <p role="alert" className="rounded border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                {analyzeError}
              </p>
            )}

            <button
              type="submit"
              disabled={analyzeLoading}
              className="w-full rounded-md bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzeLoading
                ? 'Analyzing with Gemini 4 Argon...'
                : analyzeKind === 'image'
                  ? 'Analyze Image Continuity'
                  : 'Analyze Video Clip'}
            </button>
          </form>

          <div className="space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-5 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Continuity & Physics Audit Report
              </h2>
              <span className="font-mono text-xs text-slate-400">gemini-4-argon</span>
            </div>

            {analysisResult ? (
              <div className="whitespace-pre-wrap rounded border border-slate-800 bg-[#07090E] p-4 text-xs leading-relaxed text-slate-200">
                {analysisResult}
              </div>
            ) : (
              <div className="flex min-h-[340px] flex-col items-center justify-center rounded border border-dashed border-slate-800 bg-[#07090E] p-8 text-center">
                <ScanEye className="h-8 w-8 text-slate-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-slate-300">
                  Run a continuity inspection
                </p>
                <p className="mt-1 max-w-md text-xs text-slate-500">
                  Gemini 4 Argon inspects uploaded photos, storyboard frames, or video clips for wheel count accuracy, terrain contact, and atmospheric fidelity.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
