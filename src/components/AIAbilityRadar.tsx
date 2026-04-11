import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

export interface AIAbilityStats {
  coding: number;
  creativity: number;
  reasoning: number;
  math: number;
  multilingual: number;
  speed: number;
  costEfficiency: number;
  contextWindow: number;
}

const AXIS_LABELS: Record<keyof AIAbilityStats, string> = {
  coding: '코딩',
  creativity: '창의성',
  reasoning: '추론력',
  math: '수학',
  multilingual: '다국어',
  speed: '속도',
  costEfficiency: '비용효율',
  contextWindow: '토큰용량',
};

const COLOR_MAP: Record<string, string> = {
  blue: '#60a5fa',
  emerald: '#34d399',
  red: '#f87171',
  amber: '#fbbf24',
  purple: '#a78bfa',
  orange: '#fb923c',
  teal: '#2dd4bf',
  pink: '#f472b6',
  slate: '#94a3b8',
  green: '#4ade80',
  cyan: '#22d3ee',
  sky: '#38bdf8',
};

interface AIAbilityRadarProps {
  abilities: AIAbilityStats;
  color: string;
  name: string;
  size?: 'default' | 'sm';
}

export function AIAbilityRadar({ abilities, color, name, size = 'default' }: AIAbilityRadarProps) {
  const strokeColor = COLOR_MAP[color] || '#818cf8';
  const data = (Object.keys(AXIS_LABELS) as (keyof AIAbilityStats)[]).map(key => ({
    axis: AXIS_LABELS[key],
    value: abilities[key],
    fullMark: 100,
  }));

  const sm = size === 'sm';

  return (
    <div className="w-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height={sm ? 140 : 180}>
        <RadarChart cx="50%" cy="50%" outerRadius="68%" data={data}>
          <PolarGrid
            stroke="rgba(148,163,184,0.25)"
            strokeDasharray="2 3"
          />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: '#94a3b8', fontSize: sm ? 7 : 9, fontWeight: 500 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name={name}
            dataKey="value"
            stroke={strokeColor}
            fill={strokeColor}
            fillOpacity={0.15}
            strokeWidth={sm ? 1.5 : 2}
            dot={{ r: sm ? 2 : 2.5, fill: strokeColor, strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
