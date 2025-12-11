'use client'

import { motion } from 'framer-motion'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPercent } from '@/lib/utils'
import { Gauge, TrendingUp, TrendingDown, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarginGaugeChartProps {
  currentMargin: number
  targetMargin?: number
  previousMargin?: number
}

export function MarginGaugeChart({
  currentMargin,
  targetMargin = 15,
  previousMargin
}: MarginGaugeChartProps) {
  // Clamp margin between 0 and 15 for display
  const displayMargin = Math.min(Math.max(currentMargin, 0), 15)
  const marginPercent = (displayMargin / 15) * 100

  // Calculate gauge data
  const gaugeData = [
    { name: 'current', value: marginPercent, color: 'current' },
    { name: 'remaining', value: 100 - marginPercent, color: 'remaining' }
  ]

  // Determine color based on margin
  const getMarginColor = (margin: number) => {
    if (margin >= 10) return '#10b981' // emerald - excellent
    if (margin >= 7) return '#22c55e' // green - target achieved
    if (margin >= 3) return '#eab308' // yellow - improvement needed
    return '#ef4444' // red - critical
  }

  const marginColor = getMarginColor(currentMargin)
  const isAboveTarget = currentMargin >= targetMargin
  const marginChange = previousMargin !== undefined ? currentMargin - previousMargin : null

  // Background segments for better gauge visualization
  // Scale is 0-15%, distribution based on ranges:
  // 0-3%: 3 points / 15 = 20%
  // 3-7%: 4 points / 15 = ~26.7%
  // 7-10%: 3 points / 15 = 20%
  // 10-15%: 5 points / 15 = ~33.3%
  const backgroundSegments = [
    { name: 'danger', value: 20, color: 'rgba(239, 68, 68, 0.1)' },       // 0-3%
    { name: 'warning', value: 26.6, color: 'rgba(245, 158, 11, 0.1)' },   // 3-7%
    { name: 'good', value: 20, color: 'rgba(34, 197, 94, 0.1)' },         // 7-10%
    { name: 'excellent', value: 33.4, color: 'rgba(16, 185, 129, 0.1)' }, // 10-15%
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-blue-500" />
            マージン率ゲージ
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            目標: {formatPercent(targetMargin)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* Background arc segments */}
                <Pie
                  data={backgroundSegments}
                  cx="50%"
                  cy="70%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="60%"
                  outerRadius="90%"
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {backgroundSegments.map((entry, index) => (
                    <Cell key={`bg-${index}`} fill={entry.color} />
                  ))}
                </Pie>

                {/* Main gauge arc */}
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="70%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="65%"
                  outerRadius="85%"
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1500}
                  animationBegin={300}
                >
                  <Cell fill={marginColor} />
                  <Cell fill="transparent" />
                </Pie>

                {/* Target indicator */}
                <Pie
                  data={[
                    { value: (targetMargin / 15) * 100 - 1 },
                    { value: 2 },
                    { value: 100 - (targetMargin / 15) * 100 - 1 }
                  ]}
                  cx="50%"
                  cy="70%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="55%"
                  outerRadius="95%"
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="transparent" />
                  <Cell fill="rgba(99, 102, 241, 0.8)" />
                  <Cell fill="transparent" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '20%' }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="text-center"
              >
                <p
                  className="text-4xl font-bold"
                  style={{ color: marginColor }}
                >
                  {formatPercent(currentMargin)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  現在のマージン率
                </p>

                {marginChange !== null && (
                  <div className={cn(
                    "flex items-center justify-center gap-1 mt-2 text-sm font-medium",
                    marginChange >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {marginChange >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>
                      {marginChange >= 0 ? '+' : ''}{marginChange.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">前月比</span>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Legend - Updated ranges */}
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">&lt;3%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">3-7%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">7-10%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">&gt;10%</span>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex justify-center mt-4">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
              isAboveTarget
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
            )}>
              <Target className="h-4 w-4" />
              {isAboveTarget ? '目標達成' : '目標未達'}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
