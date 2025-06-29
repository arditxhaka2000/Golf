// Golf.Frontend/src/components/GolfScoreCalculator.tsx
// Enhanced with progress saving, bulk entry, and mobile responsiveness

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQuery } from '@apollo/client';
import { SAVE_ROUND_MUTATION } from '../graphql/mutation';
import { GET_MY_ROUNDS_QUERY, GET_MY_HANDICAP_QUERY } from '../graphql/queries';
import { EnhancedCourseSearch } from './EnhancedCourseSearch';
import { BulkScoreEntry, QuickScoreButtons } from './BulkScore';
import { MobileResponsiveScorecard } from './MobileResponsiveScoreCard';
import {
    useProgressSaving,
    ProgressIndicator,
    SavedRoundsModal
} from '../hooks/userProgressSaving';

// Interface definitions
interface Course {
    id: string | null;
    name: string;
    courseRating: number;
    slopeRating: number;
    location?: string;
    externalApiId?: string;
    isImported?: boolean;
    isFromApi?: boolean;
    holes: Hole[];
}

interface Hole {
    holeNumber: number;
    par: number;
    handicap: number;
}

// REQ 1-1: Color coding function
const getScoreColor = (strokes: number, par: number): string => {
    if (!strokes) return 'transparent';
    if (strokes === 1) return '#FFD700'; // Yellow - Ace
    const diff = strokes - par;
    if (diff <= -2) return '#228B22'; // Green - Eagle or better
    if (diff === -1) return '#90EE90'; // Light green - Birdie
    if (diff === 0) return 'transparent'; // Par - No color
    if (diff === 1) return '#FFB6C1'; // Light red - Bogey
    return '#FF6B6B'; // Red - Double bogey or worse
};

export function GolfScoreCalculator() {
    const { username } = useAuth();

    // Form state
    const [playerName, setPlayerName] = useState(username ?? '');
    const [gender, setGender] = useState<'male' | 'female'>('male');
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [userHandicap, setUserHandicap] = useState<number>(0);
    const [scores, setScores] = useState<Record<number, number>>({});

    // UI state
    const [showEnhancedCourseSearch, setShowEnhancedCourseSearch] = useState(false);
    const [showBulkEntry, setShowBulkEntry] = useState(false);
    const [showSavedRounds, setShowSavedRounds] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Progress saving hook
    const {
        savedRounds,
        isAutoSaving,
        saveProgress,
        loadProgress,
        deleteProgress,
        clearAllProgress
    } = useProgressSaving();

    // GraphQL operations
    const [saveRound] = useMutation(SAVE_ROUND_MUTATION, {
        refetchQueries: [
            {
                query: GET_MY_ROUNDS_QUERY,
                variables: { token: localStorage.getItem('token'), limit: 20 }
            },
            {
                query: GET_MY_HANDICAP_QUERY,
                variables: { token: localStorage.getItem('token') }
            }
        ]
    });

    // Get handicap from backend
    const { data: handicapData } = useQuery(GET_MY_HANDICAP_QUERY, {
        variables: { token: localStorage.getItem('token') }
    });

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Update handicap from backend
    useEffect(() => {
        if (handicapData?.calculateMyHandicap) {
            setUserHandicap(handicapData.calculateMyHandicap);
        }
    }, [handicapData]);

    // Auto-save progress whenever scores change
    useEffect(() => {
        if (Object.keys(scores).length > 0 && selectedCourse) {
            const progressData = {
                playerName,
                gender,
                courseId: selectedCourse.id,
                courseName: selectedCourse.name,
                courseRating: selectedCourse.courseRating,
                slopeRating: selectedCourse.slopeRating,
                scores,
                userHandicap
            };

            saveProgress(progressData);
        }
    }, [scores, selectedCourse, playerName, gender, userHandicap, saveProgress]);

    // Default course data
    const defaultHoles: Hole[] = Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: [3, 4, 5, 4, 4, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 4, 4, 5][i] || 4,
        handicap: i + 1
    }));

    const holes = selectedCourse?.holes || defaultHoles;

    // Calculate additional strokes for handicap
    const calculateAdditionalStrokes = (handicapIndex: number): Record<number, number> => {
        const result: Record<number, number> = {};
        const roundedHandicap = Math.round(handicapIndex);

        holes.forEach(hole => {
            result[hole.handicap] = 0;
        });

        const strokesPerRound = Math.floor(Math.abs(roundedHandicap) / 18);
        const extraStrokes = Math.abs(roundedHandicap) % 18;

        holes.forEach(hole => {
            result[hole.handicap] = strokesPerRound;
        });

        for (let i = 1; i <= extraStrokes && i <= 18; i++) {
            const hole = holes.find(h => h.handicap === i);
            if (hole) {
                result[hole.handicap]++;
            }
        }

        if (handicapIndex < 0) {
            Object.keys(result).forEach(key => {
                result[parseInt(key)] = -result[parseInt(key)];
            });
        }

        return result;
    };

    const additionalStrokes = useMemo(() =>
        calculateAdditionalStrokes(userHandicap), [userHandicap, holes]
    );

    // Calculate all scores and statistics
    const calculations = useMemo(() => {
        let totalStrokes = 0;
        let grossPoints = 0;
        let netPoints = 0;
        let adjustedScore = 0;

        holes.forEach(hole => {
            const strokes = scores[hole.holeNumber] || 0;
            totalStrokes += strokes;

            if (strokes > 0) {
                // Gross Score (Stableford points)
                const grossDiff = strokes - hole.par;
                const grossStableford = Math.max(0, Math.min(5, 2 - grossDiff));
                grossPoints += grossStableford;

                // Net Score (Stableford with handicap)
                const extraStrokes = additionalStrokes[hole.handicap] || 0;
                const netPar = hole.par + extraStrokes;
                const netDiff = strokes - netPar;
                const netStableford = Math.max(0, Math.min(5, 2 - netDiff));
                netPoints += netStableford;

                // Adjusted Score (capped at Net Double Bogey)
                const netDoubleBogey = netPar + 2;
                adjustedScore += Math.min(strokes, netDoubleBogey);
            }
        });

        const courseRating = selectedCourse?.courseRating || 72;
        const slopeRating = selectedCourse?.slopeRating || 113;
        const handicapDiff = (113 / slopeRating) * (adjustedScore - courseRating);

        return {
            totalStrokes,
            grossScore: grossPoints,
            netScore: netPoints,
            handicapDifferential: handicapDiff,
            toPar: totalStrokes - holes.reduce((sum, h) => sum + h.par, 0)
        };
    }, [scores, holes, additionalStrokes, selectedCourse]);

    // Event handlers
    const handleCourseSelect = (course: Course) => {
        setSelectedCourse(course);
        setShowEnhancedCourseSearch(false);
    };

    const handleClearCourse = () => {
        setSelectedCourse(null);
    };

    const handleScoreChange = (holeNumber: number, value: string | number) => {
        const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
        if (numValue < 0 || numValue > 15) return;

        setScores(prev => ({
            ...prev,
            [holeNumber]: numValue
        }));
    };

    const handleBulkScoresUpdate = (newScores: Record<number, number>) => {
        setScores(newScores);
    };

    const handleQuickFill = (type: string) => {
        const newScores: Record<number, number> = {};
        holes.forEach(hole => {
            switch (type) {
                case 'par':
                    newScores[hole.holeNumber] = hole.par;
                    break;
                case 'bogey':
                    newScores[hole.holeNumber] = hole.par + 1;
                    break;
                case 'birdie':
                    newScores[hole.holeNumber] = hole.par - 1;
                    break;
            }
        });
        setScores(newScores);
    };

    const handleLoadSavedRound = (round: any) => {
        setPlayerName(round.playerName);
        setGender(round.gender);
        setSelectedCourse({
            id: round.courseId,
            name: round.courseName,
            courseRating: round.courseRating,
            slopeRating: round.slopeRating,
            holes: holes // Use default holes if not saved
        });
        setScores(round.scores);
        setShowSavedRounds(false);
    };

    const handleSaveRound = async () => {
        const completedHoles = Object.keys(scores).length;
        if (completedHoles !== 18) {
            alert(`Please complete all 18 holes before saving. (${completedHoles}/18 completed)`);
            return;
        }

        if (!selectedCourse) {
            alert('Please select a course before saving your round.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const holes = Object.entries(scores).map(([holeNumber, strokes]) => ({
                holeNumber: parseInt(holeNumber),
                strokes: strokes
            }));

            await saveRound({
                variables: {
                    input: {
                        courseId: selectedCourse.id,
                        datePlayed: new Date().toISOString(),
                        holes: holes
                    },
                    token
                }
            });

            alert('Round saved successfully!');

            // Clear progress after successful save
            clearAllProgress();

            const clearScores = confirm('Round saved! Would you like to clear scores for a new round?');
            if (clearScores) {
                setScores({});
            }
        } catch (error) {
            console.error('Error saving round:', error);
            alert('Error saving round. Please try again.');
        }
    };

    const renderStrokeIndicators = (hole: Hole) => {
        const extraStrokes = Math.abs(additionalStrokes[hole.handicap] || 0);
        return '/'.repeat(extraStrokes);
    };

    return (
        <div className={`${isMobile ? 'px-4' : 'max-w-[1200px]'} my-8`}>
            {/* Header */}
            <div className="pb-4">
                <p className="text-sm text-muted-foreground mt-2">
                    Enter your scores for each hole to calculate your round statistics and handicap differential
                </p>

                {/* Progress indicator and saved rounds */}
                <div className="flex justify-between items-center mt-2">
                    <ProgressIndicator
                        isAutoSaving={isAutoSaving}
                        lastSaved={savedRounds[0]?.lastSaved}
                    />
                    {savedRounds.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSavedRounds(true)}
                            className="text-xs"
                        >
                            📂 Continue Saved ({savedRounds.length})
                        </Button>
                    )}
                </div>
            </div>

            {/* Player/Course Info Section */}
            <div className={`gap-6 ${isMobile ? 'space-y-4' : ''}`}>
                <div className={`flex gap-4 ${isMobile ? 'flex-col' : 'flex-row'}`}>
                    {/* Player Name */}
                    <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">Player Name</label>
                        <Input
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                        />
                    </div>

                    {/* Gender Selection */}
                    <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">Gender</label>
                        <Select value={gender} onValueChange={(value: 'male' | 'female') => setGender(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Course Search */}
                    <div className={`${isMobile ? 'col-span-2' : 'flex-3'}`}>
                        <label className="block text-xs font-medium mb-1">Course Name</label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                placeholder="Click Search to find courses..."
                                value={selectedCourse ? selectedCourse.name : ''}
                                readOnly={!!selectedCourse}
                                className={`${selectedCourse ? '' : 'cursor-pointer'} text-base flex-1 truncate`}
                                title={selectedCourse?.name}
                                onClick={() => !selectedCourse && setShowEnhancedCourseSearch(true)}
                            />
                            <Button
                                variant="outline"
                                onClick={() => selectedCourse ? handleClearCourse() : setShowEnhancedCourseSearch(true)}
                            >
                                {selectedCourse ? 'Change' : 'Search'}
                            </Button>
                        </div>
                        {selectedCourse && (
                            <div className="text-xs text-green-600 mt-1">
                                ✓ Course selected: {selectedCourse.holes.length} holes loaded
                                {selectedCourse.externalApiId?.startsWith('offline-') && (
                                    <span className="ml-2 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                        Offline
                                    </span>
                                )}
                                {selectedCourse.location && (
                                    <span className="block text-gray-500">{selectedCourse.location}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {!isMobile && (
                        <>
                            {/* Course Rating */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium mb-1">Course Rating</label>
                                <Input
                                    type="number"
                                    value={selectedCourse?.courseRating || 72}
                                    readOnly
                                />
                            </div>

                            {/* Slope Rating */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium mb-1">Slope Rating</label>
                                <Input
                                    type="number"
                                    value={selectedCourse?.slopeRating || 113}
                                    readOnly
                                />
                            </div>

                            {/* Your Handicap */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium mb-1">Your Handicap</label>
                                <Input
                                    type="number"
                                    value={userHandicap.toFixed(1)}
                                    readOnly
                                    title="Handicap is calculated from your saved rounds"
                                    className="bg-gray-50"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Mobile-specific course info */}
                {isMobile && selectedCourse && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-gray-50 rounded">
                            <div className="font-medium">{selectedCourse.courseRating}</div>
                            <div className="text-gray-600">Course Rating</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                            <div className="font-medium">{selectedCourse.slopeRating}</div>
                            <div className="text-gray-600">Slope Rating</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                            <div className="font-medium">{userHandicap.toFixed(1)}</div>
                            <div className="text-gray-600">Your Handicap</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-6 mb-4">
                <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row justify-between'}`}>
                    <QuickScoreButtons
                        onBulkEntry={() => setShowBulkEntry(true)}
                        onQuickFill={handleQuickFill}
                    />
                    {!isMobile && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setScores({})}>
                                Clear All Scores
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Course Search Modal */}
            {showEnhancedCourseSearch && (
                <EnhancedCourseSearch
                    onCourseSelect={handleCourseSelect}
                    onClose={() => setShowEnhancedCourseSearch(false)}
                />
            )}

            {/* Bulk Score Entry Modal */}
            {showBulkEntry && (
                <BulkScoreEntry
                    holes={holes}
                    currentScores={scores}
                    onScoresUpdate={handleBulkScoresUpdate}
                    onClose={() => setShowBulkEntry(false)}
                />
            )}

            {/* Saved Rounds Modal */}
            {showSavedRounds && (
                <SavedRoundsModal
                    savedRounds={savedRounds}
                    onLoadRound={handleLoadSavedRound}
                    onDeleteRound={deleteProgress}
                    onClose={() => setShowSavedRounds(false)}
                />
            )}

            {/* Scorecard - Mobile Responsive */}
            <div className="mb-6">
                {isMobile ? (
                    <MobileResponsiveScorecard
                        holes={holes}
                        scores={scores}
                        onScoreChange={handleScoreChange}
                        getScoreColor={getScoreColor}
                        renderStrokeIndicators={renderStrokeIndicators}
                    />
                ) : (
                    // Desktop scorecard (original design)
                    <div className="grid grid-cols-2 gap-8">
                        {/* Front 9 */}
                        <div>
                            <div className="font-semibold mb-2">Front 9</div>
                            <div className="space-y-2">
                                {holes.slice(0, 9).map((hole) => (
                                    <div key={hole.holeNumber} className="flex items-center gap-2">
                                        <div className="w-6 h-6 flex items-center justify-center rounded-full border text-xs font-semibold bg-muted">
                                            {hole.holeNumber}
                                        </div>
                                        <span className="w-24 text-xs text-muted-foreground">
                                            Par {hole.par} / Hcp {hole.handicap} {renderStrokeIndicators(hole)}
                                        </span>
                                        <Input
                                            type="number"
                                            className="w-20"
                                            style={{
                                                backgroundColor: getScoreColor(scores[hole.holeNumber] || 0, hole.par),
                                                color: scores[hole.holeNumber] && getScoreColor(scores[hole.holeNumber], hole.par) !== 'transparent' ? 'white' : 'inherit'
                                            }}
                                            value={scores[hole.holeNumber] || ''}
                                            onChange={(e) => handleScoreChange(hole.holeNumber, e.target.value)}
                                            min="1"
                                            max="15"
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Back 9 */}
                        <div>
                            <div className="font-semibold mb-2">Back 9</div>
                            <div className="space-y-2">
                                {holes.slice(9, 18).map((hole) => (
                                    <div key={hole.holeNumber} className="flex items-center gap-2">
                                        <div className="w-6 h-6 flex items-center justify-center rounded-full border text-xs font-semibold bg-muted">
                                            {hole.holeNumber}
                                        </div>
                                        <span className="w-24 text-xs text-muted-foreground">
                                            Par {hole.par} / Hcp {hole.handicap} {renderStrokeIndicators(hole)}
                                        </span>
                                        <Input
                                            type="number"
                                            className="w-20"
                                            style={{
                                                backgroundColor: getScoreColor(scores[hole.holeNumber] || 0, hole.par),
                                                color: scores[hole.holeNumber] && getScoreColor(scores[hole.holeNumber], hole.par) !== 'transparent' ? 'white' : 'inherit'
                                            }}
                                            value={scores[hole.holeNumber] || ''}
                                            onChange={(e) => handleScoreChange(hole.holeNumber, e.target.value)}
                                            min="1"
                                            max="15"
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Section */}
            <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-5'}`}>
                <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">Total Score</div>
                    <div className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>
                        {calculations.totalStrokes}
                    </div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">Gross Score</div>
                    <div className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>
                        {calculations.grossScore}
                    </div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">Net Score</div>
                    <div className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>
                        {calculations.netScore}
                    </div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">To Par</div>
                    <div className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'} ${calculations.toPar < 0 ? 'text-green-600' : calculations.toPar > 0 ? 'text-red-600' : ''
                        }`}>
                        {calculations.toPar > 0 ? '+' : ''}{calculations.toPar}
                    </div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">Handicap Diff</div>
                    <div className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>
                        {calculations.handicapDifferential.toFixed(1)}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className={`flex items-center justify-between mt-4 ${isMobile ? 'flex-col gap-4' : ''}`}>
                <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
                    {isMobile && (
                        <Button
                            variant="outline"
                            onClick={() => setScores({})}
                            className="flex-1"
                        >
                            Clear All
                        </Button>
                    )}
                    <Button
                        onClick={handleSaveRound}
                        className={isMobile ? 'flex-1' : ''}
                        disabled={Object.keys(scores).length !== 18}
                    >
                        Save Round {isMobile && `(${Object.keys(scores).length}/18)`}
                    </Button>
                </div>
                <div className={`text-sm text-muted-foreground ${isMobile ? 'w-full text-center' : ''}`}>
                    Completed: {Object.keys(scores).length}/18 holes
                    {isAutoSaving && (
                        <span className="ml-2 text-blue-600">• Auto-saving...</span>
                    )}
                </div>
            </div>

            {/* Mobile-specific floating progress bar */}
            {isMobile && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-10">
                    <div className="flex justify-between text-sm mb-2">
                        <span>Round Progress</span>
                        <span>{Object.keys(scores).length}/18 holes</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(Object.keys(scores).length / 18) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}