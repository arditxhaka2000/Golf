// Component for quick bulk score entry with shortcuts

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Hole {
    holeNumber: number;
    par: number;
    handicap: number;
}

interface BulkScoreEntryProps {
    holes: Hole[];
    currentScores: Record<number, number>;
    onScoresUpdate: (scores: Record<number, number>) => void;
    onClose: () => void;
}

export function BulkScoreEntry({ holes, currentScores, onScoresUpdate, onClose }: BulkScoreEntryProps) {
    const [bulkScores, setBulkScores] = useState<Record<number, number>>(currentScores);
    const [bulkInputValue, setBulkInputValue] = useState('');
    const [selectedPreset, setSelectedPreset] = useState<string>('');

    // Preset score patterns
    const presets = {
        'par': 'All Pars',
        'bogey': 'All Bogeys',
        'birdie': 'All Birdies',
        'double': 'All Double Bogeys',
        'good': 'Good Round (Mix)',
        'bad': 'Tough Round (Mix)',
        'beginner': 'Beginner Scores'
    };

    // Apply preset scores
    const applyPreset = (presetType: string) => {
        const newScores: Record<number, number> = {};

        holes.forEach(hole => {
            switch (presetType) {
                case 'par':
                    newScores[hole.holeNumber] = hole.par;
                    break;
                case 'bogey':
                    newScores[hole.holeNumber] = hole.par + 1;
                    break;
                case 'birdie':
                    newScores[hole.holeNumber] = hole.par - 1;
                    break;
                case 'double':
                    newScores[hole.holeNumber] = hole.par + 2;
                    break;
                case 'good':
                    // Mix of pars, birdies, and occasional bogey
                    if (hole.holeNumber % 6 === 0) {
                        newScores[hole.holeNumber] = hole.par - 1; // Birdie
                    } else if (hole.holeNumber % 8 === 0) {
                        newScores[hole.holeNumber] = hole.par + 1; // Bogey
                    } else {
                        newScores[hole.holeNumber] = hole.par; // Par
                    }
                    break;
                case 'bad':
                    // Mix of bogeys, double bogeys, and occasional par
                    if (hole.holeNumber % 5 === 0) {
                        newScores[hole.holeNumber] = hole.par; // Par
                    } else if (hole.holeNumber % 7 === 0) {
                        newScores[hole.holeNumber] = hole.par + 2; // Double bogey
                    } else {
                        newScores[hole.holeNumber] = hole.par + 1; // Bogey
                    }
                    break;
                case 'beginner':
                    // Higher scores for beginners
                    newScores[hole.holeNumber] = hole.par + 2 + Math.floor(Math.random() * 3);
                    break;
                default:
                    newScores[hole.holeNumber] = hole.par;
            }
        });

        setBulkScores(newScores);
        setSelectedPreset(presetType);
    };

    // Parse comma-separated or space-separated scores
    const parseBulkInput = (input: string) => {
        const cleanInput = input.trim();
        if (!cleanInput) return;

        // Split by comma, space, or tab
        const scoreStrings = cleanInput.split(/[,\s\t]+/).filter(s => s.length > 0);

        if (scoreStrings.length === 0) return;

        const newScores: Record<number, number> = { ...bulkScores };

        // Map scores to holes in order
        scoreStrings.forEach((scoreStr, index) => {
            const score = parseInt(scoreStr);
            const holeNumber = index + 1;

            if (!isNaN(score) && score >= 1 && score <= 15 && holeNumber <= 18) {
                newScores[holeNumber] = score;
            }
        });

        setBulkScores(newScores);
        setBulkInputValue('');
    };

    // Quick fill patterns
    const quickFillPatterns = [
        { label: 'Front 9 Pars', action: () => fillNine('front', 'par') },
        { label: 'Back 9 Pars', action: () => fillNine('back', 'par') },
        { label: 'Front 9 Bogeys', action: () => fillNine('front', 'bogey') },
        { label: 'Back 9 Bogeys', action: () => fillNine('back', 'bogey') },
        { label: 'Par 3s = 4', action: () => fillByPar(3, 4) },
        { label: 'Par 4s = 5', action: () => fillByPar(4, 5) },
        { label: 'Par 5s = 6', action: () => fillByPar(5, 6) }
    ];

    const fillNine = (nine: 'front' | 'back', type: 'par' | 'bogey') => {
        const newScores = { ...bulkScores };
        const startHole = nine === 'front' ? 1 : 10;
        const endHole = nine === 'front' ? 9 : 18;

        for (let i = startHole; i <= endHole; i++) {
            const hole = holes.find(h => h.holeNumber === i);
            if (hole) {
                newScores[i] = type === 'par' ? hole.par : hole.par + 1;
            }
        }

        setBulkScores(newScores);
    };

    const fillByPar = (par: number, score: number) => {
        const newScores = { ...bulkScores };
        holes.forEach(hole => {
            if (hole.par === par) {
                newScores[hole.holeNumber] = score;
            }
        });
        setBulkScores(newScores);
    };

    // Apply all changes
    const handleApply = () => {
        onScoresUpdate(bulkScores);
        onClose();
    };

    // Calculate stats
    const stats = React.useMemo(() => {
        const completedHoles = Object.keys(bulkScores).length;
        const totalStrokes = Object.values(bulkScores).reduce((sum, score) => sum + score, 0);
        const totalPar = holes.reduce((sum, hole) => {
            return bulkScores[hole.holeNumber] ? sum + hole.par : sum;
        }, 0);
        const toPar = totalStrokes - totalPar;

        return { completedHoles, totalStrokes, toPar };
    }, [bulkScores, holes]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-medium">Bulk Score Entry</h3>
                    <Button variant="outline" onClick={onClose}>×</Button>
                </div>

                {/* Quick Presets */}
                <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3">Quick Presets</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(presets).map(([key, label]) => (
                            <Button
                                key={key}
                                variant={selectedPreset === key ? "default" : "outline"}
                                size="sm"
                                onClick={() => applyPreset(key)}
                                className="text-xs"
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Bulk Input */}
                <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3">Enter 18 Scores (comma or space separated)</h4>
                    <div className="flex gap-2">
                        <Input
                            placeholder="e.g., 4,3,5,4,4,3,4,4,5,4,3,4,5,4,4,3,4,5"
                            value={bulkInputValue}
                            onChange={(e) => setBulkInputValue(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={() => parseBulkInput(bulkInputValue)}>
                            Apply
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Enter scores in hole order (1-18). Leave blank to skip holes.
                    </p>
                </div>

                {/* Quick Fill Patterns */}
                <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3">Quick Fill Patterns</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {quickFillPatterns.map((pattern, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={pattern.action}
                                className="text-xs"
                            >
                                {pattern.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Score Grid */}
                <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3">Individual Hole Scores</h4>
                    <div className="grid grid-cols-6 md:grid-cols-9 gap-2">
                        {holes.map((hole) => (
                            <div key={hole.holeNumber} className="text-center">
                                <div className="text-xs text-gray-500 mb-1">
                                    {hole.holeNumber}
                                </div>
                                <div className="text-xs text-gray-400 mb-1">
                                    Par {hole.par}
                                </div>
                                <Input
                                    type="number"
                                    min="1"
                                    max="15"
                                    value={bulkScores[hole.holeNumber] || ''}
                                    onChange={(e) => {
                                        const score = parseInt(e.target.value);
                                        if (!isNaN(score) && score >= 1 && score <= 15) {
                                            setBulkScores(prev => ({
                                                ...prev,
                                                [hole.holeNumber]: score
                                            }));
                                        } else if (e.target.value === '') {
                                            setBulkScores(prev => {
                                                const newScores = { ...prev };
                                                delete newScores[hole.holeNumber];
                                                return newScores;
                                            });
                                        }
                                    }}
                                    className="w-full text-center text-sm h-8"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-lg font-bold">{stats.completedHoles}/18</div>
                            <div className="text-xs text-gray-600">Holes Completed</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold">{stats.totalStrokes}</div>
                            <div className="text-xs text-gray-600">Total Strokes</div>
                        </div>
                        <div>
                            <div className={`text-lg font-bold ${stats.toPar < 0 ? 'text-green-600' :
                                    stats.toPar > 0 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                {stats.toPar > 0 ? '+' : ''}{stats.toPar}
                            </div>
                            <div className="text-xs text-gray-600">To Par</div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between gap-4">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setBulkScores({})}
                        >
                            Clear All
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setBulkScores(currentScores)}
                        >
                            Reset to Current
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleApply}>
                            Apply Scores ({stats.completedHoles} holes)
                        </Button>
                    </div>
                </div>

                {/* Keyboard Shortcuts Help */}
                <div className="mt-4 pt-4 border-t">
                    <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer hover:text-gray-700">
                            💡 Tips & Shortcuts
                        </summary>
                        <div className="mt-2 space-y-1">
                            <p>• Use comma or space separated values: "4,3,5,4" or "4 3 5 4"</p>
                            <p>• Quick presets for common score patterns</p>
                            <p>• Fill front 9 or back 9 separately with quick patterns</p>
                            <p>• Individual hole editing available after bulk entry</p>
                            <p>• Changes are not saved until you click "Apply Scores"</p>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
}

// Quick score entry buttons component (for main scorecard)
export function QuickScoreButtons({
    onBulkEntry,
    onQuickFill
}: {
    onBulkEntry: () => void;
    onQuickFill: (type: string) => void;
}) {
    return (
        <div className="flex gap-2 flex-wrap">
            <Button
                variant="outline"
                size="sm"
                onClick={onBulkEntry}
                className="text-xs"
            >
                📝 Bulk Entry
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onQuickFill('par')}
                className="text-xs"
            >
                📌 All Pars
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onQuickFill('bogey')}
                className="text-xs"
            >
                📈 All Bogeys
            </Button>
        </div>
    );
}