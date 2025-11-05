import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface TrustScoreGaugeProps {
  score: number; // 0 - 100
  size?: number; // px, default 200
  strokeWidth?: number; // px, default 14
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

const TrustScoreGauge: React.FC<TrustScoreGaugeProps> = ({
  score,
  size = 200,
  strokeWidth = 14
}) => {
  const s = clamp(score);
  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const center = useMemo(() => size / 2, [size]);

  const color = useMemo(() => {
    if (s > 75) return "#22c55e"; // green-500
    if (s >= 40) return "#eab308"; // yellow-500
    return "#ef4444"; // red-500
  }, [s]);

  const offsetForScore = (value: number) => circumference * (1 - value / 100);

  return (
    <div
      style={{ width: size, height: size }}
      className="relative select-none"
      aria-label={`Trust score ${s}`}
      role="img"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        className="block">
        {/* Background circle (track) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
        />

        {/* Foreground circle (animated progress) */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            filter: `drop-shadow(0 0 8px ${color}80) drop-shadow(0 0 16px ${color}55)`
          }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offsetForScore(s) }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>

      {/* Centered score text */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            {Math.round(s)}
          </div>
          <div className="text-xs uppercase tracking-widest text-gray-300 mt-1">Trust Score</div>
        </div>
      </div>
    </div>
  );
};

export default TrustScoreGauge;
