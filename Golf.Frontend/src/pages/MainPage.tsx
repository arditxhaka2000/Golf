// Golf.Frontend/src/pages/MainPage.tsx
// Updated to use the new component structure
// CHANGE REASON: Updated import names to match new component structure
// CHANGE REASON: GolfHandicapCalculator now refers to the handicap history page (REQ 1-8)
// CHANGE REASON: GolfScoreCalculator is the score entry page (REQ 1-1 through 1-7)

import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { GolfScoreCalculator } from "../components/GolfScoreCalculator";
import { GolfHandicapCalculator } from "../components/GolfHandicapCalculator";
import { useState } from "react";

function MainPage() {
    const { logout } = useAuth();
    const [selectedPage, setSelectedPage] = useState<'score' | 'handicap'>('score');

    return (
        <div className="flex min-h-screen justify-center items-center bg-white w-full">
            <div className="w-3/5 mx-auto">
                <header className="flex flex-col items-center mb-4">
                    <h1 className="text-3xl font-bold mb-2 text-center">Golf Results Tracker</h1>
                </header>

                {/* Pill Tab Switcher - Matches the original design */}
                <div className="flex justify-center mb-6">
                    <div className="relative w-80 h-12 bg-gray-100 rounded-full flex items-center overflow-hidden border">
                        {/* Pill Glider */}
                        <div
                            className={`absolute top-1 left-1 h-10 rounded-full bg-blue-600 transition-transform duration-300 z-0`}
                            style={{
                                width: 'calc(50% - 0.25rem)',
                                transform: selectedPage === 'score' ? 'translateX(0)' : 'translateX(100%)',
                            }}
                        />
                        <button
                            className={`relative z-10 flex-1 h-full rounded-full font-medium transition-colors duration-200 focus:outline-none ${selectedPage === 'score' ? 'text-white' : 'text-blue-600'
                                }`}
                            onClick={() => setSelectedPage('score')}
                        >
                            Score Calculator
                        </button>
                        <button
                            className={`relative z-10 flex-1 h-full rounded-full font-medium transition-colors duration-200 focus:outline-none ${selectedPage === 'handicap' ? 'text-white' : 'text-blue-600'
                                }`}
                            onClick={() => setSelectedPage('handicap')}
                        >
                            Handicap Calculator
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <main>
                    {selectedPage === 'score' ? (
                        // REQ 1-1 through 1-7: Score entry with all features
                        <GolfScoreCalculator />
                    ) : (
                        // REQ 1-8: Handicap history and calculation
                        <GolfHandicapCalculator />
                    )}
                </main>

                {/* Logout Button */}
                <div className="flex justify-end">
                    <Button onClick={logout} variant="outline" className="mb-2">
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default MainPage;