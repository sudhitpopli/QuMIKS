import { useEffect, useRef, useState, type ReactNode } from 'react';

// --- ScrollReveal ---
const ScrollReveal = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-700 ease-out ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>{children}</div>;
};

// --- Shared helpers ---
const Badge = ({ children }: { children: ReactNode }) => <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-4">{children}</span>;
const H2 = ({ children }: { children: ReactNode }) => <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4 leading-tight">{children}</h2>;
const Prose = ({ children, className = '' }: { children: ReactNode; className?: string }) => <p className={`text-slate-300 text-lg leading-relaxed ${className}`}>{children}</p>;

// SIMULATION 1 - Indian Fixed-Time Intersection
const IndianIntersectionSim = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const CX = W / 2, CY = H / 2;
    const ROAD_W = 40;
    const RED = 180, GREEN = 90;

    const cars = [
      { x: CX - ROAD_W / 4, y: 40, dx: 0, dy: 1, arm: 'N', waiting: true, passed: false },
      { x: CX - ROAD_W / 4 - 22, y: 40, dx: 0, dy: 1, arm: 'N2', waiting: true, passed: false },
      { x: CX - ROAD_W / 4 - 44, y: 40, dx: 0, dy: 1, arm: 'N3', waiting: true, passed: false },
      { x: CX + ROAD_W / 4, y: H - 40, dx: 0, dy: -1, arm: 'S', waiting: true, passed: false },
      { x: CX + ROAD_W / 4 + 22, y: H - 40, dx: 0, dy: -1, arm: 'S2', waiting: true, passed: false },
      { x: 40, y: CY + ROAD_W / 4, dx: 1, dy: 0, arm: 'W', waiting: false, passed: false },
      { x: H - 40, y: CY - ROAD_W / 4, dx: -1, dy: 0, arm: 'E', waiting: false, passed: false },
    ];

    let tick = 0;
    let raf: number;
    const STOP_N = CY - ROAD_W - 14;
    const STOP_S = CY + ROAD_W + 14;
    const STOP_W = CX - ROAD_W - 14;
    const STOP_E = CX + ROAD_W + 14;

    const drawRoad = () => {
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#334155'; ctx.fillRect(0, CY - ROAD_W, W, ROAD_W * 2);
      ctx.fillStyle = '#334155'; ctx.fillRect(CX - ROAD_W, 0, ROAD_W * 2, H);
      ctx.setLineDash([12, 8]); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, CY); ctx.lineTo(W, CY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX, 0); ctx.lineTo(CX, H); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(CX - ROAD_W, STOP_N); ctx.lineTo(CX, STOP_N); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX, STOP_S); ctx.lineTo(CX + ROAD_W, STOP_S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(STOP_W, CY - ROAD_W); ctx.lineTo(STOP_W, CY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(STOP_E, CY); ctx.lineTo(STOP_E, CY + ROAD_W); ctx.stroke();
    };

    const drawLight = (x: number, y: number, isRed: boolean) => {
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.roundRect(x - 8, y - 18, 16, 36, 3); ctx.fill();
      ctx.shadowColor = isRed ? '#ef4444' : '#22c55e';
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(x, y - 9, 5, 0, Math.PI * 2); ctx.fillStyle = isRed ? '#ef4444' : '#1e293b'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y + 9, 5, 0, Math.PI * 2); ctx.fillStyle = isRed ? '#1e293b' : '#22c55e'; ctx.fill();
      ctx.shadowBlur = 0;
    };

    const drawCar = (x: number, y: number, dir: 'h' | 'v', color: string) => {
      ctx.save(); ctx.translate(x, y);
      if (dir === 'h') ctx.rotate(0); else ctx.rotate(Math.PI / 2);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(-10, -5, 20, 10, 2); ctx.fill();
      ctx.fillStyle = '#bae6fd'; ctx.beginPath(); ctx.roundRect(-5, -5, 10, 5, 1); ctx.fill();
      ctx.fillStyle = '#0f172a'; [-7, 7].forEach(wx => { ctx.beginPath(); ctx.arc(wx, 5, 3, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
    };

    const draw = () => {
      tick++;
      const phase = tick % (RED + GREEN);
      const isNSRed = phase < RED;
      const isEWRed = !isNSRed;
      drawRoad();
      drawLight(CX - ROAD_W - 5, CY - ROAD_W - 5, isNSRed);
      drawLight(CX + ROAD_W + 5, CY + ROAD_W + 5, isNSRed);
      drawLight(CX + ROAD_W + 5, CY - ROAD_W - 5, isEWRed);
      drawLight(CX - ROAD_W - 5, CY + ROAD_W + 5, isEWRed);
      cars.forEach(car => {
        if (car.passed) {
          car.x += car.dx * 1.6; car.y += car.dy * 1.6;
          if (car.x < -20 || car.x > W + 20 || car.y < -20 || car.y > H + 20) {
            car.passed = false; car.waiting = true;
            if (car.arm.startsWith('N')) { car.x = CX - ROAD_W / 4 - (car.arm === 'N2' ? 22 : car.arm === 'N3' ? 44 : 0); car.y = 40; }
            if (car.arm.startsWith('S')) { car.x = CX + ROAD_W / 4 + (car.arm === 'S2' ? 22 : 0); car.y = H - 40; }
            if (car.arm === 'W') { car.x = 40; car.y = CY + ROAD_W / 4; }
            if (car.arm === 'E') { car.x = W - 40; car.y = CY - ROAD_W / 4; }
          }
          return;
        }
        const ns = car.arm.startsWith('N') || car.arm.startsWith('S');
        const blocked = ns ? isNSRed : isEWRed;
        const stopY = car.arm.startsWith('N') ? STOP_N : STOP_S;
        const stopX = car.arm === 'W' ? STOP_W : STOP_E;
        if (blocked) {
          if (ns) car.y = Math.min(Math.max(car.y, stopY - 80), car.dy > 0 ? stopY : H);
          else car.x = Math.min(Math.max(car.x, stopX - 80), car.dx > 0 ? stopX : W);
          if ((ns && Math.abs(car.y - stopY) > 2) || (!ns && Math.abs(car.x - stopX) > 2)) { car.x += car.dx * 1.2; car.y += car.dy * 1.2; }
        } else {
          car.x += car.dx * 1.8; car.y += car.dy * 1.8;
          if (car.dx !== 0 && Math.abs(car.x - CX) < 5) car.passed = true;
          if (car.dy !== 0 && Math.abs(car.y - CY) < 5) car.passed = true;
        }
      });
      cars.forEach(c => drawCar(c.x, c.y, c.dx !== 0 ? 'h' : 'v', c.arm.includes('N') || c.arm.includes('S') ? '#f59e0b' : '#60a5fa'));
      ctx.fillStyle = '#0f172a'; ctx.fillRect(8, 8, 220, 44); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.strokeRect(8, 8, 220, 44);
      ctx.fillStyle = '#fca5a5'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`Fixed Timer`, 16, 26);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`NS: ${isNSRed ? `RED` : 'GREEN'} | EW: ${isEWRed ? 'RED' : 'GREEN'}`, 16, 44);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} width={520} height={440} className="w-full rounded-2xl border border-slate-700 bg-slate-900" />;
};

// SIMULATION 2 - AI-coordinated green wave
const AIIntersectionSim = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const CX = W / 2, CY = H / 2, ROAD_W = 40;
    const cars = [
      { x: CX - ROAD_W / 4, y: 40, dx: 0, dy: 1, arm: 'N' },
      { x: CX + ROAD_W / 4, y: H - 40, dx: 0, dy: -1, arm: 'S' },
      { x: 40, y: CY + ROAD_W / 4, dx: 1, dy: 0, arm: 'W' },
      { x: W - 40, y: CY - ROAD_W / 4, dx: -1, dy: 0, arm: 'E' },
    ];
    let tick = 0, raf: number;
    const draw = () => {
      tick++;
      const isNSGreen = Math.floor(tick / 40) % 2 === 0;
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#334155'; ctx.fillRect(0, CY - ROAD_W, W, ROAD_W * 2);
      ctx.fillStyle = '#334155'; ctx.fillRect(CX - ROAD_W, 0, ROAD_W * 2, H);
      cars.forEach(car => {
        const ns = car.arm.startsWith('N') || car.arm.startsWith('S');
        if (ns ? isNSGreen : !isNSGreen) { car.x += car.dx * 2; car.y += car.dy * 2; }
        if (car.x > W + 20) car.x = 40;
        if (car.x < -20) car.x = W - 40;
        if (car.y > H + 20) car.y = 40;
        if (car.y < -20) car.y = H - 40;
        ctx.save(); ctx.translate(car.x, car.y);
        if (car.dx === 0) ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.roundRect(-10, -5, 20, 10, 2); ctx.fill();
        ctx.restore();
      });
      ctx.fillStyle = '#0f172a'; ctx.fillRect(8, 8, 240, 44); ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1; ctx.strokeRect(8, 8, 240, 44);
      ctx.fillStyle = '#86efac'; ctx.font = 'bold 11px monospace'; ctx.fillText('AI-Adaptive Timing', 16, 26);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} width={520} height={440} className="w-full rounded-2xl border border-slate-700 bg-slate-900" />;
};

// ML Gradient Descent Simulation
const MLGradientSim = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lr, setLr] = useState(0.3);
  const ballRef = useRef({ x: 50 });
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    let raf: number;
    const getY = (x: number) => 0.7 * Math.pow(x / W - 0.5, 2) * H + 40;
    const draw = () => {
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#10b981'; ctx.lineWidth = 3; ctx.beginPath();
      for (let x = 0; x <= W; x++) { if (x === 0) ctx.moveTo(x, getY(x)); else ctx.lineTo(x, getY(x)); }
      ctx.stroke();
      const bX = ballRef.current.x;
      const slope = (getY(bX + 1) - getY(bX - 1));
      ballRef.current.x += -slope * lr * 2;
      ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(bX, getY(bX), 8, 0, Math.PI * 2); ctx.fill();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [lr]);
  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4">
      <canvas ref={canvasRef} width={640} height={200} className="w-full mb-4" />
      <input type="range" min={0.05} max={0.9} step={0.05} value={lr} onChange={e => { setLr(+e.target.value); ballRef.current.x = 50; }} className="w-full accent-cyan-400" />
      <p className="text-xs text-slate-500 mt-2 font-mono">Roll the ball to the bottom by adjusting "Learning Rate".</p>
    </div>
  );
};

// ANN Deep Simulation
const ANNDeepSim = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    let tick = 0, raf: number;
    const draw = () => {
      tick++;
      ctx.fillStyle = '#0a0f1a'; ctx.fillRect(0, 0, W, H);
      const pulse = (tick % 60) / 60;
      ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(100, 100); ctx.lineTo(300, 100); ctx.stroke();
      ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(100 + 200 * pulse, 100, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(100, 100, 20, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(300, 100, 20, 0, Math.PI * 2); ctx.fill();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
      <canvas ref={canvasRef} width={680} height={200} className="w-full" />
      <button onClick={() => setRunning(!running)} className="m-4 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold uppercase text-xs">
        {running ? "Stop" : "Start Training"}
      </button>
    </div>
  );
};

// RL Car Simulation
const RLCarSim = () => {
  const [step, setStep] = useState(0);
  const [reward, setReward] = useState(0);
  const act = (choice: string) => {
    if (choice === 'brake') setReward(r => r + 1);
    setStep(s => (s + 1) % 4);
  };
  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
      <div className="h-12 bg-slate-700 rounded mb-4 flex items-center px-4">
        <div className="text-2xl transition-all" style={{ marginLeft: `${step * 25}%` }}>🚗</div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => act('gas')} className="flex-1 py-2 bg-emerald-600/20 text-emerald-400 rounded border border-emerald-600/30 font-bold">Gas</button>
        <button onClick={() => act('brake')} className="flex-1 py-2 bg-amber-600/20 text-amber-400 rounded border border-amber-600/30 font-bold">Brake</button>
      </div>
      <div className="mt-4 font-mono text-xs text-slate-500">Reward: {reward}</div>
    </div>
  );
};

// MARL Intersection Simulation
const MARLIntersectionSim = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    let tick = 0, raf: number;
    const draw = () => {
      tick++; ctx.fillStyle = '#0a0f1a'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#10b981'; ctx.font = 'bold 10px monospace';
      ctx.fillText(`Agent 1 telling Agent 2 about incoming wave...`, 10, 20);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} width={640} height={100} className="w-full rounded-xl border border-slate-700 bg-slate-900" />;
};

// QMIX Flow Simulation
const QMIXFlowSim = () => {
  const [ph, setPh] = useState(0);
  const phases = ["Drive", "Observe", "ANN", "Mixer", "Reward", "Backprop"];
  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
      <div className="flex justify-between mb-6">
        {phases.map((p, i) => (
          <div key={p} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${i <= ph ? 'bg-emerald-500 text-slate-900 border-emerald-400' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>{i+1}</div>
        ))}
      </div>
      <div className="text-white font-bold mb-2">{phases[ph]} Phase</div>
      <p className="text-slate-400 text-sm mb-4">Step-by-step processing of the QMIX architecture.</p>
      <button onClick={() => setPh((ph + 1) % 6)} className="px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold uppercase transition-all">Next Step</button>
    </div>
  );
};

// Results Scoreboard
const Scoreboard = () => {
  const data = [
    { name: "Indian Standard", val: -1.53, color: "#ef4444" },
    { name: "QMIX Our Model", val: -0.40, color: "#10b981" }
  ];
  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
      {data.map(d => (
        <div key={d.name} className="mb-4">
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
            <span>{d.name}</span>
            <span style={{ color: d.color }}>{d.val}</span>
          </div>
          <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-1000" style={{ width: `${(Math.abs(d.val) / 2) * 100}%`, backgroundColor: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// Main Export
export default function About() {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-24 py-12 px-4 bg-slate-900 text-slate-200 font-sans">
      <ScrollReveal>
        <div className="text-center">
          <Badge>SIH 2025 - QMIX v2.0</Badge>
          <H2>How Our AI Manages Traffic</H2>
          <Prose>A step-by-step guide to the future of urban mobility.</Prose>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div>
          <Badge>Problem</Badge>
          <H2>The Indian Traffic Problem</H2>
          <Prose className="mb-6">Fixed timers cause massive congestion. Our benchmark uses Webster's Method calculated according to IRC:93-1985 standards.</Prose>
          <IndianIntersectionSim />
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div>
          <Badge>Solution</Badge>
          <H2>AI-Adaptive Coordination</H2>
          <Prose className="mb-6">Our model doesn't just watch; it remembers trends using GRU cells and communicates across intersections.</Prose>
          <AIIntersectionSim />
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div>
          <Badge>ML Basics</Badge>
          <H2>Learning from Mistakes</H2>
          <Prose className="mb-6">Machine learning is gradient descent - finding the lowest loss by nudging weights.</Prose>
          <MLGradientSim />
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div>
          <Badge>Networks</Badge>
          <H2>Neural Architecture</H2>
          <Prose className="mb-6">Data flows forward to predict, and errors flow backward to improve.</Prose>
          <ANNDeepSim />
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div>
          <Badge>Training</Badge>
          <H2>Reinforcement Learning</H2>
          <Prose className="mb-6">The agent learns through trial and error, getting rewards for fluid traffic and penalties for jams.</Prose>
          <RLCarSim />
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div>
          <Badge>Coordination</Badge>
          <H2>Multi-Agent Systems (MARL)</H2>
          <Prose className="mb-6">Agents tell each other about incoming traffic waves to synchronize lights city-wide.</Prose>
          <MARLIntersectionSim />
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div>
          <Badge>QMIX</Badge>
          <H2>The QMIX Pipeline</H2>
          <QMIXFlowSim />
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div>
          <Badge>Performance</Badge>
          <H2>Our Results</H2>
          <Prose className="mb-6">Our model is 3.8x better than the benchmark standard.</Prose>
          <Scoreboard />
        </div>
      </ScrollReveal>
    </div>
  );
}