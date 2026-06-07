"use client";

export type WeightPoint = { date: string; weight: number };

/**
 * Lightweight dependency-free SVG line chart of weight over time, with an
 * optional dashed target line. Scales to its container width.
 */
export default function WeightChart({
  points,
  target,
}: {
  points: WeightPoint[];
  target?: number | null;
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-stone-300 text-sm text-stone-500">
        Log your weight to see your trend.
      </div>
    );
  }

  const W = 640;
  const H = 220;
  const pad = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const weights = points.map((p) => p.weight);
  const candidates = [...weights, ...(target != null ? [target] : [])];
  let min = Math.min(...candidates);
  let max = Math.max(...candidates);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = max - min;
  // Pad the y-range by 8% for breathing room.
  min -= range * 0.08;
  max += range * 0.08;

  const n = points.length;
  const x = (i: number) => pad.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (w: number) => pad.top + (1 - (w - min) / (max - min)) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.weight).toFixed(1)}`)
    .join(" ");

  const areaPath =
    `${linePath} L ${x(n - 1).toFixed(1)} ${(pad.top + innerH).toFixed(1)} ` +
    `L ${x(0).toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;

  const yTicks = [min, (min + max) / 2, max];
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-56 w-full"
        role="img"
        aria-label="Weight trend chart"
      >
        {/* gridlines + y labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(t)}
              y2={y(t)}
              stroke="#e7e5e4"
              strokeWidth={1}
            />
            <text x={4} y={y(t) + 4} fontSize={10} fill="#a8a29e">
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        {/* target line */}
        {target != null && target >= min && target <= max && (
          <g>
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(target)}
              y2={y(target)}
              stroke="#16a34a"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text
              x={W - pad.right}
              y={y(target) - 5}
              fontSize={10}
              fill="#16a34a"
              textAnchor="end"
            >
              target {target}
            </text>
          </g>
        )}

        <path d={areaPath} fill="#16a34a" fillOpacity={0.08} />
        <path
          d={linePath}
          fill="none"
          stroke="#16a34a"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.weight)} r={3} fill="#15803d" />
        ))}

        {/* x labels: first and last */}
        <text x={pad.left} y={H - 8} fontSize={10} fill="#a8a29e">
          {fmtDate(points[0].date)}
        </text>
        {n > 1 && (
          <text
            x={W - pad.right}
            y={H - 8}
            fontSize={10}
            fill="#a8a29e"
            textAnchor="end"
          >
            {fmtDate(points[n - 1].date)}
          </text>
        )}
      </svg>
    </div>
  );
}
