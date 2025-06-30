// Golf.Frontend/src/components/EnhancedCourseSearch.tsx
// Enhanced course search component with proper offline handling

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useMutation } from '@apollo/client';
import { SEARCH_COURSES_MUTATION, IMPORT_COURSE_MUTATION } from '../graphql/mutation';

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

interface EnhancedCourseSearchProps {
    onCourseSelect: (course: Course) => void;
    onClose: () => void;
}

function generateStandardHoles(pars: number[]): Hole[] {
    return pars.map((par, index) => ({
        holeNumber: index + 1,
        par: par,
        handicap: index + 1
    }));
}

export function EnhancedCourseSearch({ onCourseSelect, onClose }: EnhancedCourseSearchProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Course[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [lastSearchTerm, setLastSearchTerm] = useState('');

    // GraphQL mutations
    const [searchCourses] = useMutation(SEARCH_COURSES_MUTATION);
    const [importCourse] = useMutation(IMPORT_COURSE_MUTATION);

    // Check if we're in offline mode by attempting a simple connectivity check
    const checkConnectivity = useCallback(async () => {
        try {
            const isProduction = window.location.protocol === 'https:';
            const baseUrl = isProduction
                ? 'https://localhost:7074/graphql'
                : 'http://localhost:5129/graphql';

            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'query { hello }' }),
                signal: AbortSignal.timeout(3000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }, []);

    // Enhanced search with proper error handling
    const handleCourseSearch = async () => {
        if (!searchTerm.trim() || isSearching) return;

        setIsSearching(true);
        setError(null);
        setLastSearchTerm(searchTerm);

        try {
            // Check connectivity first
            const isOnline = await checkConnectivity();
            if (!isOnline) {
                setIsOfflineMode(true);
                setError('No internet connection. Please check your connection and try again.');
                setSearchResults([]);
                return;
            }

            // Try API search
            const { data, errors } = await searchCourses({
                variables: { name: searchTerm },
                errorPolicy: 'all'
            });

            if (errors || !data?.searchCourses) {
                // API failed
                console.warn('API search failed:', errors);
                setIsOfflineMode(true);
                setError('Search service temporarily unavailable. Please try again later.');
                setSearchResults([]);
                return;
            }

            const results = data.searchCourses || [];
            setSearchResults(results);
            setIsOfflineMode(false);

            if (results.length === 0) {
                setError(`No courses found for "${searchTerm}". Try different search terms or check spelling.`);
            }

        } catch (error) {
            console.error('Search error:', error);
            setIsOfflineMode(true);
            setError('Search failed. Please check your connection and try again.');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Enhanced course selection with proper error handling
    const handleCourseSelect = async (course: Course) => {
        if (isImporting) return;

        try {
            // If already imported or has holes data, select directly
            if (course.isImported || course.holes.length > 0) {
                onCourseSelect(course);
                return;
            }

            // Try to import the course
            if (!course.externalApiId) {
                throw new Error('No external API ID available for import');
            }

            setIsImporting(true);
            setError(null);

            const { data, errors } = await importCourse({
                variables: { externalId: course.externalApiId },
                errorPolicy: 'all'
            });

            if (errors || !data?.importCourse) {
                // Import failed, create a basic course with default holes
                console.warn('Course import failed, creating basic course:', errors);
                const basicCourse: Course = {
                    ...course,
                    holes: generateStandardHoles([4, 3, 5, 4, 4, 3, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5]),
                    isImported: false
                };
                onCourseSelect(basicCourse);
                setError('Course import unavailable. Using standard 18-hole layout.');
                return;
            }

            const importedCourse = {
                ...data.importCourse,
                name: data.importCourse.name || course.name,
                location: data.importCourse.location || course.location
            };

            onCourseSelect(importedCourse);

        } catch (error) {
            console.error('Error selecting course:', error);
            // Fallback to basic course
            const basicCourse: Course = {
                ...course,
                holes: generateStandardHoles([4, 3, 5, 4, 4, 3, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5]),
                isImported: false
            };
            onCourseSelect(basicCourse);
            setError('Course selection completed with standard layout.');
        } finally {
            setIsImporting(false);
        }
    };

    // Retry search function
    const handleRetrySearch = () => {
        if (lastSearchTerm) {
            setSearchTerm(lastSearchTerm);
            handleCourseSearch();
        }
    };

    // Clear search and reset state
    const handleClearSearch = () => {
        setSearchTerm('');
        setLastSearchTerm('');
        setSearchResults([]);
        setError(null);
        setIsOfflineMode(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isSearching) {
            handleCourseSearch();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Search Golf Courses</h3>
                    <Button variant="outline" size="sm" onClick={onClose}>X</Button>
                </div>

                {/* Connection Status */}
                {isOfflineMode && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-red-800">
                                Connection issues detected
                            </span>
                        </div>
                    </div>
                )}

                {/* Search Input */}
                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                        Search for golf courses by name or location
                    </p>
                    <div className="flex gap-2">
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Enter course name or location..."
                            onKeyPress={handleKeyPress}
                            disabled={isSearching}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleCourseSearch}
                            disabled={isSearching || !searchTerm.trim()}
                        >
                            {isSearching ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Searching...
                                </div>
                            ) : (
                                'Search'
                            )}
                        </Button>
                    </div>
                </div>

                {/* Error/Warning Messages */}
                {error && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800 mb-2">{error}</p>
                        {isOfflineMode && (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRetrySearch}
                                    disabled={isSearching}
                                >
                                    Retry Search
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearSearch}
                                >
                                    Clear
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Search Results */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {isSearching && (
                        <div className="text-center py-8">
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-gray-600">Searching for courses...</p>
                        </div>
                    )}

                    {!isSearching && searchResults.length === 0 && !error && !searchTerm && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-2">Search for golf courses to get started</p>
                            <p className="text-sm text-gray-400">
                                Try searching for course names like "Pebble Beach" or locations like "California"
                            </p>
                        </div>
                    )}

                    {!isSearching && searchResults.length === 0 && error && !isOfflineMode && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-4">No courses found</p>
                            <Button
                                variant="outline"
                                onClick={handleClearSearch}
                            >
                                Start New Search
                            </Button>
                        </div>
                    )}

                    {!isSearching && searchResults.map((course, index) => (
                        <div
                            key={course.id || course.externalApiId || index}
                            className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${isImporting ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            onClick={() => !isImporting && handleCourseSelect(course)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">{course.name}</div>
                                    {course.location && (
                                        <div className="text-sm text-gray-600 mt-1">{course.location}</div>
                                    )}
                                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                        <span>Rating: {course.courseRating}</span>
                                        <span>Slope: {course.slopeRating}</span>
                                        {course.holes.length > 0 && (
                                            <span>Holes: {course.holes.length}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {course.isImported && (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                            Available
                                        </span>
                                    )}
                                    {!course.isImported && course.externalApiId && (
                                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                            {isImporting ? 'Importing...' : 'Will Import'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Import Status */}
                {isImporting && (
                    <div className="mt-4 text-center py-2 text-blue-600">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                        <span className="text-sm">Importing course data...</span>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>
                            {isOfflineMode ? 'Connection issues' : 'Connected'}
                        </span>
                        <span>
                            {searchResults.length > 0 && `${searchResults.length} course${searchResults.length !== 1 ? 's' : ''} found`}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}