import React, { useRef, useState } from 'react';
import {
  Mic,
  Send,
  Square,
  Upload,
  Zap,
} from 'lucide-react';
import { FILM_SCENES } from '../data/storyboard';
import { evaluateNarrationPacing, formatTimecode } from '../utils/filmTimeline';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

type ChatModel =
  | 'gemini-4-hydrogen'
  | 'gemini-4-argon'
  | 'gemini-4-carbon'
  | 'gemini-3.1-flash-lite';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || '');
      const idx = s.indexOf(',');
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    reader.onerror = () => reject(new Error('Failed to encode audio.'));
    reader.readAsDataURL(blob);
  });
}

export const DirectorAndAudio: React.FC = () => {
  // Voiceover transcription state
  const [selectedSceneId, setSelectedSceneId] = useState(FILM_SCENES[0].id);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>(FILM_SCENES[0].narration);
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Low-latency check state (gemini-3.1-flash-lite)
  const [fastInput, setFastInput] = useState(
    'Verify Scene 2 lunar shot has zero atmospheric haze and matches Earth horizon.'
  );
  const [fastResponse, setFastResponse] = useState<{ text: string; latencyMs: number } | null>(null);
  const [fastLoading, setFastLoading] = useState(false);
  const [fastError, setFastError] = useState<string | null>(null);

  // Multi-turn Director chatbot state
  const [chatModel, setChatModel] = useState<ChatModel>('gemini-4-hydrogen');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      text: 'Continuity supervisor online. Ask about Scout (4-wheel) and Carrier (6-wheel) shot framing, MongoDB Atlas interval retrieval, or 24 fps timing across the 1,440-frame cut.',
      modelUsed: 'System Brief',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const activeScene = FILM_SCENES.find((s) => s.id === selectedSceneId) || FILM_SCENES[0];
  const windowSec = activeScene.endSec - activeScene.startSec;
  const pacing = evaluateNarrationPacing(transcript, windowSec);

  const sendAudioForTranscription = async (blob: Blob, mimeType: string) => {
    setTranscribeError(null);
    setTranscribeLoading(true);
    try {
      const audioBase64 = await blobToBase64(blob);
      const res = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audio transcription failed.');
      if (data.transcript) {
        setTranscript(data.transcript);
      }
    } catch (err) {
      setTranscribeError(err instanceof Error ? err.message : 'Transcription failed.');
    } finally {
      setTranscribeLoading(false);
    }
  };

  const toggleRecording = async () => {
    setTranscribeError(null);
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        void sendAudioForTranscription(blob, mimeType);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setTranscribeError(
        err instanceof Error ? err.message : 'Microphone access was denied or unavailable.'
      );
    }
  };

  const handleFastCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setFastError(null);
    if (!fastInput.trim()) {
      setFastError('Enter a shot note or narration line.');
      return;
    }
    setFastLoading(true);
    try {
      const res = await fetch('/api/gemini/fast-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fastInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fast check failed.');
      setFastResponse({ text: data.text, latencyMs: data.latencyMs });
    } catch (err) {
      setFastError(err instanceof Error ? err.message : 'Fast check failed.');
    } finally {
      setFastLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setChatError(null);
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: chatInput.trim(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const payloadMessages = nextHistory
        .filter((m) => m.id !== 'init-1')
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: chatModel,
          messages: payloadMessages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat request failed.');

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: data.text,
          modelUsed: data.model,
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Chat request failed.');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="font-display text-2xl font-semibold text-slate-100">
          Voiceover Timing & Continuity Director
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Record and transcribe narration takes against 8-second scene windows, run sub-second checks, and consult the multi-turn Continuity Supervisor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Audio Transcription + Low-Latency Check */}
        <div className="space-y-6 lg:col-span-5">
          {/* Audio Transcription (gemini-3.5-transcribe) */}
          <section aria-labelledby="voiceover-heading" className="space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="voiceover-heading" className="font-display text-sm font-semibold text-slate-100">
                Voiceover Transcription & Pacing
              </h2>
              <span className="font-mono text-[11px] text-slate-400">gemini-3.5-transcribe</span>
            </div>

            <div className="space-y-2">
              <label htmlFor="vo-scene-select" className="block text-xs font-medium text-slate-300">
                Target Editorial Window
              </label>
              <select
                id="vo-scene-select"
                value={selectedSceneId}
                onChange={(e) => {
                  const next = FILM_SCENES.find((s) => s.id === e.target.value);
                  setSelectedSceneId(e.target.value);
                  if (next) setTranscript(next.narration);
                }}
                className="w-full rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                {FILM_SCENES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatTimecode(s.startSec)}–{formatTimecode(s.endSec)} · {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded border border-slate-800 bg-[#07090E] p-3 text-xs text-slate-300">
              <p className="text-[11px] font-semibold text-cyan-400">Approved Script Line</p>
              <p className="mt-1">“{activeScene.narration}”</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleRecording}
                className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isRecording
                    ? 'bg-rose-500 text-white hover:bg-rose-400'
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="h-3.5 w-3.5" aria-hidden="true" />
                    Stop & Transcribe
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                    Record Mic Take
                  </>
                )}
              </button>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0">
                <Upload className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                <span>Upload Audio</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void sendAudioForTranscription(file, file.type || 'audio/mp3');
                    }
                  }}
                />
              </label>
            </div>

            {transcribeLoading && (
              <p className="text-xs text-cyan-300">Transcribing voiceover take...</p>
            )}
            {transcribeError && (
              <p role="alert" className="rounded border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                {transcribeError}
              </p>
            )}

            <div className="space-y-1.5">
              <label htmlFor="vo-transcript" className="block text-xs font-medium text-slate-300">
                Transcript & Pacing Check
              </label>
              <textarea
                id="vo-transcript"
                rows={3}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-[#07090E] p-3 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
                <span className="text-slate-400">
                  {pacing.wordCount} words · ~{pacing.estimatedSec}s / {pacing.windowSec}s window
                </span>
                <span
                  className={
                    pacing.status === 'fits'
                      ? 'text-emerald-400'
                      : pacing.status === 'tight'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }
                >
                  {pacing.pauseHeadroomSec >= 0
                    ? `${pacing.pauseHeadroomSec}s pause headroom (${pacing.status})`
                    : `${Math.abs(pacing.pauseHeadroomSec)}s over window`}
                </span>
              </div>
            </div>
          </section>

          {/* Low-Latency Check (gemini-3.1-flash-lite) */}
          <section aria-labelledby="fast-check-heading" className="space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <h2 id="fast-check-heading" className="font-display text-sm font-semibold text-slate-100">
                  Low-Latency Continuity Check
                </h2>
              </div>
              <span className="font-mono text-[11px] text-slate-400">gemini-3.1-flash-lite</span>
            </div>

            <form onSubmit={handleFastCheck} className="space-y-3">
              <label htmlFor="fast-check-input" className="sr-only">
                Quick shot or timing check
              </label>
              <textarea
                id="fast-check-input"
                rows={2}
                value={fastInput}
                onChange={(e) => setFastInput(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-[#07090E] p-3 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={fastLoading}
                className="rounded-md bg-amber-400 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
              >
                {fastLoading ? 'Checking...' : 'Run Instant Check'}
              </button>
            </form>

            {fastError && (
              <p role="alert" className="rounded border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                {fastError}
              </p>
            )}

            {fastResponse && (
              <div className="space-y-2 rounded border border-slate-800 bg-[#07090E] p-3">
                <p className="font-mono text-[11px] text-amber-400 tabular-nums">
                  Response in {fastResponse.latencyMs} ms
                </p>
                <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                  {fastResponse.text}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Multi-Turn Director & Continuity Chatbot */}
        <section
          aria-labelledby="director-chat-heading"
          className="flex h-[640px] flex-col justify-between rounded-lg border border-slate-800 bg-[#0B0F17] p-5 lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 id="director-chat-heading" className="font-display text-base font-semibold text-slate-100">
                Director & Continuity Supervisor
              </h2>
              <p className="text-xs text-slate-400">
                Multi-turn studio conversation locked to Rocket Academy: First Contact rules
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="chat-model-select" className="sr-only">
                Select Gemini model tier
              </label>
              <select
                id="chat-model-select"
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value as ChatModel)}
                className="rounded-md border border-slate-700 bg-[#07090E] px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
              >
                <option value="gemini-4-hydrogen">gemini-4-hydrogen (General)</option>
                <option value="gemini-4-argon">gemini-4-argon (Complex)</option>
                <option value="gemini-4-carbon">gemini-4-carbon (Deep Reasoning)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
              </select>
            </div>
          </div>

          <div
            role="log"
            aria-label="Director conversation history"
            className="my-4 flex-1 space-y-3 overflow-y-auto pr-1"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg border p-3.5 ${
                  msg.role === 'user'
                    ? 'ml-8 border-cyan-500/40 bg-[#0F1829]'
                    : 'mr-8 border-slate-800 bg-[#07090E]'
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {msg.role === 'user' ? 'Producer' : 'Continuity Supervisor'}
                  </span>
                  {msg.modelUsed && (
                    <span className="font-mono text-slate-500">{msg.modelUsed}</span>
                  )}
                </div>
                <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="mr-8 rounded-lg border border-slate-800 bg-[#07090E] p-3 text-xs text-cyan-400">
                Supervisor is reviewing shot continuity...
              </div>
            )}
          </div>

          <div className="space-y-2.5 border-t border-slate-800 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                'How do we ensure Scene 3 & Scene 7 Mars camera match?',
                'Draft an Atlas provenance note for Scene 4.',
                'Check Scene 2 lunar audio & dust physics.',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setChatInput(suggestion)}
                  className="rounded border border-slate-800 bg-[#07090E] px-2.5 py-1 text-[11px] text-slate-300 hover:border-slate-700 hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {chatError && (
              <p role="alert" className="rounded border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
                {chatError}
              </p>
            )}

            <form onSubmit={handleSendChat} className="flex items-center gap-2">
              <label htmlFor="director-chat-input" className="sr-only">
                Message the Continuity Supervisor
              </label>
              <input
                id="director-chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about scene transitions, Atlas evidence, or robot continuity..."
                className="flex-1 rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                Send
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};
