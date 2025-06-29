// Mobile-optimized scorecard with touch-friendly controls

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Hole {
    holeNumber: number;
    par: number;
    handicap: number;
}

interface MobileResponsiveScorecardProps {
    holes: Hole[];
    scores: Record<number, number>;
    onScoreChange: (holeNumber: number, score: number) => void;
    getScoreColor: (strokes: number, par: number) => string;
    renderStrokeIndicators: (hole: Hole) => string;
}

export function MobileResponsiveScorecard({
    holes,
    scores,
    onScoreChange,
    getScoreColor,
    renderStrokeIndicators
}: MobileResponsiveScorecardProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'carousel'>('grid');
    const [currentHole, setCurrentHole] = useState(1);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Quick score increment/decrement
    const adjustScore = (holeNumber: number, delta: number) => {
        const currentScore = scores[holeNumber] || 0;
        const newScore = Math.max(1, Math.min(15, currentScore + delta));
        onScoreChange(holeNumber, newScore);
    };

    // Touch-friendly score picker
    const ScorePicker = ({ hole }: { hole: Hole }) => {
        const currentScore = scores[hole.holeNumber] || 0;
        const scoreOptions = Array.from({ length: 10 }, (_, i) => i + 1);

        return (
            <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <span className="text-lg font-bold">Hole {hole.holeNumber}</span>
                        <span className="text-sm text-gray-500 ml-2">
                            Par {hole.par} / Hcp {hole.handicap} {renderStrokeIndicators(hole)}
                        </span>
                    </div>
                    <div className="text-right">
                        {currentScore > 0 && (
                            <div
                                className="text-2xl font-bold px-3 py-1 rounded text-white"
                                style={{
                                    backgroundColor: getScoreColor(currentScore, hole.par) || '#6B7280',
                                    color: getScoreColor(currentScore, hole.par) !== 'transparent' ? 'white' : '#374151'
                                }}
                            >
                                {currentScore}
                            </div>
                        )}
                    </div>
                </div>

                {/* Touch-friendly score buttons */}
                <div className="grid grid-cols-5 gap-2 mb-3">
                    {scoreOptions.map(score => (
                        <button
                            key={score}
                            onClick={() => onScoreChange(hole.holeNumber, score)}
                            className={`
                                h-12 w-full rounded-lg border-2 font-medium transition-all
                                ${currentScore === score
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }
                                ${score <= hole.par - 2 ? 'text-green-600' : ''}
                                ${score === hole.par - 1 ? 'text-green-500' : ''}
                                ${score === hole.par ? 'text-gray-600' : ''}
                                ${score === hole.par + 1 ? 'text-orange-500' : ''}
                                ${score >= hole.par + 2 ? 'text-red-500' : ''}
                            `}
                        >
                            {score}
                        </button>
                    ))}
                </div>

                {/* Quick adjust buttons */}
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => adjustScore(hole.holeNumber, -1)}
                        disabled={currentScore <= 1}
                        className="w-12 h-12 rounded-full bg-red-100 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-200 transition-colors"
                    >
                        −
                    </button>
                    <button
                        onClick={() => adjustScore(hole.holeNumber, 1)}
                        disabled={currentScore >= 15}
                        className="w-12 h-12 rounded-full bg-green-100 text-green-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-200 transition-colors"
                    >
                        +
                    </button>
                </div>
            </div>
        );
    };

    // Carousel navigation for mobile
    const CarouselView = () => (
        <div className="space-y-4">
            {/* Hole navigation */}
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <button
                    onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
                    disabled={currentHole === 1}
                    className="px-4 py-2 bg-white rounded border disabled:opacity-50"
                >
                    ← Previous
                </button>
                <span className="font-medium">
                    Hole {currentHole} of 18
                </span>
                <button
                    onClick={() => setCurrentHole(Math.min(18, currentHole + 1))}
                    disabled={currentHole === 18}
                    className="px-4 py-2 bg-white rounded border disabled:opacity-50"
                >
                    Next →
                </button>
            </div>

            {/* Current hole score picker */}
            <ScorePicker hole={holes.find(h => h.holeNumber === currentHole)!} />

            {/* Quick hole navigation dots */}
            <div className="flex flex-wrap justify-center gap-2 p-4">
                {holes.map(hole => (
                    <button
                        key={hole.holeNumber}
                        onClick={() => setCurrentHole(hole.holeNumber)}
                        className={`
                            w-8 h-8 rounded-full text-xs font-medium transition-all
                            ${currentHole === hole.holeNumber
                                ? 'bg-blue-600 text-white'
                                : scores[hole.holeNumber]
                                    ? 'bg-green-100 text-green-700 border border-green-300'
                                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                            }
                        `}
                    >
                        {hole.holeNumber}
                    </button>
                ))}
            </div>
        </div>
    );

    // Compact list view for mobile
    const ListView = () => (
        <div className="space-y-2">
            {holes.map(hole => (
                <div key={hole.holeNumber} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-sm font-bold">
                        {hole.holeNumber}
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-medium">
                            Par {hole.par} / Hcp {hole.handicap}
                        </div>
                        <div className="text-xs text-gray-500">
                            {renderStrokeIndicators(hole)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => adjustScore(hole.holeNumber, -1)}
                            disabled={!scores[hole.holeNumber] || scores[hole.holeNumber] <= 1}
                            className="w-8 h-8 rounded-full bg-red-100 text-red-600 disabled:opacity-30 text-sm"
                        >
                            −
                        </button>
                        <div
                            className="w-12 h-8 flex items-center justify-center rounded text-white font-bold text-sm"
                            style={{
                                backgroundColor: getScoreColor(scores[hole.holeNumber] || 0, hole.par) || '#E5E7EB',
                                color: getScoreColor(scores[hole.holeNumber] || 0, hole.par) !== 'transparent' ? 'white' : '#374151'
                            }}
                        >
                            {scores[hole.holeNumber] || '−'}
                        </div>
                        <button
                            onClick={() => adjustScore(hole.holeNumber, 1)}
                            disabled={scores[hole.holeNumber] >= 15}
                            className="w-8 h-8 rounded-full bg-green-100 text-green-600 disabled:opacity-30 text-sm"
                        >
                            +
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    // Grid view (default desktop, compact mobile)
    const GridView = () => (
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {(isMobile ? holes : [holes.slice(0, 9), holes.slice(9, 18)]).map((section, sectionIndex) => (
                <div key={sectionIndex} className={isMobile ? '' : 'space-y-3'}>
                    {!isMobile && (
                        <div className="font-semibold text-center">
                            {sectionIndex === 0 ? 'Front 9' : 'Back 9'}
                        </div>
                    )}
                    <div className="space-y-2">
                        {(isMobile ? [section] : section as Hole[]).map((hole: Hole) => (
                            <div key={hole.holeNumber} className="bg-white rounded-lg p-3 border shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-xs font-bold">
                                            {hole.holeNumber}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            Par {hole.par}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Hcp {hole.handicap} {renderStrokeIndicators(hole)}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => adjustScore(hole.holeNumber, -1)}
                                        disabled={!scores[hole.holeNumber] || scores[hole.holeNumber] <= 1}
                                        className="w-8 h-8 rounded-full bg-red-100 text-red-600 disabled:opacity-30 text-sm"
                                    >
                                        −
                                    </button>
                                    <div className="flex-1">
                                        <Input
                                            type="number"
                                            min="1"
                                            max="15"
                                            value={scores[hole.holeNumber] || ''}
                                            onChange={(e) => {
                                                const score = parseInt(e.target.value);
                                                if (!isNaN(score) && score >= 1 && score <= 15) {
                                                    onScoreChange(hole.holeNumber, score);
                                                }
                                            }}
                                            className="text-center h-8 text-sm"
                                            style={{
                                                backgroundColor: getScoreColor(scores[hole.holeNumber] || 0, hole.par),
                                                color: scores[hole.holeNumber] && getScoreColor(scores[hole.holeNumber], hole.par) !== 'transparent' ? 'white' : 'inherit'
                                            }}
                                            placeholder="0"
                                        />
                                    </div>
                                    <button
                                        onClick={() => adjustScore(hole.holeNumber, 1)}
                                        disabled={scores[hole.holeNumber] >= 15}
                                        className="w-8 h-8 rounded-full bg-green-100 text-green-600 disabled:opacity-30 text-sm"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* View mode selector */}
            <div className="flex justify-center">
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'grid'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        📊 Grid
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'list'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        📋 List
                    </button>
                    <button
                        onClick={() => setViewMode('carousel')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'carousel'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        🎯 Focus
                    </button>
                </div>
            </div>

            {/* Progress indicator */}
            <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{Object.keys(scores).length}/18 holes</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(Object.keys(scores).length / 18) * 100}%` }}
                    />
                </div>
            </div>

            {/* Render selected view */}
            {viewMode === 'grid' && <GridView />}
            {viewMode === 'list' && <ListView />}
            {viewMode === 'carousel' && <CarouselView />}

            {/* Quick actions for mobile */}
            {isMobile && (
                <div className="fixed bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg border p-4">
                    <div className="flex justify-between items-center">
                        <div className="text-sm font-medium">
                            Total: {Object.values(scores).reduce((sum, score) => sum + score, 0)}
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                                Save
                            </Button>
                            <Button size="sm">
                                Finish Round
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}