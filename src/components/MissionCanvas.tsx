import React, { useEffect, useRef, useState } from 'react';
import { DestinationConfig, MAP_HEIGHT, MAP_WIDTH } from '../data/missions';
import { RoverCommand, SimFrame } from '../utils/missionSimulation';

interface MissionCanvasProps {
  destination: DestinationConfig;
  commands: RoverCommand[];
  mode: 'PLANNING' | 'RUNNING' | 'REPLAY';
  frames: SimFrame[];
  frameIndex: number;
  showMeshOverlay: boolean;
  onAddWaypoint: (x: number, y: number) => void;
}

export const MissionCanvas: React.FC<MissionCanvasProps> = ({
  destination,
  commands,
  mode,
  frames,
  frameIndex,
  showMeshOverlay,
  onAddWaypoint,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setImageReady(false);
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      bgImageRef.current = img;
      setImageReady(true);
    };
    img.onerror = () => {
      bgImageRef.current = null;
      setImageReady(false);
    };
    img.src = destination.imagePath;
  }, [destination.imagePath]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = MAP_WIDTH * dpr;
    canvas.height = MAP_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1. Background Planetary Imagery + Tactical Scrim
    ctx.fillStyle = '#07090E';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    if (imageReady && bgImageRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.34;
      const img = bgImageRef.current;
      const scale = Math.max(MAP_WIDTH / img.width, MAP_HEIGHT / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (MAP_WIDTH - dw) / 2, (MAP_HEIGHT - dh) / 2, dw, dh);
      ctx.restore();
    }

    // Subtle directional atmosphere vignette
    const grad = ctx.createRadialGradient(
      MAP_WIDTH * 0.5,
      MAP_HEIGHT * 0.45,
      80,
      MAP_WIDTH * 0.5,
      MAP_HEIGHT * 0.5,
      MAP_WIDTH * 0.68
    );
    grad.addColorStop(0, 'rgba(7, 9, 14, 0.30)');
    grad.addColorStop(1, 'rgba(7, 9, 14, 0.78)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // 2. Topographic Coordinate Grid & Contour Mesh
    ctx.strokeStyle = showMeshOverlay
      ? 'rgba(6, 182, 212, 0.16)'
      : 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = 100; gx < MAP_WIDTH; gx += 100) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, MAP_HEIGHT);
      ctx.stroke();
    }
    for (let gy = 80; gy < MAP_HEIGHT; gy += 80) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(MAP_WIDTH, gy);
      ctx.stroke();
    }

    if (showMeshOverlay) {
      // Elevation contour ellipses around terrain features
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.18)';
      ctx.setLineDash([4, 6]);
      for (const h of destination.hazards) {
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius * 1.35, h.radius * 0.92, -0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    const activeFrame =
      frames.length > 0
        ? frames[Math.max(0, Math.min(frameIndex, frames.length - 1))]
        : null;
    const sampledSet = new Set(activeFrame?.sampledIds ?? []);
    const scannedSet = new Set(activeFrame?.scannedIds ?? []);

    // 3. Hazards (Sandy Ruts, Boulders, Shadowed Craters, Steep Ridges)
    for (const h of destination.hazards) {
      const isScanned = scannedSet.has(h.id);
      ctx.save();
      if (h.kind === 'sandy-rut') {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
        ctx.strokeStyle = isScanned ? 'rgba(6, 182, 212, 0.85)' : 'rgba(245, 158, 11, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (h.kind === 'crater-shadow') {
        const cGrad = ctx.createRadialGradient(h.x, h.y, h.radius * 0.2, h.x, h.y, h.radius);
        cGrad.addColorStop(0, 'rgba(2, 6, 14, 0.92)');
        cGrad.addColorStop(0.75, 'rgba(15, 23, 42, 0.65)');
        cGrad.addColorStop(1, 'rgba(56, 189, 248, 0.18)');
        ctx.fillStyle = cGrad;
        ctx.strokeStyle = isScanned ? 'rgba(6, 182, 212, 0.85)' : 'rgba(148, 163, 184, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Boulder or steep escarpment ridge
        ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.72)';
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner faceted rock polygon
        ctx.fillStyle = 'rgba(51, 65, 85, 0.78)';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const r = h.radius * 0.52;
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + 0.3;
          const rad = r * (i % 2 === 0 ? 1.0 : 0.78);
          const px = h.x + Math.cos(ang) * rad;
          const py = h.y + Math.sin(ang) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Hazard label
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = h.lethalOnDirectHit ? '#FCA5A5' : '#FCD34D';
      ctx.fillText(
        `${h.label}${isScanned ? ' [SCANNED]' : ''}`,
        h.x,
        h.y + h.radius + 14
      );
      ctx.restore();
    }

    // 4. Science Targets
    for (const target of destination.scienceTargets) {
      const collected = sampledSet.has(target.id);
      ctx.save();
      ctx.strokeStyle = collected ? '#10B981' : '#38BDF8';
      ctx.fillStyle = collected ? 'rgba(16, 185, 129, 0.22)' : 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(target.x, target.y - 12);
      ctx.lineTo(target.x + 12, target.y);
      ctx.lineTo(target.x, target.y + 12);
      ctx.lineTo(target.x - 12, target.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 11px "IBM Plex Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = collected ? '#6EE7B7' : '#BAE6FD';
      ctx.fillText(
        collected ? `${target.label} ✓` : `${target.label} (+${target.points})`,
        target.x,
        target.y - 18
      );
      ctx.restore();
    }

    // 5. Start Pad & Extraction Beacon
    ctx.save();
    ctx.strokeStyle = '#94A3B8';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(destination.start.x, destination.start.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#CBD5E1';
    ctx.textAlign = 'center';
    ctx.fillText('START', destination.start.x, destination.start.y + 28);

    // Extraction Beacon
    ctx.strokeStyle = '#10B981';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(destination.beacon.x, destination.beacon.y, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(destination.beacon.x, destination.beacon.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#6EE7B7';
    ctx.fillText('BEACON', destination.beacon.x, destination.beacon.y + 46);
    ctx.restore();

    // 6. Planned Command Path Preview
    ctx.save();
    let prevX = destination.start.x;
    let prevY = destination.start.y;
    let wpNum = 0;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      if (cmd.action === 'DRIVE') {
        wpNum += 1;
        ctx.strokeStyle =
          cmd.speed === 'FAST'
            ? 'rgba(245, 158, 11, 0.85)'
            : cmd.speed === 'CAUTIOUS'
            ? 'rgba(6, 182, 212, 0.9)'
            : 'rgba(148, 163, 184, 0.85)';
        ctx.lineWidth = mode === 'PLANNING' ? 2.4 : 1.5;
        ctx.setLineDash(mode === 'PLANNING' ? [6, 5] : [3, 5]);
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(cmd.x, cmd.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Waypoint Node
        ctx.fillStyle = '#07090E';
        ctx.strokeStyle =
          cmd.speed === 'FAST' ? '#F59E0B' : cmd.speed === 'CAUTIOUS' ? '#06B6D4' : '#E2E8F0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cmd.x, cmd.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#F8FAFC';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(wpNum), cmd.x, cmd.y + 0.5);

        prevX = cmd.x;
        prevY = cmd.y;
      } else {
        // Non-drive action marker at current rover position
        ctx.strokeStyle = cmd.action === 'RELAY' ? '#06B6D4' : cmd.action === 'SAMPLE' ? '#10B981' : '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(prevX, prevY, 15, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 7. Traversed Wheel Tracks (when Running or Replaying)
    if (frames.length > 1 && frameIndex > 0) {
      ctx.save();
      const limit = Math.min(frameIndex, frames.length - 1);
      for (let i = 1; i <= limit; i++) {
        const a = frames[i - 1];
        const b = frames[i];
        ctx.strokeStyle =
          b.slipRatio >= 0.55
            ? 'rgba(245, 158, 11, 0.85)'
            : 'rgba(6, 182, 212, 0.72)';
        ctx.lineWidth = b.slipRatio >= 0.55 ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.moveTo(a.carrierX, a.carrierY);
        ctx.lineTo(b.carrierX, b.carrierY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 8. Draw Scout (4-wheel) & Carrier (6-wheel)
    const carrierX = activeFrame ? activeFrame.carrierX : destination.start.x;
    const carrierY = activeFrame ? activeFrame.carrierY : destination.start.y;
    const scoutX = activeFrame ? activeFrame.scoutX : destination.start.x + 28;
    const scoutY = activeFrame ? activeFrame.scoutY : destination.start.y - 6;
    const heading = activeFrame ? activeFrame.headingRad : 0;

    if (activeFrame?.relayActive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(scoutX, scoutY);
      ctx.lineTo(carrierX, carrierY);
      ctx.stroke();
      ctx.restore();
    }

    if (activeFrame?.scanPulse) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(scoutX, scoutY, 95, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (activeFrame && activeFrame.slipRatio >= 0.55) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(carrierX, carrierY, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw Carrier (6-wheel larger rover)
    drawRover(ctx, carrierX, carrierY, heading, 'CARRIER');
    // Draw Scout (4-wheel compact rover)
    drawRover(ctx, scoutX, scoutY, heading, 'SCOUT');

    // 9. Crosshair coordinate indicator in Planning mode
    if (mode === 'PLANNING' && hoverCoord) {
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverCoord.x, 0);
      ctx.lineTo(hoverCoord.x, MAP_HEIGHT);
      ctx.moveTo(0, hoverCoord.y);
      ctx.lineTo(MAP_WIDTH, hoverCoord.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(7, 9, 14, 0.88)';
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
      const boxX = Math.min(MAP_WIDTH - 115, hoverCoord.x + 12);
      const boxY = Math.max(12, hoverCoord.y - 26);
      ctx.fillRect(boxX, boxY, 102, 20);
      ctx.strokeRect(boxX, boxY, 102, 20);
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#38BDF8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`X:${hoverCoord.x} Y:${hoverCoord.y}`, boxX + 6, boxY + 10);
      ctx.restore();
    }
  }, [destination, commands, mode, frames, frameIndex, showMeshOverlay, imageReady, hoverCoord]);

  const toMapCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * MAP_WIDTH);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * MAP_HEIGHT);
    return {
      x: Math.max(24, Math.min(MAP_WIDTH - 24, x)),
      y: Math.max(24, Math.min(MAP_HEIGHT - 24, y)),
    };
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-[#07090E]">
      <canvas
        ref={canvasRef}
        aria-label={`${destination.name} tactical mission terrain map`}
        onClick={(e) => {
          if (mode !== 'PLANNING') return;
          const pt = toMapCoords(e);
          onAddWaypoint(pt.x, pt.y);
        }}
        onMouseMove={(e) => {
          if (mode !== 'PLANNING') {
            if (hoverCoord) setHoverCoord(null);
            return;
          }
          setHoverCoord(toMapCoords(e));
        }}
        onMouseLeave={() => setHoverCoord(null)}
        className={`block aspect-video w-full select-none ${
          mode === 'PLANNING' ? 'cursor-crosshair' : 'cursor-default'
        }`}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-[#0B0F17] px-3 py-2 text-[11px] text-slate-400">
        <span>
          {mode === 'PLANNING'
            ? 'Click terrain to append a DRIVE waypoint · Route around red outcrops & yellow slip zones'
            : mode === 'RUNNING'
            ? 'Deterministic simulation running · Inspect wheel velocity vs. forward progress below'
            : 'Replay mode · Scrub timeline or click logged events to inspect rover actions'}
        </span>
        <span className="font-mono tabular-nums text-slate-500">
          {MAP_WIDTH} × {MAP_HEIGHT} terrain grid
        </span>
      </div>
    </div>
  );
};

function drawRover(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  headingRad: number,
  type: 'SCOUT' | 'CARRIER'
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(headingRad);

  if (type === 'CARRIER') {
    // 6 wheels (3 per side)
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1;
    for (const wx of [-12, 0, 12]) {
      ctx.fillRect(wx - 3.5, -13, 7, 3.5);
      ctx.fillRect(wx - 3.5, 9.5, 7, 3.5);
    }
    // Graphite chassis + white cargo enclosure + amber markings
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-15, -9, 30, 18);
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(-12, -7, 22, 14);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(8, -7, 4, 14);
    ctx.fillRect(-12, -2, 22, 4);
  } else {
    // Scout: 4 wheels (2 per side)
    ctx.fillStyle = '#0F172A';
    for (const wx of [-7, 7]) {
      ctx.fillRect(wx - 2.5, -9.5, 5, 3);
      ctx.fillRect(wx - 2.5, 6.5, 5, 3);
    }
    // Ceramic-white body + amber strip + sensor mast dot
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-9, -6, 18, 12);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(4, -6, 3, 12);
    ctx.fillStyle = '#06B6D4';
    ctx.beginPath();
    ctx.arc(4, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
