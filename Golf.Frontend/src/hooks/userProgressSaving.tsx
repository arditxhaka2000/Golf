import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as React from 'react';

interface RoundProgress {
    id: string;
    playerName: string;
    gender: 'male' | 'female';
    courseId: string | null;
    courseName: string;
    courseRating: number;
    slopeRating: number;
    scores: Record<number, number>;
    userHandicap: number;
    lastSaved: string;
    completedHoles: number;
}

export function useProgressSaving() {
    const { username } = useAuth();
    const [savedRounds, setSavedRounds] = useState<RoundProgress[]>([]);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Generate unique round ID
    const generateRoundId = useCallback(() => {
        return `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // Load saved progress on mount
    useEffect(() => {
        if (!username) return;

        const loadSavedProgress = () => {
            try {
                const saved = localStorage.getItem(`golf_progress_${username}`);
                if (saved) {
                    const rounds = JSON.parse(saved) as RoundProgress[];
                    // Filter out rounds older than 7 days
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                    const recentRounds = rounds.filter(round =>
                        new Date(round.lastSaved) > oneWeekAgo
                    );

                    setSavedRounds(recentRounds);

                    // Update localStorage if we filtered out old rounds
                    if (recentRounds.length !== rounds.length) {
                        localStorage.setItem(`golf_progress_${username}`, JSON.stringify(recentRounds));
                    }
                }
            } catch (error) {
                console.error('Error loading saved progress:', error);
            }
        };

        loadSavedProgress();
    }, [username]);

    // Auto-save progress with debouncing
    const saveProgress = useCallback((
        roundData: Omit<RoundProgress, 'id' | 'lastSaved' | 'completedHoles'>
    ) => {
        if (!username) return null;

        setIsAutoSaving(true);

        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Debounce auto-save by 2 seconds
        autoSaveTimeoutRef.current = setTimeout(() => {
            try {
                const completedHoles = Object.keys(roundData.scores).length;

                // Don't save if no progress made
                if (completedHoles === 0) {
                    setIsAutoSaving(false);
                    return null;
                }

                const roundProgress: RoundProgress = {
                    id: generateRoundId(),
                    ...roundData,
                    lastSaved: new Date().toISOString(),
                    completedHoles
                };

                setSavedRounds(prev => {
                    // Remove any existing round with same course to avoid duplicates
                    const filtered = prev.filter(round =>
                        round.courseName !== roundData.courseName ||
                        round.completedHoles < completedHoles
                    );

                    const updated = [...filtered, roundProgress];

                    // Keep only the 5 most recent incomplete rounds
                    const sorted = updated
                        .sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime())
                        .slice(0, 5);

                    // Save to localStorage
                    localStorage.setItem(`golf_progress_${username}`, JSON.stringify(sorted));

                    return sorted;
                });

                console.log('✅ Progress auto-saved:', completedHoles, 'holes completed');
                setIsAutoSaving(false);
                return roundProgress.id;
            } catch (error) {
                console.error('Error saving progress:', error);
                setIsAutoSaving(false);
                return null;
            }
        }, 2000);

        return 'pending';
    }, [username, generateRoundId]);

    // Load a saved round
    const loadProgress = useCallback((roundId: string) => {
        const round = savedRounds.find(r => r.id === roundId);
        if (!round) return null;

        console.log('📂 Loading saved round:', round.courseName, `(${round.completedHoles}/18 holes)`);
        return round;
    }, [savedRounds]);

    // Delete a saved round
    const deleteProgress = useCallback((roundId: string) => {
        if (!username) return;

        setSavedRounds(prev => {
            const updated = prev.filter(round => round.id !== roundId);
            localStorage.setItem(`golf_progress_${username}`, JSON.stringify(updated));
            return updated;
        });

        console.log('🗑️ Deleted saved round:', roundId);
    }, [username]);

    // Clear all saved progress
    const clearAllProgress = useCallback(() => {
        if (!username) return;

        setSavedRounds([]);
        localStorage.removeItem(`golf_progress_${username}`);
        console.log('🧹 Cleared all saved progress');
    }, [username]);

    // Get progress summary
    const getProgressSummary = useCallback(() => {
        return {
            totalSavedRounds: savedRounds.length,
            mostRecentRound: savedRounds.length > 0 ? savedRounds[0] : null,
            totalHolesInProgress: savedRounds.reduce((sum, round) => sum + round.completedHoles, 0)
        };
    }, [savedRounds]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, []);

    return {
        savedRounds,
        isAutoSaving,
        saveProgress,
        loadProgress,
        deleteProgress,
        clearAllProgress,
        getProgressSummary
    };
}

// Progress indicator component
export function ProgressIndicator({
    isAutoSaving,
    lastSaved
}: {
    isAutoSaving: boolean;
    lastSaved?: string;
}) {
    if (isAutoSaving) {
        return (
            <div className="flex items-center gap-2 text-xs text-blue-600">
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Auto-saving...</span>
            </div>
        );
    }

    if (lastSaved) {
        const savedTime = new Date(lastSaved);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - savedTime.getTime()) / (1000 * 60));

        let timeText = '';
        if (diffMinutes < 1) {
            timeText = 'just now';
        } else if (diffMinutes < 60) {
            timeText = `${diffMinutes}m ago`;
        } else if (diffMinutes < 1440) {
            timeText = `${Math.floor(diffMinutes / 60)}h ago`;
        } else {
            timeText = savedTime.toLocaleDateString();
        }

        return (
            <div className="flex items-center gap-2 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Saved {timeText}</span>
            </div>
        );
    }

    return null;
}

// Saved rounds modal component
export function SavedRoundsModal({
    savedRounds,
    onLoadRound,
    onDeleteRound,
    onClose
}: {
    savedRounds: RoundProgress[];
    onLoadRound: (round: RoundProgress) => void;
    onDeleteRound: (roundId: string) => void;
    onClose: () => void;
}) {
    if (savedRounds.length === 0) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Saved Rounds</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ×
                    </button>
                </div>

                <div className="space-y-3">
                    {savedRounds.map((round) => (
                        <div key={round.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-medium text-sm">
                                        {round.courseName || 'Standard Course'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {round.completedHoles}/18 holes completed
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400">
                                    {new Date(round.lastSaved).toLocaleDateString()}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mb-3">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                        style={{ width: `${(round.completedHoles / 18) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onLoadRound(round)}
                                    className="flex-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                    Continue Round
                                </button>
                                <button
                                    onClick={() => onDeleteRound(round.id)}
                                    className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}