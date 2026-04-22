import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, NEUTRAL_AXIS, NEUTRAL_GRID, pickChartColor } from '@/lib/palette';

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

interface AIAbilityRadarProps {
  abilities: AIAbilityStats;
  color: string;
  name: string;
  size?: 'default' | 'sm';
}

export function AIAbilityRadar({ abilities, color, name, size = 'default' }: AIAbilityRadarProps) {
  const strokeColor = pickChartColor(color, CHART_COLORS.indigo);
  const data = (Object.keys(AXIS_LABELS) as (keyof AIAbilityStats)[]).map(key => ({
    axis: AXIS_LABELS[key],
    value: abilities[key],
    fullMark: 100,
  }));

  const sm = size === 'sm';

  return (
    <div className="w-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height={sm ? 130 : 160}>
        <RadarChart cx="50%" cy="50%" outerRadius="68%" data={data}>
          <PolarGrid
            stroke={NEUTRAL_GRID}
            strokeDasharray="2 3"
          />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: NEUTRAL_AXIS, fontSize: sm ? 7 : 9, fontWeight: 500 }}
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
