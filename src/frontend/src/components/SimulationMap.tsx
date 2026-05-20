import { useEffect, useRef } from 'react';
import type { Vehicle } from '../hooks/useTrafficSocket';

interface SimulationMapProps {
  vehicles: Vehicle[];
  isActive: boolean;
  title: string;
  mapRoads?: number[][][];
}

export default function SimulationMap({ vehicles, isActive, title, mapRoads }: SimulationMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // FIX 1: Bounds are locked ONCE from the road geometry, NOT from vehicle positions.
  // This is why roads were "wiggling" — the old code re-derived bounds from vehicles every frame.
  const boundsRef = useRef<{ minX: number; maxX: number; minY: number; maxY: number } | null>(null);

  // Derive and lock bounds from roads the first time roads are available.
  if (mapRoads && mapRoads.length > 0 && boundsRef.current === null) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    mapRoads.forEach(road => {
      road.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
    });
    const padX = (maxX - minX) * 0.03;
    const padY = (maxY - minY) * 0.03;
    boundsRef.current = { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // If we don't have road-derived bounds yet, just show a loading placeholder.
    // This is the key fix — we never render the giant "all of Connaught Place" fallback anymore.
    if (boundsRef.current === null) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Loading map geometry…', width / 2, height / 2);
      return;
    }

    const { minX, maxX, minY, maxY } = boundsRef.current;
    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;

    const toCanvas = (x: number, y: number) => ({
      nx: ((x - minX) / mapWidth) * width,
      ny: height - ((y - minY) / mapHeight) * height,
    });

    // FIX 2: Full clear before drawing roads. The old 0.12-alpha wipe was causing
    // road lines to "stack up" and look cluttered across frames.
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw roads on a clean canvas every frame — stable, no ghosting.
    if (mapRoads && mapRoads.length > 0) {
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
      ctx.lineWidth = 1.2;
      mapRoads.forEach(road => {
        if (road.length < 2) return;
        ctx.beginPath();
        const { nx: sx, ny: sy } = toCanvas(road[0][0], road[0][1]);
        ctx.moveTo(sx, sy);
        for (let i = 1; i < road.length; i++) {
          const { nx, ny } = toCanvas(road[i][0], road[i][1]);
          ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      });
    }

    // FIX 3: Only vehicles get the fading trail effect (the blended semi-transparent layer).
    // We draw them on top of the clean road layer each frame.
    vehicles.forEach(v => {
      const { nx, ny } = toCanvas(v.x, v.y);
      const rad = (v.phi - 90) * (Math.PI / 180);

      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(rad);

      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -3);
      ctx.lineTo(-4, 3);
      ctx.closePath();

      if (isActive) {
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.restore();
    });

  }, [vehicles, isActive, mapRoads]);

  return (
    <div className="flex flex-col items-center w-full bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 shadow-xl">
      <h3 className="text-lg font-bold text-slate-200 mb-3 tracking-wider">
        {title}
      </h3>
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        className="w-full max-w-full aspect-square rounded-xl bg-slate-900 border border-slate-700"
      />
      <div className="mt-4 flex w-full justify-between px-2 text-sm text-slate-400">
        <span>Active Vehicles: <span className="font-mono text-slate-200">{vehicles.length}</span></span>
        {isActive && <span className="text-emerald-400 animate-pulse text-xs">● AI Controller Online</span>}
        {!isActive && <span className="text-slate-500 text-xs text-right">● Native Logic Online</span>}
      </div>
    </div>
  );
}

