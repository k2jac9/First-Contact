import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/share/bun-global/node_modules/playwright');

const ROOT = process.cwd();
const TMP_DIR = path.join(ROOT, '.tmp-pitch-video');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUTPUT_VIDEO = path.join(PUBLIC_DIR, 'first-contact-pitch-30s.mp4');

const SEGMENTS = [
  {
    id: '01-intro',
    duration: 2.3,
    image: path.join(ROOT, 'src/assets/images/earth_desert_valley_1794689352726.jpg'),
    zoomExpr: 'min(zoom+0.0008,1.12)',
    panX: 'iw/2-(iw/zoom/2)',
    panY: 'ih/2-(ih/zoom/2)',
    timestamp: '0:00',
    chapterIndex: 0,
    kicker: '0:00 · TEAM ROCKET ACADEMY',
    headline: 'Alejandro Castellanos',
    body: 'Founder & Lead Builder · Rocket Academy · Designing safer autonomous missions before launch.',
    darkCard: false,
  },
  {
    id: '02-challenge',
    duration: 3.3,
    image: path.join(ROOT, 'src/assets/images/mars_split_boulder_rut_1794689354383.jpg'),
    zoomExpr: 'min(zoom+0.0009,1.14)',
    panX: 'iw/2-(iw/zoom/2)+on*0.4',
    panY: 'ih/2-(ih/zoom/2)',
    timestamp: '0:02',
    chapterIndex: 1,
    kicker: '0:02 · THE CHALLENGE & INSPIRATION',
    headline: 'Off-world terrain punishes blind autonomy.',
    body: 'Unseen sand, steep craters, and wheel slip stall real planetary rovers—we built a way to test policies first.',
    darkCard: false,
  },
  {
    id: '03-title',
    duration: 5.3,
    image: path.join(ROOT, 'src/assets/images/lunar_ridge_rovers_1794689353680.jpg'),
    zoomExpr: 'min(zoom+0.0007,1.12)',
    panX: 'iw/2-(iw/zoom/2)-on*0.35',
    panY: 'ih/2-(ih/zoom/2)',
    timestamp: '0:05',
    chapterIndex: 2,
    kicker: '0:05 · PROJECT TITLE & TAGLINE',
    headline: 'Rocket Academy: First Contact',
    body: 'Plan the mission. Explore the world. Learn from every run — cooperative Scout & Carrier rover planning.',
    darkCard: false,
  },
  {
    id: '04-idea-workflow',
    duration: 5.3,
    image: path.join(ROOT, 'src/assets/images/rover_continuity_sheet_1794689355273.jpg'),
    zoomExpr: 'min(zoom+0.0006,1.10)',
    panX: 'iw/2-(iw/zoom/2)',
    panY: 'ih/2-(ih/zoom/2)',
    timestamp: '0:10',
    chapterIndex: 3,
    kicker: '0:10 · HOW IT WORKS',
    headline: 'Goals to deterministic telemetry in 0.1s steps.',
    body: 'Describe missions in plain English or plot waypoints, simulate wheel slip & power, and inspect Atlas replays.',
    darkCard: false,
  },
  {
    id: '05-nasa-data',
    duration: 5.3,
    image: path.join(ROOT, 'src/assets/images/earth_desert_valley_1794689352726.jpg'),
    zoomExpr: 'min(zoom+0.0007,1.12)',
    panX: 'iw/2-(iw/zoom/2)+on*0.3',
    panY: 'ih/2-(ih/zoom/2)',
    timestamp: '0:15',
    chapterIndex: 3,
    kicker: '0:15 · NASA & SPACE AGENCY PARTNER DATA',
    headline: 'Grounded in open Earth, Moon & Mars worlds.',
    body: 'NASA & Space Agency Partner terrain data powers gravity (0.16g–1.0g), hazard physics, and live Search & Maps.',
    darkCard: false,
  },
  {
    id: '06-future-genie4',
    duration: 6.3,
    image: path.join(ROOT, 'src/assets/images/mars_scenario_variants_1794689355492.jpg'),
    zoomExpr: 'min(zoom+0.0008,1.14)',
    panX: 'iw/2-(iw/zoom/2)',
    panY: 'ih/2-(ih/zoom/2)-on*0.25',
    timestamp: '0:20',
    chapterIndex: 4,
    kicker: '0:20 · THE FUTURE WITH GENIE 4',
    headline: 'Infinite simulated worlds with Genie 4.',
    body: 'Imagine students, educators & robotics teams generating living worlds across Earth, Moon, Mars & beyond.',
    darkCard: false,
  },
  {
    id: '07-closing',
    duration: 4.0,
    image: path.join(ROOT, 'src/assets/images/mars_split_boulder_rut_1794689354383.jpg'),
    zoomExpr: '1.06',
    panX: 'iw/2-(iw/zoom/2)',
    panY: 'ih/2-(ih/zoom/2)',
    timestamp: '0:26–0:30',
    chapterIndex: 4,
    kicker: '0:26 · ROCKET ACADEMY: FIRST CONTACT',
    headline: 'Every mission teaches the next.',
    body: 'Alejandro Castellanos · Team Rocket Academy · Built for learners, educators & explorers everywhere.',
    darkCard: true,
  },
];

const CHAPTERS = [
  '0:00 Intro',
  '0:02 Challenge',
  '0:05 First Contact',
  '0:10 How It Works & NASA Data',
  '0:20 Future with Genie 4',
];

function renderOverlayHtml(seg) {
  const chaptersHtml = CHAPTERS.map((label, idx) => {
    const active = idx === seg.chapterIndex;
    const passed = idx < seg.chapterIndex;
    return `
      <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
        <div style="height:3px; border-radius:2px; background:${
          active ? '#22D3EE' : passed ? '#0891B2' : 'rgba(148,163,184,0.28)'
        };"></div>
        <span style="font-family:'JetBrains Mono', monospace; font-size:12px; letter-spacing:0.03em; color:${
          active ? '#ECFEFF' : passed ? '#94A3B8' : 'rgba(148,163,184,0.65)'
        }; font-weight:${active ? '700' : '500'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${label}
        </span>
      </div>
    `;
  }).join('');

  const bgOverlay = seg.darkCard
    ? 'background: linear-gradient(180deg, rgba(7,9,14,0.82) 0%, rgba(7,9,14,0.78) 55%, rgba(7,9,14,0.96) 100%);'
    : 'background: linear-gradient(180deg, rgba(7,9,14,0.72) 0%, rgba(7,9,14,0.08) 32%, rgba(7,9,14,0.35) 56%, rgba(7,9,14,0.94) 100%);';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: 1280px;
            height: 720px;
            background: transparent;
            overflow: hidden;
            font-family: 'Liberation Sans', 'DejaVu Sans', sans-serif;
            color: #F8FAFC;
          }
        </style>
      </head>
      <body>
        <div style="position:relative; width:1280px; height:720px; ${bgOverlay} display:flex; flex-direction:column; justify-content:space-between; padding:32px 56px 46px 56px;">
          <!-- Top Chapter Progress Strip -->
          <div style="display:flex; flex-direction:column; gap:14px;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span style="font-family:'JetBrains Mono', monospace; font-size:13px; letter-spacing:0.12em; color:#E2E8F0; font-weight:700;">
                ROCKET ACADEMY · FIRST CONTACT
              </span>
              <span style="font-family:'JetBrains Mono', monospace; font-size:13px; color:#22D3EE; font-weight:700;">
                ${seg.timestamp} / 0:30
              </span>
            </div>
            <div style="display:flex; gap:14px; width:100%;">
              ${chaptersHtml}
            </div>
          </div>

          <!-- Bottom Editorial Caption Block -->
          <div style="max-width:1040px;">
            <p style="font-family:'JetBrains Mono', monospace; font-size:16px; letter-spacing:0.08em; color:#22D3EE; font-weight:700; margin-bottom:12px;">
              ${seg.kicker}
            </p>
            <h1 style="font-size:48px; line-height:1.12; font-weight:700; color:#F8FAFC; letter-spacing:-0.015em; margin-bottom:14px;">
              ${seg.headline}
            </h1>
            <p style="font-size:23px; line-height:1.4; color:#CBD5E1; max-width:960px;">
              ${seg.body}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function main() {
  await fs.rm(TMP_DIR, { recursive: true, force: true });
  await fs.mkdir(TMP_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  console.log('1. Rendering crisp 1280x720 transparent overlay plates...');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  for (const seg of SEGMENTS) {
    await page.setContent(renderOverlayHtml(seg), { waitUntil: 'load' });
    await page.screenshot({
      path: path.join(TMP_DIR, `${seg.id}-overlay.png`),
      omitBackground: true,
    });
  }
  await browser.close();

  console.log('2. Rendering Ken Burns 24fps segments with overlays...');
  const fps = 24;
  const clipPaths = [];

  for (const seg of SEGMENTS) {
    const frames = Math.round(seg.duration * fps);
    const clipOut = path.join(TMP_DIR, `${seg.id}.mp4`);
    const overlayPng = path.join(TMP_DIR, `${seg.id}-overlay.png`);

    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-loop', '1',
        '-i', seg.image,
        '-loop', '1',
        '-i', overlayPng,
        '-filter_complex',
        `[0:v]scale=1920:-1,zoompan=z='${seg.zoomExpr}':x='${seg.panX}':y='${seg.panY}':d=${frames}:s=1280x720:fps=${fps},format=rgba[bg];` +
        `[1:v]format=rgba[ov];` +
        `[bg][ov]overlay=0:0:shortest=1,format=yuv420p[v]`,
        '-map', '[v]',
        '-t', String(seg.duration),
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '20',
        '-r', String(fps),
        clipOut,
      ],
      { stdio: 'pipe' }
    );
    clipPaths.push(clipOut);
  }

  console.log('3. Crossfading all 7 segments + synthesizing stereo ambient underscore...');
  const fade = 0.45;
  // Total duration = sum(durations) - 6 * fade = (2.3+3.3+5.3+5.3+5.3+6.3+4.0) - 2.7 = 31.8 - 2.7 = 29.10s (strictly <= 30s!)
  const inputs = [];
  for (const cp of clipPaths) {
    inputs.push('-i', cp);
  }

  let filterChain = '';
  let prevLabel = '0:v';
  let offset = SEGMENTS[0].duration - fade;

  for (let i = 1; i < SEGMENTS.length; i++) {
    const outLabel = i === SEGMENTS.length - 1 ? 'vmerged' : `vx${i}`;
    filterChain += `[${prevLabel}][${i}:v]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(2)}[${outLabel}];`;
    prevLabel = outLabel;
    offset += SEGMENTS[i].duration - fade;
  }

  const totalDuration = Number((offset + fade).toFixed(2));
  console.log(`Target exact video duration: ${totalDuration}s`);

  // Warm ambient sci-fi underscore pad in Csus2/Cmaj9 resolving gently
  const audioExpr =
    '0.14*sin(2*PI*130.81*t)+0.10*sin(2*PI*196.00*t)+0.08*sin(2*PI*293.66*t)+' +
    '0.06*sin(2*PI*392.00*t)*(0.5+0.5*sin(2*PI*0.18*t))+' +
    '0.05*sin(2*PI*523.25*t)*if(gte(t\\,20)\\,1\\,0.25)';

  execFileSync(
    'ffmpeg',
    [
      '-y',
      ...inputs,
      '-f', 'lavfi',
      '-i', `aevalsrc=${audioExpr}:s=44100:d=${totalDuration}`,
      '-filter_complex',
      `${filterChain}[vmerged]fade=t=in:st=0:d=0.35,fade=t=out:st=${(totalDuration - 0.6).toFixed(2)}:d=0.6[vout];` +
      `[${SEGMENTS.length}:a]lowpass=f=1100,afade=t=in:st=0:d=0.8,afade=t=out:st=${(totalDuration - 1.2).toFixed(2)}:d=1.2,pan=stereo|c0=c0|c1=c0[aout]`,
      '-map', '[vout]',
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-profile:v', 'high',
      '-level', '4.1',
      '-g', '24',
      '-keyint_min', '24',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-t', String(totalDuration),
      OUTPUT_VIDEO,
    ],
    { stdio: 'pipe' }
  );

  const probe = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', OUTPUT_VIDEO],
    { encoding: 'utf8' }
  );
  console.log('Video built cleanly:', OUTPUT_VIDEO, probe.trim());

  // Extract 4 verification frames to visually inspect
  for (const sec of ['0.8', '3.5', '11.5', '22.0']) {
    execFileSync(
      'ffmpeg',
      ['-y', '-ss', sec, '-i', OUTPUT_VIDEO, '-frames:v', '1', path.join(TMP_DIR, `check-${sec}.png`)],
      { stdio: 'pipe' }
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
