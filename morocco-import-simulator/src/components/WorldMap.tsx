import { useEffect, useMemo, useState } from 'react';
import type { Supplier } from '../engine/types';

// Carte schématique (projection équirectangulaire, viewBox 1000×500). Contours volontairement simplifiés.
const P = (lon: number, lat: number): [number, number] => [((lon + 180) / 360) * 1000, ((90 - lat) / 180) * 500];

const AFRICA = [[-17,21],[-16,14],[-13,8],[-8,4.5],[-3,5],[5,6],[9,4],[9.5,-1],[13,-6],[12,-17],[15,-27],[18,-34.5],[25,-34],[33,-28],[35,-22],[40,-15],[40,-10],[39,-4],[43,0],[51,11],[44,11],[43,13],[39,16],[37,21],[35,24],[32,30],[25,31.5],[20,32],[11,33],[10,37],[3,36.8],[-2,35.2],[-5.9,35.8],[-9,32.5],[-10,29],[-13,27.5],[-17,21]];
const EURASIA = [[-9,37],[-9,43],[-2,43.5],[-1.5,46],[-4.5,48.5],[2,51],[5,53.5],[8,54],[8.5,57],[11,59],[5,62],[14,68],[25,71],[40,68],[60,69],[80,73],[110,76],[140,72],[180,69],[180,62],[163,60],[156,51],[142,47],[135,43],[129,35],[126,37.5],[122,40],[118,38],[122,32],[120,26],[110,21],[106,17],[109,12],[104,10],[100,13.5],[100,8],[103.5,1.3],[98,8],[98,16],[94,17],[91,22.5],[86,20],[80,15],[77,8],[73,16],[72.5,21],[67,25],[61,25],[57,26],[56,27],[50,30],[48,30],[50,26.5],[51.5,25],[56,26],[57,23],[59,22],[55,17],[52,16],[43,12.6],[42.5,15],[39,21],[35,28],[34.5,29.5],[34,31],[35,33],[36,36],[30,36.5],[27,37],[26,40],[29,41],[27,40.5],[24,40],[22.5,37],[21,38.5],[19.5,40],[19,42],[15,45],[13.5,45.5],[12.5,44],[15.5,41],[16,38],[15.6,40],[12,42],[10,44],[7,43.7],[3.5,43.3],[3,42],[0.5,40.5],[-0.3,39.5],[-0.7,37.6],[-2,36.7],[-5.6,36],[-6.5,36.9],[-9,37]];
const UK = [[-5.5,50],[1.5,51],[0,53.5],[-2,56],[-5,58.5],[-6,56],[-3,54.5],[-5,52],[-5.5,50]];
const SOUTH_AMERICA = [[-80,9],[-77,-2],[-81,-5],[-76,-14],[-70,-18],[-71,-30],[-73,-42],[-75,-52],[-68,-55],[-65,-47],[-58,-38],[-53,-34],[-48,-28],[-45,-23.5],[-41,-22],[-39,-13],[-35,-8],[-35,-5],[-44,-2],[-50,0],[-52,4],[-60,8],[-62,10.5],[-72,12],[-77,9],[-80,9]];
const SRILANKA = [[80,6],[81.8,7],[80.3,9.8],[79.7,8],[80,6]];

const path = (pts: number[][]) => 'M' + pts.map(([lo, la]) => P(lo, la).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z';

function along(route: [number, number][], t: number): [number, number] {
  const seg = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let d = t * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) {
      const k = seg[i] ? d / seg[i] : 0;
      return [route[i][0] + (route[i + 1][0] - route[i][0]) * k, route[i][1] + (route[i + 1][1] - route[i][1]) * k];
    }
    d -= seg[i];
  }
  return route[route.length - 1];
}

export const CASABLANCA = P(-7.6, 33.6);

export default function WorldMap({ supplier, animate = true, onDone, startDay = 0 }: { supplier?: Supplier; animate?: boolean; onDone?: () => void; startDay?: number }) {
  const [t, setT] = useState(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    let raf = 0;
    const t0 = performance.now();
    const dur = 4500 + (supplier?.transitDays ?? 5) * 60;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      setT(k);
      if (k < 1) raf = requestAnimationFrame(tick);
      else onDone?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, supplier?.id]);

  const route = supplier?.route ?? [];
  const vb = useMemo(() => {
    if (!route.length) return '380 90 520 220';
    const xs = route.map((p) => p[0]), ys = route.map((p) => p[1]);
    const minX = Math.min(...xs, CASABLANCA[0]) - 40, maxX = Math.max(...xs) + 40;
    const minY = Math.min(...ys) - 40, maxY = Math.max(...ys) + 40;
    const w = Math.max(maxX - minX, 160), h = Math.max(maxY - minY, w * 0.45);
    return `${minX} ${minY} ${w} ${h}`;
  }, [route]);
  const scale = Number(vb.split(' ')[2]) / 1000;
  const ship = route.length ? along(route, t) : CASABLANCA;
  const day = supplier ? Math.round(startDay + t * supplier.transitDays) : startDay;

  return (
    <div className="relative rounded-xl overflow-hidden border border-ink-600 bg-[#0b2a45]">
      <svg viewBox={vb} className="w-full h-auto block" role="img" aria-label="Carte schématique de l'itinéraire maritime">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#1d4a6e" strokeWidth={0.4} />
          </pattern>
        </defs>
        <rect x="0" y="0" width="1000" height="500" fill="url(#grid)" />
        {[AFRICA, EURASIA, UK, SRILANKA, SOUTH_AMERICA].map((c, i) => (
          <path key={i} d={path(c)} fill="#2c4a3a" stroke="#4f7d62" strokeWidth={0.8 * scale + 0.2} />
        ))}
        {route.length > 0 && (
          <>
            <polyline points={route.map((p) => p.join(',')).join(' ')} fill="none" stroke="#e9c46a" strokeOpacity={0.35} strokeWidth={3 * scale + 0.6} strokeDasharray={`${8 * scale + 1} ${6 * scale + 1}`} />
            <polyline points={route.slice(0, 1).concat(route.filter((_, i) => i / (route.length - 1) <= t)).concat([ship]).map((p) => p.join(',')).join(' ')} fill="none" stroke="#e9c46a" strokeWidth={3 * scale + 0.6} />
            <circle cx={route[0][0]} cy={route[0][1]} r={5 * scale + 1.5} fill="#3b9ad6" />
            <text x={route[0][0] + 6 * scale + 2} y={route[0][1] - 4 * scale - 1} fontSize={16 * scale + 3} fill="#cfe7f7">{supplier?.port}</text>
          </>
        )}
        <circle cx={CASABLANCA[0]} cy={CASABLANCA[1]} r={6 * scale + 1.5} fill="#c1440e" />
        <text x={CASABLANCA[0] - 10 * scale} y={CASABLANCA[1] + 22 * scale + 4} fontSize={16 * scale + 3} fill="#ffd9c7" textAnchor="end">Casablanca</text>
        <g transform={`translate(${ship[0]},${ship[1]})`}>
          <text fontSize={26 * scale + 6} textAnchor="middle" dominantBaseline="central" className="anim-bob">🚢</text>
        </g>
      </svg>
      {supplier && (
        <div className="absolute left-2 top-2 card px-3 py-2 text-xs space-y-0.5">
          <div className="font-semibold">{supplier.flag} {supplier.port} → 🇲🇦 Casablanca</div>
          <div>Jour : <b>J+{day}</b> · Transit {supplier.transitDays} j</div>
          <div>Progression : {Math.round(t * 100)} %</div>
        </div>
      )}
    </div>
  );
}
