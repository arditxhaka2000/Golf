// Golf.Frontend/src/components/GolfScoreCalculator.tsx
// This component implements ALL requirements from Req 1-1 through Req 1-7
// It handles score entry, color coding, gender selection, course search, and calculations

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQuery } from '@apollo/client';
import {
    SEARCH_COURSES_MUTATION,
    IMPORT_COURSE_MUTATION,
    SAVE_ROUND_MUTATION
} from '../graphql/mutation';
import { GET_MY_ROUNDS_QUERY, GET_MY_HANDICAP_QUERY } from '../graphql/queries';

// Interface definitions based on backend models
interface Course {
    id: string | null;  // Can be null for API courses
    name: string;
    courseRating: number;
    slopeRating: number;
    location?: string;
    externalApiId?: string;  // This is what we use for import
    isImported?: boolean;
    isFromApi?: boolean;
    holes: Hole[];
}

interface Hole {
    holeNumber: number;
    par: number;
    handicap: number;
}

// REQ 1-1: Color coding function for score backgrounds
// Returns background color based on score relative to par
const getScoreColor = (strokes: number, par: number): string => {
    if (!strokes) return 'transparent';

    // REQ 1-1: Ace (hole-in-one) is yellow
    if (strokes === 1) return '#FFD700'; // Yellow

    const diff = strokes - par;

    // REQ 1-1: Eagle or better (-2 or more) is green
    if (diff <= -2) return '#228B22'; // Green

    // REQ 1-1: Birdie (-1) is light green
    if (diff === -1) return '#90EE90'; // Light green

    // REQ 1-1: Par (0) has no color coding
    if (diff === 0) return 'transparent';

    // REQ 1-1: Bogey (+1) is light red
    if (diff === 1) return '#FFB6C1'; // Light red

    // REQ 1-1: Double bogey or worse (+2 or more) is red
    return '#FF6B6B'; // Red
};

export function GolfScoreCalculator() {
    const { username } = useAuth();

    // Form state
    const [playerName, setPlayerName] = useState(username ?? '');
    const [gender, setGender] = useState<'male' | 'female'>('male'); // REQ 1-2: Gender field
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [courseSearchTerm, setCourseSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Course[]>([]);
    const [userHandicap, setUserHandicap] = useState<number>(0);
    const [scores, setScores] = useState<Record<number, number>>({});
    const [showCourseSearch, setShowCourseSearch] = useState(false);

    //Add loading states
    const [isSearchingCourses, setIsSearchingCourses] = useState(false);
    const [isImportingCourse, setIsImportingCourse] = useState(false);

    // GraphQL operations
    const [searchCourses] = useMutation(SEARCH_COURSES_MUTATION);
    const [importCourse] = useMutation(IMPORT_COURSE_MUTATION);
    const [saveRound] = useMutation(SAVE_ROUND_MUTATION, {
        refetchQueries: [
            {
                query: GET_MY_ROUNDS_QUERY,
                variables: {
                    token: localStorage.getItem('token'),
                    limit: 20
                }
            },
            {
                query: GET_MY_HANDICAP_QUERY,
                variables: {
                    token: localStorage.getItem('token')
                }
            }
        ]
    });

    // REQ 1-8: Get handicap from saved rounds (read-only)
    const { data: handicapData } = useQuery(GET_MY_HANDICAP_QUERY, {
        variables: { token: localStorage.getItem('token') }
    });

    // REQ 1-8: Update handicap from backend data
    useEffect(() => {
        if (handicapData?.calculateMyHandicap) {
            setUserHandicap(handicapData.calculateMyHandicap);
        }
    }, [handicapData]);

    // Default course data when no course is selected
    const defaultHoles: Hole[] = Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        // Standard par distribution: mostly par 4s, some par 3s and 5s
        par: [3, 4, 5, 4, 4, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 4, 4, 5][i] || 4,
        handicap: i + 1 // Simple 1-18 handicap for default course
    }));

    const holes = selectedCourse?.holes || defaultHoles;

    // REQ 1-6: Calculate additional strokes for handicap distribution
    const calculateAdditionalStrokes = (handicapIndex: number): Record<number, number> => {
        const result: Record<number, number> = {};
        const roundedHandicap = Math.round(handicapIndex);

        // Initialize all hole handicaps
        holes.forEach(hole => {
            result[hole.handicap] = 0;
        });

        // Distribute strokes based on handicap system
        const strokesPerRound = Math.floor(Math.abs(roundedHandicap) / 18);
        const extraStrokes = Math.abs(roundedHandicap) % 18;

        // Base strokes to all holes
        holes.forEach(hole => {
            result[hole.handicap] = strokesPerRound;
        });

        // Extra strokes to hardest holes first (handicap 1, 2, 3...)
        for (let i = 1; i <= extraStrokes && i <= 18; i++) {
            const hole = holes.find(h => h.handicap === i);
            if (hole) {
                result[hole.handicap]++;
            }
        }

        // Handle negative handicaps (subtract strokes)
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

    // REQ 1-5, 1-6, 1-7: All scoring calculations
    const calculations = useMemo(() => {
        let totalStrokes = 0;
        let grossPoints = 0; // REQ 1-5: Stableford points without handicap
        let netPoints = 0;   // REQ 1-6: Stableford points with handicap
        let adjustedScore = 0; // REQ 1-7: For handicap differential

        holes.forEach(hole => {
            const strokes = scores[hole.holeNumber] || 0;
            totalStrokes += strokes;

            if (strokes > 0) {
                // REQ 1-5: Gross Score (Stableford points)
                const grossDiff = strokes - hole.par;
                const grossStableford = Math.max(0, Math.min(5, 2 - grossDiff));
                grossPoints += grossStableford;

                // REQ 1-6: Net Score (Stableford with handicap)
                const extraStrokes = additionalStrokes[hole.handicap] || 0;
                const netPar = hole.par + extraStrokes;
                const netDiff = strokes - netPar;
                const netStableford = Math.max(0, Math.min(5, 2 - netDiff));
                netPoints += netStableford;

                // REQ 1-7: Adjusted Score (capped at Net Double Bogey)
                const netDoubleBogey = netPar + 2;
                adjustedScore += Math.min(strokes, netDoubleBogey);
            }
        });

        // REQ 1-7: Handicap Differential calculation
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

    // REQ 1-3: Course search functionality
    const handleCourseSearch = async () => {
        if (!courseSearchTerm.trim() || isSearchingCourses) return;

        setIsSearchingCourses(true);
        try {
            const { data } = await searchCourses({
                variables: { name: courseSearchTerm }
            });
            setSearchResults(data.searchCourses || []);
        } catch (error) {
            console.error('Error searching courses:', error);
            alert('Error searching courses. Please try again.');
        } finally {
            setIsSearchingCourses(false);
        }
    };

    // REQ 1-3: Course selection and import
    const handleCourseSelect = async (course: Course) => {
        if (isImportingCourse) return;

        try {
            console.log('Selected course:', course);
            
            if (course.holes.length === 0 && !course.isImported) {
                if (!course.externalApiId) {
                    throw new Error('No external API ID available for import');
                }

                setIsImportingCourse(true);
                const { data } = await importCourse({
                    variables: { externalId: course.externalApiId }
                });


                const importedCourse = {
                    ...data.importCourse,
                    name: data.importCourse.name || course.name, 
                    location: data.importCourse.location || course.location 

                };
                console.log('qitu', importedCourse);

                setSelectedCourse(importedCourse);
            } else {
                setSelectedCourse(course);
            }
            setShowCourseSearch(false);
            setCourseSearchTerm('');
            setSearchResults([]);
        } catch (error) {
            console.error('Error importing course:', error);
            alert('Error importing course. Please try again.');
        } finally {
            setIsImportingCourse(false);
        }
    };

    const handleScoreChange = (holeNumber: number, value: string) => {
        const numValue = parseInt(value) || 0;
        if (numValue < 0 || numValue > 15) return; // Validation

        setScores(prev => ({
            ...prev,
            [holeNumber]: numValue
        }));
    };

    // REQ 1-8: Save round functionality
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

            // Convert scores object to array of hole objects
            const holes = Object.entries(scores).map(([holeNumber, strokes]) => ({
                holeNumber: parseInt(holeNumber),
                strokes: strokes
            }));

            await saveRound({
                variables: {
                    input: {
                        courseId: selectedCourse.id,
                        datePlayed: new Date().toISOString(),
                        holes: holes  // Changed from holeScores to holes
                    },
                    token
                }
            });

            alert('Round saved successfully!');

            const clearScores = confirm('Round saved! Would you like to clear scores for a new round?');
            if (clearScores) {
                setScores({});
            }
        } catch (error) {
            console.error('Error saving round:', error);
            alert('Error saving round. Please try again.');
        }
    };

    // REQ 1-4, 1-6: Render stroke indicators for additional strokes
    const renderStrokeIndicators = (hole: Hole) => {
        const extraStrokes = Math.abs(additionalStrokes[hole.handicap] || 0);
        return '/'.repeat(extraStrokes);
    };
    const handleClearCourse = () => {
        setSelectedCourse(null);
        setCourseSearchTerm('');
        setSearchResults([]);
    };

    return (
        <div className="max-w-[1200px] my-8">
            <div className="pb-4">
                <p className="text-sm text-muted-foreground mt-2">
                    Enter your scores for each hole to calculate your round statistics and handicap differential
                </p>
            </div>

            {/* Player/Course Info Section */}
            <div className="gap-6">
                <div className="flex gap-[20pt]">
                    {/* Player Name */}
                    <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">Player Name</label>
                        <Input
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                        />
                    </div>

                    {/* REQ 1-2: Gender Selection */}
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

                    {/* REQ 1-3: Course Name with Search */}
                    <div className="flex-3">
                        <label className="block text-xs font-medium mb-1">Course Name</label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                placeholder="Click Search to find courses..."
                                value={selectedCourse ? (selectedCourse.name || course.name) : ''}
                                readOnly={!!selectedCourse}
                                className={`${selectedCourse ? '' : 'cursor-pointer'} text-base flex-1 truncate`}
                                title={selectedCourse?.name} // Shows full name on hover
                                onClick={() => !selectedCourse && setShowCourseSearch(true)}
                            />
                            <Button
                                variant="outline"
                                onClick={() => selectedCourse ? handleClearCourse() : setShowCourseSearch(true)}
                            >
                                {selectedCourse ? 'Change' : 'Search'}
                            </Button>
                        </div>
                        {selectedCourse && (
                            <div className="text-xs text-green-600 mt-1">
                                ✓ Course selected: {selectedCourse.holes.length} holes loaded
                            </div>
                        )}
                    </div>

                    {/* REQ 1-3: Course Rating (from API) */}
                    <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">Course Rating</label>
                        <Input
                            type="number"
                            value={selectedCourse?.courseRating || 72}
                            readOnly
                        />
                    </div>

                    {/* REQ 1-3: Slope Rating (from API) */}
                    <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">Slope Rating</label>
                        <Input
                            type="number"
                            value={selectedCourse?.slopeRating || 113}
                            readOnly
                        />
                    </div>

                    {/* REQ 1-8: Your Handicap (read-only from saved rounds) */}
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
                </div>
            </div>

            {/* REQ 1-3: Course Search Modal */}
            {showCourseSearch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <h3 className="text-lg font-medium mb-4">Search Golf Courses</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Try searching for: "pebble beach", "trump", "pinehurst", "muirfield"
                        </p>
                        <div className="flex gap-2 mb-4">
                            <Input
                                value={courseSearchTerm}
                                onChange={(e) => setCourseSearchTerm(e.target.value)}
                                placeholder="Enter course name..."
                                onKeyPress={(e) => e.key === 'Enter' && !isSearchingCourses && handleCourseSearch()}
                                disabled={isSearchingCourses}
                            />
                            <Button
                                onClick={handleCourseSearch}
                                disabled={isSearchingCourses || !courseSearchTerm.trim()}
                            >
                                {isSearchingCourses ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Searching...
                                    </div>
                                ) : (
                                    'Search'
                                )}
                            </Button>
                        </div>

                        <div className="max-h-60 overflow-y-auto">
                            {isSearchingCourses && (
                                <div className="text-center py-8">
                                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-gray-600">Searching for courses...</p>
                                </div>
                            )}

                            {!isSearchingCourses && searchResults.length === 0 && courseSearchTerm && (
                                <p className="text-center text-gray-500 py-4">
                                    No courses found. Try a different search term.
                                </p>
                            )}

                            {!isSearchingCourses && searchResults.map((course, index) => (
                                <div
                                    key={course.id || index}
                                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 mb-2 ${isImportingCourse ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    onClick={() => !isImportingCourse && handleCourseSelect(course)}
                                >
                                    <div className="font-medium">{course.name}</div>
                                    {course.location && (
                                        <div className="text-sm text-gray-600">{course.location}</div>
                                    )}
                                    {!course.isImported && course.isFromApi && (
                                        <div className="text-xs text-blue-600">
                                            {isImportingCourse ? 'Importing...' : 'Will import from API'}
                                        </div>
                                    )}
                                    {course.isImported && (
                                        <div className="text-xs text-green-600">Available locally</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {isImportingCourse && (
                            <div className="text-center py-2 text-blue-600">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                                Importing course data...
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowCourseSearch(false)}
                                disabled={isImportingCourse}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scorecard Grid */}
            <div className="grid grid-cols-2 gap-8 mb-6 mt-10">
                {/* Front 9 */}
                <div>
                    <div className="font-semibold mb-2">Front 9</div>
                    <div className="space-y-2">
                        {holes.slice(0, 9).map((hole) => (
                            <div key={hole.holeNumber} className="flex items-center gap-2">
                                <div className="w-6 h-6 flex items-center justify-center rounded-full border text-xs font-semibold bg-muted">
                                    {hole.holeNumber}
                                </div>
                                {/* REQ 1-4: Show Par and Handicap, REQ 1-6: Show stroke indicators */}
                                <span className="w-24 text-xs text-muted-foreground">
                                    Par {hole.par} / Hcp {hole.handicap} {renderStrokeIndicators(hole)}
                                </span>
                                {/* REQ 1-1: Color-coded score input */}
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
                                {/* REQ 1-4: Show Par and Handicap, REQ 1-6: Show stroke indicators */}
                                <span className="w-24 text-xs text-muted-foreground">
                                    Par {hole.par} / Hcp {hole.handicap} {renderStrokeIndicators(hole)}
                                </span>
                                {/* REQ 1-1: Color-coded score input */}
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

            {/* Summary Section - REQ 1-5, 1-6, 1-7 */}
            <div className="grid grid-cols-5 gap-6 mb-6">
                <div className="rounded-lg border p-2 text-center">
                    <div className="text-xs text-muted-foreground">Total Score</div>
                    <div className="text-xl font-bold">{calculations.totalStrokes}</div>
                </div>
                <div className="rounded-lg border p-2 text-center">
                    <div className="text-xs text-muted-foreground">Gross Score</div>
                    <div className="text-xl font-bold">{calculations.grossScore}</div>
                </div>
                <div className="rounded-lg border p-2 text-center">
                    <div className="text-xs text-muted-foreground">Net Score</div>
                    <div className="text-xl font-bold">{calculations.netScore}</div>
                </div>
                <div className="rounded-lg border p-2 text-center">
                    <div className="text-xs text-muted-foreground">To Par</div>
                    <div className={`text-xl font-bold ${calculations.toPar < 0 ? 'text-green-600' : calculations.toPar > 0 ? 'text-red-600' : ''
                        }`}>
                        {calculations.toPar > 0 ? '+' : ''}{calculations.toPar}
                    </div>
                </div>
                <div className="rounded-lg border p-2 text-center">
                    <div className="text-xs text-muted-foreground">Handicap Diff</div>
                    <div className="text-xl font-bold">{calculations.handicapDifferential.toFixed(1)}</div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setScores({})}>
                        Clear All Scores
                    </Button>
                    {/* REQ 1-8: Save Round Button */}
                    <Button onClick={handleSaveRound}>
                        Save Round
                    </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                    Completed: {Object.keys(scores).length}/18 holes
                </div>
            </div>
        </div>
    );
}