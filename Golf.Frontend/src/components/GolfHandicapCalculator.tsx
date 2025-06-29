// Golf.Frontend/src/components/GolfHandicapCalculator.tsx
// Enhanced mobile-responsive version with improved UX
// REQ 1-8: Mobile-optimized handicap calculator with enhanced features

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@apollo/client';
import { GET_MY_ROUNDS_QUERY, GET_MY_HANDICAP_QUERY } from '../graphql/queries';
import { HandicapTrendChart } from './HandicapTrendChart';

// Enhanced interface for round data
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

interface HandicapStats {
    totalRounds: number;
    countingRounds: number;
    averageScore: number;
    bestScore: number;
    averageDifferential: number;
    improvementTrend: 'improving' | 'stable' | 'declining';
}

export function GolfHandicapCalculator() {
    const { username } = useAuth();

    // UI state for mobile responsiveness
    const [isMobile, setIsMobile] = useState(false);
    const [viewMode, setViewMode] = useState<'summary' | 'details' | 'trends'>('summary');
    const [expandedRound, setExpandedRound] = useState<string | null>(null);
    const [filterPeriod, setFilterPeriod] = useState<'all' | '6months' | '3months' | '1month'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'score' | 'differential'>('date');

    // Fetch data
    const { data: roundsData, loading: roundsLoading, error: roundsError } = useQuery(GET_MY_ROUNDS_QUERY, {
        variables: {
            token: localStorage.getItem('token'),
            limit: 20
        },
        errorPolicy: 'ignore'
    });

    const { data: handicapData, loading: handicapLoading } = useQuery(GET_MY_HANDICAP_QUERY, {
        variables: { token: localStorage.getItem('token') }
    });

    const rounds: Round[] = roundsData?.myRounds || [];
    const currentHandicap = handicapData?.calculateMyHandicap || 0;

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Filter rounds based on selected period
    const filteredRounds = React.useMemo(() => {
        if (filterPeriod === 'all') return rounds;

        const now = new Date();
        const cutoffDate = new Date();

        switch (filterPeriod) {
            case '1month':
                cutoffDate.setMonth(now.getMonth() - 1);
                break;
            case '3months':
                cutoffDate.setMonth(now.getMonth() - 3);
                break;
            case '6months':
                cutoffDate.setMonth(now.getMonth() - 6);
                break;
        }

        return rounds.filter(round => new Date(round.datePlayed) >= cutoffDate);
    }, [rounds, filterPeriod]);

    // Sort rounds - FIXED: Create copy before sorting
    const sortedRounds = React.useMemo(() => {
        // Create a copy of the filtered rounds to avoid mutating the original array
        const roundsCopy = [...filteredRounds];

        switch (sortBy) {
            case 'date':
                return roundsCopy.sort((a, b) => new Date(b.datePlayed).getTime() - new Date(a.datePlayed).getTime());
            case 'score':
                return roundsCopy.sort((a, b) => a.totalStrokes - b.totalStrokes);
            case 'differential':
                return roundsCopy.sort((a, b) => a.handicapDifferential - b.handicapDifferential);
            default:
                return roundsCopy;
        }
    }, [filteredRounds, sortBy]);

    // Calculate which rounds are the best 8 (lowest handicap differentials)
    const best8Rounds = React.useMemo(() => {
        if (rounds.length === 0) return new Set();

        // Create a copy of the array before sorting to avoid the read-only error
        const roundsCopy = [...rounds];
        const sortedByDiff = roundsCopy.sort((a, b) => a.handicapDifferential - b.handicapDifferential);
        const best8 = sortedByDiff.slice(0, Math.min(8, rounds.length));
        return new Set(best8.map(r => r.id));
    }, [rounds]);

    // Enhanced statistics calculation
    const statistics: HandicapStats = React.useMemo(() => {
        if (rounds.length === 0) {
            return {
                totalRounds: 0,
                countingRounds: 0,
                averageScore: 0,
                bestScore: 0,
                averageDifferential: 0,
                improvementTrend: 'stable'
            };
        }

        const totalRounds = rounds.length;
        const countingRounds = Math.min(rounds.length, 8);
        const averageScore = rounds.reduce((sum, r) => sum + r.totalStrokes, 0) / rounds.length;
        const bestScore = Math.min(...rounds.map(r => r.totalStrokes));

        // Calculate trend (last 5 vs previous 5 rounds)
        let improvementTrend: 'improving' | 'stable' | 'declining' = 'stable';
        if (rounds.length >= 10) {
            // Create copies before slicing to avoid mutation
            const roundsCopy = [...rounds];
            const recent5 = roundsCopy.slice(0, 5);
            const previous5 = roundsCopy.slice(5, 10);
            const recentAvg = recent5.reduce((sum, r) => sum + r.handicapDifferential, 0) / 5;
            const previousAvg = previous5.reduce((sum, r) => sum + r.handicapDifferential, 0) / 5;

            if (recentAvg < previousAvg - 0.5) improvementTrend = 'improving';
            else if (recentAvg > previousAvg + 0.5) improvementTrend = 'declining';
        }

        // FIXED: Create a copy before sorting to avoid read-only array error
        const roundsCopy = [...rounds];
        const best8Diffs = roundsCopy
            .sort((a, b) => a.handicapDifferential - b.handicapDifferential)
            .slice(0, countingRounds)
            .map(r => r.handicapDifferential);

        const averageDifferential = best8Diffs.length > 0
            ? best8Diffs.reduce((sum, diff) => sum + diff, 0) / best8Diffs.length
            : 0;

        return {
            totalRounds,
            countingRounds,
            averageScore,
            bestScore,
            averageDifferential,
            improvementTrend
        };
    }, [rounds]);

    // Loading state
    if (roundsLoading || handicapLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <div className="text-lg">Loading handicap data...</div>
                </div>
            </div>
        );
    }

    // Mobile view mode selector
    const MobileViewSelector = () => (
        <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            <button
                onClick={() => setViewMode('summary')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'summary'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600'
                    }`}
            >
                📊 Summary
            </button>
            <button
                onClick={() => setViewMode('details')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'details'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600'
                    }`}
            >
                📋 Rounds
            </button>
            <button
                onClick={() => setViewMode('trends')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'trends'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600'
                    }`}
            >
                📈 Trends
            </button>
        </div>
    );

    // Enhanced current handicap display
    const HandicapDisplay = () => (
        <Card className="mb-6">
            <CardHeader className={isMobile ? 'pb-4' : ''}>
                <CardTitle className={`text-center ${isMobile ? 'text-lg' : 'text-xl'}`}>
                    Your Current Handicap Index
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center">
                    <div className={`font-bold text-blue-600 mb-2 ${isMobile ? 'text-3xl' : 'text-4xl'}`}>
                        {currentHandicap.toFixed(1)}
                    </div>
                    <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        {rounds.length === 0
                            ? 'No rounds recorded yet'
                            : `Based on ${statistics.countingRounds} of ${statistics.totalRounds} rounds`
                        }
                    </div>
                    {rounds.length > 0 && rounds.length < 5 && (
                        <div className={`text-orange-600 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            Need at least 5 rounds for official handicap calculation
                        </div>
                    )}

                    {/* Trend indicator */}
                    {statistics.improvementTrend !== 'stable' && (
                        <div className={`mt-2 flex items-center justify-center gap-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            <span className={`
                                ${statistics.improvementTrend === 'improving' ? 'text-green-600' : 'text-red-600'}
                            `}>
                                {statistics.improvementTrend === 'improving' ? '📈 Improving' : '📉 Declining'}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    // Mobile-optimized statistics cards
    const StatisticsGrid = () => (
        <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <Card>
                <CardContent className={`text-center ${isMobile ? 'p-3' : 'p-4'}`}>
                    <div className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                        {statistics.totalRounds}
                    </div>
                    <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        Total Rounds
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className={`text-center ${isMobile ? 'p-3' : 'p-4'}`}>
                    <div className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                        {statistics.countingRounds}
                    </div>
                    <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        Counting Rounds
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className={`text-center ${isMobile ? 'p-3' : 'p-4'}`}>
                    <div className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                        {statistics.averageScore > 0 ? statistics.averageScore.toFixed(1) : '0'}
                    </div>
                    <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        Avg Score
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className={`text-center ${isMobile ? 'p-3' : 'p-4'}`}>
                    <div className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                        {statistics.bestScore || '0'}
                    </div>
                    <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        Best Score
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    // Mobile-friendly filters
    const FilterControls = () => (
        <div className={`flex gap-2 mb-4 ${isMobile ? 'flex-col' : 'flex-row'}`}>
            <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
                <select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value as any)}
                    className={`border rounded px-3 py-2 text-sm ${isMobile ? 'flex-1' : ''}`}
                >
                    <option value="all">All Time</option>
                    <option value="6months">Last 6 Months</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="1month">Last Month</option>
                </select>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className={`border rounded px-3 py-2 text-sm ${isMobile ? 'flex-1' : ''}`}
                >
                    <option value="date">Sort by Date</option>
                    <option value="score">Sort by Score</option>
                    <option value="differential">Sort by Handicap Diff</option>
                </select>
            </div>
        </div>
    );

    // Mobile-optimized round list
    const RoundsList = () => {
        if (sortedRounds.length === 0) {
            return (
                <Card>
                    <CardContent className="text-center py-8">
                        <div className={`text-muted-foreground mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                            No rounds recorded yet
                        </div>
                        <div className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
                            Start by entering scores on the Score Calculator page to build your handicap history.
                        </div>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card>
                <CardHeader>
                    <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>
                        Round History ({sortedRounds.length} rounds)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isMobile ? (
                        // Mobile: Card-based layout
                        <div className="space-y-3">
                            {sortedRounds.map((round) => {
                                const isBest8 = best8Rounds.has(round.id);
                                const isExpanded = expandedRound === round.id;

                                return (
                                    <div
                                        key={round.id}
                                        className={`border rounded-lg p-3 transition-all ${isBest8 ? 'bg-green-50 border-green-200' : 'bg-white'
                                            }`}
                                    >
                                        <div
                                            className="flex justify-between items-center cursor-pointer"
                                            onClick={() => setExpandedRound(isExpanded ? null : round.id)}
                                        >
                                            <div>
                                                <div className="font-medium text-sm">
                                                    {new Date(round.datePlayed).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {round.course.name}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-lg">
                                                    {round.totalStrokes}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {isBest8 && '⭐ '}Diff: {round.handicapDifferential.toFixed(1)}
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-600">Gross Score:</span>
                                                    <span className="ml-1 font-medium">{round.grossScore}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Net Score:</span>
                                                    <span className="ml-1 font-medium">{round.netScore}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // Desktop: Table layout
                        <div className="space-y-2">
                            {/* Header Row */}
                            <div className="grid grid-cols-6 gap-4 font-semibold text-sm border-b pb-2">
                                <div>Date</div>
                                <div>Course</div>
                                <div>Total Strokes</div>
                                <div>Gross Score</div>
                                <div>Net Score</div>
                                <div>Handicap Diff</div>
                            </div>

                            {/* Data Rows */}
                            {sortedRounds.map((round) => {
                                const isBest8 = best8Rounds.has(round.id);
                                return (
                                    <div
                                        key={round.id}
                                        className={`grid grid-cols-6 gap-4 py-2 px-3 rounded text-sm transition-colors ${isBest8
                                                ? 'bg-green-50 border border-green-200 font-medium shadow-sm'
                                                : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div>{new Date(round.datePlayed).toLocaleDateString()}</div>
                                        <div className="truncate" title={round.course.name}>
                                            {round.course.name}
                                        </div>
                                        <div>{round.totalStrokes}</div>
                                        <div>{round.grossScore}</div>
                                        <div>{round.netScore}</div>
                                        <div className="flex items-center">
                                            {round.handicapDifferential.toFixed(1)}
                                            {isBest8 && (
                                                <span className="ml-2 text-green-600 text-sm">★</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    // Trends and insights view
    const TrendsView = () => (
        <div className="space-y-6">
            {/* Working Handicap Trend Chart */}
            <HandicapTrendChart
                rounds={rounds}
                currentHandicap={currentHandicap}
                isMobile={isMobile}
            />

            {/* Performance Insights */}
            <Card>
                <CardHeader>
                    <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>
                        Performance Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className={`p-3 rounded-lg ${statistics.improvementTrend === 'improving' ? 'bg-green-50 border border-green-200' :
                                statistics.improvementTrend === 'declining' ? 'bg-red-50 border border-red-200' :
                                    'bg-blue-50 border border-blue-200'
                            }`}>
                            <div className={`font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>
                                {statistics.improvementTrend === 'improving' && '🎉 You\'re improving!'}
                                {statistics.improvementTrend === 'declining' && '💪 Focus on consistency'}
                                {statistics.improvementTrend === 'stable' && '📊 Steady performance'}
                            </div>
                            <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                {statistics.improvementTrend === 'improving' && 'Your recent rounds show improvement over previous rounds.'}
                                {statistics.improvementTrend === 'declining' && 'Recent rounds are slightly higher than your previous average.'}
                                {statistics.improvementTrend === 'stable' && 'Your handicap is relatively stable with consistent play.'}
                            </div>
                        </div>

                        {rounds.length >= 5 && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className={`font-medium text-blue-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                                    Improvement Recommendations
                                </div>
                                <div className={`text-blue-800 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                    {currentHandicap > 20 && "Focus on course management and consistent putting to lower your scores."}
                                    {currentHandicap <= 20 && currentHandicap > 10 && "Work on short game and course strategy to reach single digits."}
                                    {currentHandicap <= 10 && currentHandicap > 0 && "Excellent golfer! Focus on mental game and consistency under pressure."}
                                    {currentHandicap <= 0 && "Outstanding! You're playing at scratch or better level."}
                                </div>
                            </div>
                        )}

                        {/* Additional Performance Metrics */}
                        {rounds.length >= 3 && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg text-center">
                                    <div className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                                        {(rounds.slice(0, 3).reduce((sum, r) => sum + r.totalStrokes, 0) / 3).toFixed(1)}
                                    </div>
                                    <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                        Last 3 Avg
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg text-center">
                                    <div className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                                        {(rounds.slice(0, 3).reduce((sum, r) => sum + r.handicapDifferential, 0) / 3).toFixed(1)}
                                    </div>
                                    <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                        Recent Diff Avg
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className={`${isMobile ? 'px-4' : 'max-w-[1000px]'} mx-auto my-8`}>
            {/* Header */}
            <div className="mb-6">
                <h2 className={`font-bold mb-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                    Handicap Calculator
                </h2>
                <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
                    Your handicap index is calculated from the average of your best 8 rounds out of your last 20 rounds.
                </p>
            </div>

            {/* Mobile view selector */}
            {isMobile && <MobileViewSelector />}

            {/* Current Handicap Display */}
            <HandicapDisplay />

            {/* Statistics Grid */}
            {(!isMobile || viewMode === 'summary') && <StatisticsGrid />}

            {/* Round History */}
            {(!isMobile || viewMode === 'details') && (
                <div>
                    <FilterControls />
                    <RoundsList />
                </div>
            )}

            {/* Trends View */}
            {(!isMobile || viewMode === 'trends') && <TrendsView />}

            {/* Educational Information */}
            {rounds.length > 0 && (
                <div className="mt-6 space-y-3">
                    {/* Legend */}
                    <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                            <span>Best 8 rounds used for handicap calculation ★</span>
                        </div>
                    </div>

                    {/* Handicap Calculation Explanation */}
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className={isMobile ? 'p-4' : 'p-6'}>
                            <h4 className={`font-medium text-blue-900 mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                                How Your Handicap is Calculated
                            </h4>
                            <div className={`text-blue-800 space-y-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                <div>• Your handicap index is the average of your best 8 handicap differentials from your last 20 rounds</div>
                                <div>• Handicap differential = (113 ÷ Slope Rating) × (Adjusted Score - Course Rating)</div>
                                <div>• Adjusted scores are capped at Net Double Bogey for each hole</div>
                                <div>• You need at least 5 rounds for an official handicap calculation</div>
                                {rounds.length >= 8 && (
                                    <div className="mt-2 font-medium">
                                        Current calculation: Average of {statistics.countingRounds} best differentials = {currentHandicap.toFixed(1)}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Call to Action for New Users */}
                    {rounds.length < 5 && (
                        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
                            <CardContent className={`text-center ${isMobile ? 'p-4' : 'p-6'}`}>
                                <h3 className={`font-medium mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                                    Keep Building Your Handicap
                                </h3>
                                <p className={`text-muted-foreground mb-4 ${isMobile ? 'text-sm' : 'text-base'}`}>
                                    You need {5 - rounds.length} more rounds to establish your official handicap index.
                                </p>
                                <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                    Switch to the Score Calculator tab to enter your next round!
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Call to Action for No Rounds */}
            {rounds.length === 0 && (
                <Card className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
                    <CardContent className={`text-center ${isMobile ? 'p-4' : 'p-6'}`}>
                        <h3 className={`font-medium mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                            Start Building Your Handicap
                        </h3>
                        <p className={`text-muted-foreground mb-4 ${isMobile ? 'text-sm' : 'text-base'}`}>
                            Record your golf rounds to track your progress and calculate your official handicap index.
                        </p>
                        <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            Switch to the Score Calculator tab to enter your first round!
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}