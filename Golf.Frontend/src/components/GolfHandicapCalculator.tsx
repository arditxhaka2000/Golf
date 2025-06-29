// Golf.Frontend/src/components/GolfHandicapCalculator.tsx
// REQ 1-8: This component implements the handicap calculator page
// Shows last 20 rounds, highlights best 8, calculates current handicap index
// Matches the wireframe provided in the requirements exactly

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@apollo/client';
import { GET_MY_ROUNDS_QUERY, GET_MY_HANDICAP_QUERY } from '../graphql/queries';

// Interface for round data from backend
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

export function GolfHandicapCalculator() {
    const { username } = useAuth();

    // REQ 1-8: Fetch rounds and handicap data from backend
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

    // REQ 1-8: Calculate which rounds are the best 8 (lowest handicap differentials)
    // These are highlighted and used for handicap calculation
    const best8Rounds = React.useMemo(() => {
        if (rounds.length === 0) return new Set();

        const sortedRounds = [...rounds].sort((a, b) => a.handicapDifferential - b.handicapDifferential);
        const best8 = sortedRounds.slice(0, Math.min(8, rounds.length));
        return new Set(best8.map(r => r.id));
    }, [rounds]);

    // Calculate statistics for display
    const statistics = React.useMemo(() => {
        if (rounds.length === 0) {
            return {
                totalRounds: 0,
                countingRounds: 0,
                averageScore: 0,
                bestScore: 0
            };
        }

        return {
            totalRounds: rounds.length,
            countingRounds: Math.min(rounds.length, 8),
            averageScore: rounds.reduce((sum, r) => sum + r.totalStrokes, 0) / rounds.length,
            bestScore: Math.min(...rounds.map(r => r.totalStrokes))
        };
    }, [rounds]);

    // Loading state
    if (roundsLoading || handicapLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-lg">Loading handicap data...</div>
            </div>
        );
    }
    // Error state
    if (roundsError && rounds.length === 0) {
        // Don't show error for empty rounds, just show empty state
        console.log('No rounds found or error occurred:', roundsError.message);
    }

    //if (roundsError) {
    //    return (
    //        <div className="flex items-center justify-center py-12">
    //            <div className="text-lg text-red-600">
    //                Error loading rounds: {roundsError.message}
    //            </div>
    //        </div>
    //    );
    //}

    return (
        <div className="max-w-[1000px] mx-auto my-8">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Handicap Calculator</h2>
                <p className="text-muted-foreground">
                    Your handicap index is calculated from the average of your best 8 rounds out of your last 20 rounds.
                </p>
            </div>

            {/* REQ 1-8: Current Handicap Index Display */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-center">Your Current Handicap Index</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                            {currentHandicap.toFixed(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {rounds.length === 0
                                ? 'No rounds recorded yet'
                                : `Based on ${statistics.countingRounds} of ${statistics.totalRounds} rounds`
                            }
                        </div>
                        {rounds.length > 0 && rounds.length < 5 && (
                            <div className="text-xs text-orange-600 mt-1">
                                Need at least 5 rounds for official handicap calculation
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{statistics.totalRounds}</div>
                        <div className="text-sm text-muted-foreground">Total Rounds</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{statistics.countingRounds}</div>
                        <div className="text-sm text-muted-foreground">Counting Rounds</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                            {statistics.averageScore > 0 ? statistics.averageScore.toFixed(1) : '0'}
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Score</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                            {statistics.bestScore || '0'}
                        </div>
                        <div className="text-sm text-muted-foreground">Best Score</div>
                    </CardContent>
                </Card>
            </div>

            {/* REQ 1-8: Round History (matches wireframe exactly) */}
            <Card>
                <CardHeader>
                    <CardTitle>Round History (Last 20 Rounds)</CardTitle>
                </CardHeader>
                <CardContent>
                    {rounds.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <div className="text-lg mb-2">No rounds recorded yet</div>
                            <div className="text-sm">
                                Start by entering scores on the Score Calculator page to build your handicap history.
                            </div>
                        </div>
                    ) : (
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

                            {/* Data Rows - REQ 1-8: Highlight best 8 rounds */}
                            {rounds.map((round) => {
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
                                            {/* REQ 1-8: Star indicator for best 8 rounds */}
                                            {isBest8 && (
                                                <span className="ml-2 text-green-600 text-sm">★</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Show progress message if less than 20 rounds */}
                            {rounds.length < 20 && (
                                <div className="text-center py-4 text-muted-foreground text-sm border-t mt-4">
                                    Play {20 - rounds.length} more rounds to have a complete 20-round handicap history
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Legend and Additional Information */}
            {rounds.length > 0 && (
                <div className="mt-6 space-y-3">
                    {/* Legend */}
                    <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                            <span>Best 8 rounds used for handicap calculation ★</span>
                        </div>
                    </div>

                    {/* Handicap Calculation Explanation */}
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                            <h4 className="font-medium text-blue-900 mb-2">How Your Handicap is Calculated</h4>
                            <div className="text-sm text-blue-800 space-y-1">
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

                    {/* Recommendation for improvement */}
                    {rounds.length >= 5 && (
                        <Card className="bg-amber-50 border-amber-200">
                            <CardContent className="p-4">
                                <h4 className="font-medium text-amber-900 mb-2">Improve Your Handicap</h4>
                                <div className="text-sm text-amber-800">
                                    {currentHandicap > 20 && "Focus on course management and consistent putting to lower your scores."}
                                    {currentHandicap <= 20 && currentHandicap > 10 && "Work on short game and course strategy to reach single digits."}
                                    {currentHandicap <= 10 && currentHandicap > 0 && "Excellent golfer! Focus on mental game and consistency under pressure."}
                                    {currentHandicap <= 0 && "Outstanding! You're playing at scratch or better level."}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Call to Action for New Users */}
            {rounds.length === 0 && (
                <Card className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
                    <CardContent className="p-6 text-center">
                        <h3 className="text-lg font-medium mb-2">Start Building Your Handicap</h3>
                        <p className="text-muted-foreground mb-4">
                            Record your golf rounds to track your progress and calculate your official handicap index.
                        </p>
                        <div className="text-sm text-muted-foreground">
                            Switch to the Score Calculator tab to enter your first round!
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}