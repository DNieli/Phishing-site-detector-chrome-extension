interface ScoreCircleProps {
    score: number; // value between 0 and 100
    size?: number;
    strokeWidth?: number;
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({
  score,
  size = 180,
  strokeWidth = 18
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference - (clamped / 100) * circumference;

  // choosing stroke color
  const strokeColour = `hsl(${25 - (clamped * 25) / 100}, 100%, 40%)`;

  return (
    <svg width={size} height={size}>
      <circle
        stroke="#eee"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />

      <circle
        stroke={strokeColour}
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
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size / 6}
        fontWeight="bold"
      >
        {clamped}
        <tspan fontSize={size / 12} fill="gray">/100</tspan>
      </text>
    </svg>
  );
};