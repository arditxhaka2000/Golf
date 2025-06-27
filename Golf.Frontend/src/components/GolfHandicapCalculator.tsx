import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAuth } from '../contexts/AuthContext';

export function GolfHandicapCalculator() {
  const { username } = useAuth();
  const [courseName, setCourseName] = useState('');
  const [courseRating, setCourseRating] = useState('0');
  const [slopeRating, setSlopeRating] = useState('0');
  const [userHandicap, setUserHandicap] = useState('0');
  const [scores, setScores] = useState(Array(18).fill(''));
  const [handicap, setHandicap] = useState<number | null>(null);

  // For demonstration, par values for each hole
  const parValues = [4, 3, 5, 4, 4, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 4, 4, 5];

  const handleScoreChange = (index: number, value: string) => {
    const newScores = [...scores];
    newScores[index] = value;
    setScores(newScores);
  };

  const handleClearScores = () => {
    setScores(Array(18).fill(''));
  };

  const totalScore = scores.reduce((acc, score) => acc + (parseInt(score, 10) || 0), 0);
  const totalPar = parValues.reduce((acc, par) => acc + par, 0);
  const toPar = totalScore - totalPar;

  
  return (
   <div className="max-w-[1200px] my-8">
      <div className="pb-4">
        <p className="text-sm text-muted-foreground mt-2">Enter your scores for each hole to calculate your round statistics and handicap differential</p>
      </div>
      {/* Player/Course Info */}
      <div className="gap-6">
        <div className="flex gap-[20pt]">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Player Name</label>
            <Input type="text" value={username ?? ''} readOnly />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Course Name</label>
            <Input type="text" placeholder="Golf Course" value={courseName} onChange={e => setCourseName(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Course Rating</label>
            <Input type="number" placeholder="72" value={courseRating} onChange={e => setCourseRating(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Slope Rating</label>
            <Input type="number" placeholder="113" value={slopeRating} onChange={e => setSlopeRating(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Your Handicap</label>
            <Input type="number" placeholder="0" value={userHandicap} onChange={e => setUserHandicap(e.target.value)} />
          </div>
        </div>
      </div>
      {/* Holes Grid */}
      <div className="grid grid-cols-2 gap-8 mb-6 mt-10">
        {/* Front 9 */}
        <div>
          <div className="font-semibold mb-2">Front 9</div>
          <div className="space-y-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center rounded-full border text-xs font-semibold bg-muted">{i + 1}</div>
                <span className="w-10 text-xs text-muted-foreground">Par {parValues[i]}</span>
                <Input
                  type="number"
                  className="w-20"
                  value={scores[i]}
                  onChange={e => handleScoreChange(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
        {/* Back 9 */}
        <div>
          <div className="font-semibold mb-2">Back 9</div>
          <div className="space-y-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i + 9} className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center rounded-full border text-xs font-semibold bg-muted">{i + 10}</div>
                <span className="w-10 text-xs text-muted-foreground">Par {parValues[i + 9]}</span>
                <Input
                  type="number"
                  className="w-20"
                  value={scores[i + 9]}
                  onChange={e => handleScoreChange(i + 9, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Summary Section */}
      <div className="grid grid-cols-5 gap-6 mb-6">
        <div className="rounded-lg border p-2 text-center">
          <div className="text-xs text-muted-foreground">Total Score</div>
          <div className="text-xl font-bold">{totalScore}</div>
        </div>
        <div className="rounded-lg border p-2 text-center">
          <div className="text-xs text-muted-foreground">Gross Score</div>
          <div className="text-xl font-bold">0</div>
        </div>
        <div className="rounded-lg border p-2 text-center">
          <div className="text-xs text-muted-foreground">Net Score</div>
          <div className="text-xl font-bold">0</div>
        </div>
        <div className="rounded-lg border p-2 text-center">
          <div className="text-xs text-muted-foreground">To Par</div>
          <div className={`text-xl font-bold ${toPar < 0 ? 'text-green-600' : toPar > 0 ? 'text-red-600' : ''}`}>{toPar > 0 ? '+' : ''}{toPar}</div>
        </div>
        <div className="rounded-lg border p-2 text-center">
          <div className="text-xs text-muted-foreground">Handicap Diff</div>
          <div className="text-xl font-bold">{handicap ?? 0}</div>
        </div>
      </div>
      {/* Action Buttons and Completed Holes */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClearScores}>Clear All Scores</Button>
          <Button variant="outline">Save Round</Button>
        </div>
      </div>
    </div>
  );
} 