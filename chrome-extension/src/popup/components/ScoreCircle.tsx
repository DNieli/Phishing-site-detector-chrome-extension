import { useId } from "react";

interface ScoreCircleProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  tone?: "safe" | "warning" | "danger";
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({
  score,
  size = 168,
  strokeWidth = 12,
  tone = "safe",
}) => {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference - (clamped / 100) * circumference;
  const toneColors = {
    safe: { start: "#67e8f9", end: "#2563eb" },
    warning: { start: "#93c5fd", end: "#1d4ed8" },
    danger: { start: "#60a5fa", end: "#1e3a8a" },
  };
  const colors = toneColors[tone];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.start} />
          <stop offset="100%" stopColor={colors.end} />
        </linearGradient>
      </defs>

      <circle
        fill="#071a34"
        r={(size - 6) / 2}
        cx={size / 2}
        cy={size / 2}
      />

      <circle
        stroke="rgba(148, 163, 184, 0.18)"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />

      <circle
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.4s ease" }}
      />

      <text
        x="50%"
        y="45%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size / 4.2}
        fontWeight="700"
        fill="#f8fafc"
      >
        {clamped}
      </text>

      <text
        x="50%"
        y="70%"
        textAnchor="middle"
        fontSize={size / 13}
        letterSpacing="2.4"
        fill="rgba(148, 163, 184, 0.88)"
      >
        RISK SCORE
      </text>
    </svg>
  );
};
