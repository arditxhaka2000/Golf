// Golf.Frontend/src/components/HandicapTrendChart.tsx
// Working implementation of handicap trend visualization

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Round {
    id: string;
    datePlayed: string;
    course: {
        name: string;
    };
    totalStrokes: number;
    grossScore: number;
    netScore: number;
    handicapDifferential: number;
}

interface TrendPoint {
    date: string;
    handicap: number;
    roundsCount: number;
    differential: number;
    isProjected?: boolean;
}

interface HandicapTrendChartProps {
    rounds: Round[];
    currentHandicap: number;
    isMobile?: boolean;
}

export function HandicapTrendChart({ rounds, currentHandicap, isMobile = false }: HandicapTrendChartProps) {

    // Calculate handicap progression over time
    const trendData = useMemo(() => {
        if (rounds.length === 0) return [];

        const sortedRounds = [...rounds].sort((a, b) =>
            new Date(a.datePlayed).getTime() - new Date(b.datePlayed).getTime()
        );

        const trendPoints: TrendPoint[] = [];

        // Calculate rolling handicap after each round
        sortedRounds.forEach((round, index) => {
            // Get all rounds up to this point
            const roundsToDate = sortedRounds.slice(0, index + 1);

            // Calculate handicap using best differentials available
            if (roundsToDate.length >= 5) {
                const sortedDiffs = [...roundsToDate]
                    .sort((a, b) => a.handicapDifferential - b.handicapDifferential);

                const numToUse = Math.min(8, Math.max(1, roundsToDate.length - 2));
                const bestDiffs = sortedDiffs.slice(0, numToUse);
                const avgDiff = bestDiffs.reduce((sum, r) => sum + r.handicapDifferential, 0) / bestDiffs.length;

                trendPoints.push({
                    date: round.datePlayed,
                    handicap: parseFloat(avgDiff.toFixed(1)),
                    roundsCount: roundsToDate.length,
                    differential: round.handicapDifferential
                });
            }
        });

        return trendPoints;
    }, [rounds]);

    // Calculate trend statistics
    const trendStats = useMemo(() => {
        if (trendData.length < 2) return null;

        const firstHandicap = trendData[0].handicap;
        const lastHandicap = trendData[trendData.length - 1].handicap;
        const change = lastHandicap - firstHandicap;
        const changePercentage = (change / Math.abs(firstHandicap)) * 100;

        const trend = change < -0.5 ? 'improving' : change > 0.5 ? 'declining' : 'stable';

        return {
            change: parseFloat(change.toFixed(1)),
            changePercentage: parseFloat(changePercentage.toFixed(1)),
            trend,
            timeSpan: calculateTimeSpan(trendData[0].date, trendData[trendData.length - 1].date)
        };
    }, [trendData]);

    // Simple SVG chart implementation
    const renderChart = () => {
        if (trendData.length === 0) {
            return (
                <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <div className={isMobile ? 'text-sm' : 'text-base'}>📈 No trend data yet</div>
                        <div className={isMobile ? 'text-xs' : 'text-sm'}>
                            Need at least 5 rounds to show handicap progression
                        </div>
                    </div>
                </div>
            );
        }

        const chartWidth = isMobile ? 280 : 400;
        const chartHeight = 160;
        const padding = 40;
        const plotWidth = chartWidth - (padding * 2);
        const plotHeight = chartHeight - (padding * 2);

        // Find min/max values for scaling
        const handicaps = trendData.map(d => d.handicap);
        const minHandicap = Math.min(...handicaps);
        const maxHandicap = Math.max(...handicaps);
        const handicapRange = maxHandicap - minHandicap || 1;
        const paddingRange = handicapRange * 0.1;

        // Scale functions
        const xScale = (index: number) => (index / (trendData.length - 1)) * plotWidth + padding;
        const yScale = (handicap: number) =>
            chartHeight - padding - ((handicap - minHandicap + paddingRange) / (handicapRange + paddingRange * 2)) * plotHeight;

        // Generate path for the line
        const pathData = trendData.map((point, index) =>
            `${index === 0 ? 'M' : 'L'} ${xScale(index)} ${yScale(point.handicap)}`
        ).join(' ');

        return (
            <div className="relative">
                <svg width={chartWidth} height={chartHeight} className="border rounded">
                    {/* Grid lines */}
                    <defs>
                        <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Y-axis labels */}
                    {[minHandicap, (minHandicap + maxHandicap) / 2, maxHandicap].map((value, index) => (
                        <g key={index}>
                            <text
                                x={padding - 10}
                                y={yScale(value) + 4}
                                textAnchor="end"
                                className="text-xs fill-gray-600"
                            >
                                {value.toFixed(1)}
                            </text>
                            <line
                                x1={padding}
                                y1={yScale(value)}
                                x2={chartWidth - padding}
                                y2={yScale(value)}
                                stroke="#d1d5db"
                                strokeWidth="1"
                                strokeDasharray="2,2"
                            />
                        </g>
                    ))}

                    {/* Trend line */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        className="drop-shadow-sm"
                    />

                    {/* Data points */}
                    {trendData.map((point, index) => (
                        <g key={index}>
                            <circle
                                cx={xScale(index)}
                                cy={yScale(point.handicap)}
                                r="4"
                                fill="#3b82f6"
                                stroke="white"
                                strokeWidth="2"
                                className="drop-shadow-sm hover:r-6 transition-all cursor-pointer"
                            />
                            {/* Tooltip on hover - you could implement this with a library */}
                        </g>
                    ))}

                    {/* X-axis labels (dates) */}
                    {trendData.map((point, index) => {
                        if (index % Math.ceil(trendData.length / 4) === 0 || index === trendData.length - 1) {
                            return (
                                <text
                                    key={index}
                                    x={xScale(index)}
                                    y={chartHeight - 10}
                                    textAnchor="middle"
                                    className="text-xs fill-gray-600"
                                >
                                    {formatDateForChart(point.date)}
                                </text>
                            );
                        }
                        return null;
                    })}
                </svg>

                {/* Chart annotations */}
                <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-blue-600"></div>
                        <span>Handicap Progression</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className={`flex items-center justify-between ${isMobile ? 'text-lg' : 'text-xl'}`}>
                    <span>Handicap Trend</span>
                    {trendStats && (
                        <span className={`text-sm font-normal ${trendStats.trend === 'improving' ? 'text-green-600' :
                                trendStats.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                            {trendStats.trend === 'improving' && '📉 Improving'}
                            {trendStats.trend === 'declining' && '📈 Rising'}
                            {trendStats.trend === 'stable' && '📊 Stable'}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {renderChart()}

                {/* Trend Statistics */}
                {trendStats && (
                    <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <div className={`font-bold ${isMobile ? 'text-base' : 'text-lg'} ${trendStats.change < 0 ? 'text-green-600' :
                                    trendStats.change > 0 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                {trendStats.change > 0 ? '+' : ''}{trendStats.change}
                            </div>
                            <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                Overall Change
                            </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                            <div className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                                {trendData.length}
                            </div>
                            <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                Data Points
                            </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                            <div className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                                {trendStats.timeSpan}
                            </div>
                            <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                Time Period
                            </div>
                        </div>
                    </div>
                )}

                {/* Insights */}
                {trendStats && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className={`font-medium text-blue-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                            Trend Analysis
                        </div>
                        <div className={`text-blue-800 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {trendStats.trend === 'improving' &&
                                `Great progress! Your handicap has improved by ${Math.abs(trendStats.change)} strokes over ${trendStats.timeSpan}. Keep up the excellent work!`
                            }
                            {trendStats.trend === 'declining' &&
                                `Your handicap has increased by ${trendStats.change} strokes over ${trendStats.timeSpan}. Consider focusing on consistency and course management.`
                            }
                            {trendStats.trend === 'stable' &&
                                `Your handicap has remained stable over ${trendStats.timeSpan}. This shows consistent play - now work on breaking through to the next level!`
                            }
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Helper functions
function calculateTimeSpan(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.round(diffDays / 30)} months`;
    return `${Math.round(diffDays / 365)} years`;
}

function formatDateForChart(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Simple trend chart component for mobile
export function SimpleTrendChart({ rounds, currentHandicap }: { rounds: Round[], currentHandicap: number }) {
    const lastFiveRounds = rounds.slice(0, 5);
    const trend = lastFiveRounds.length >= 2 ?
        (lastFiveRounds[0].handicapDifferential < lastFiveRounds[lastFiveRounds.length - 1].handicapDifferential ? 'up' : 'down') : 'stable';

    return (
        <div className="flex items-center gap-2 text-sm">
            <span>Recent trend:</span>
            <span className={`flex items-center gap-1 ${trend === 'down' ? 'text-green-600' : trend === 'up' ? 'text-red-600' : 'text-gray-600'
                }`}>
                {trend === 'down' && '📉 Improving'}
                {trend === 'up' && '📈 Rising'}
                {trend === 'stable' && '📊 Stable'}
            </span>
        </div>
    );
}