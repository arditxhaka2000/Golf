using Golf.Backend.Services.Interfaces;

namespace Golf.Backend.Services
{
    public class HandicapService : IHandicapService
    {
        public int CalculateGrossScore(List<(int strokes, int par)> holeScores)
        {
            int totalPoints = 0;

            foreach (var (strokes, par) in holeScores)
            {
                var scoreToPar = strokes - par;

                var points = scoreToPar switch
                {
                    <= -3 => 5, // Albatross or better
                    -2 => 4,    // Eagle
                    -1 => 3,    // Birdie
                    0 => 2,     // Par
                    1 => 1,     // Bogey
                    _ => 0      // Double bogey or worse
                };

                totalPoints += points;
            }

            return totalPoints;
        }

        public int CalculateNetScore(List<(int strokes, int par, int handicap)> holeScores, decimal handicapIndex)
        {
            var additionalStrokes = DistributeAdditionalStrokes(handicapIndex, holeScores.Select(h => h.handicap).ToList());
            int totalPoints = 0;

            foreach (var (strokes, par, handicap) in holeScores)
            {
                var extraStrokes = additionalStrokes.GetValueOrDefault(handicap, 0);
                var adjustedPar = par + extraStrokes;
                var scoreToPar = strokes - adjustedPar;

                var points = scoreToPar switch
                {
                    <= -3 => 5, // Albatross or better
                    -2 => 4,    // Eagle
                    -1 => 3,    // Birdie
                    0 => 2,     // Par
                    1 => 1,     // Bogey
                    _ => 0      // Double bogey or worse
                };

                totalPoints += points;
            }

            return totalPoints;
        }

        public decimal CalculateHandicapDifferential(int adjustedScore, decimal courseRating, int slopeRating)
        {
            return (113m / slopeRating) * (adjustedScore - courseRating);
        }

        public decimal CalculateHandicapIndex(List<decimal> handicapDifferentials)
        {
            if (handicapDifferentials.Count < 5)
            {
                return 0; // Need at least 5 rounds
            }

            var sortedDiffs = handicapDifferentials.OrderBy(d => d).ToList();

            // Take best 8 from last 20 (or available count)
            var numberOfScoresToUse = Math.Min(8, sortedDiffs.Count / 2);
            if (numberOfScoresToUse == 0) numberOfScoresToUse = 1;

            var bestDiffs = sortedDiffs.Take(numberOfScoresToUse);
            return Math.Round(bestDiffs.Average(), 1);
        }

        public Dictionary<int, int> DistributeAdditionalStrokes(decimal handicapIndex, List<int> holeHandicaps)
        {
            var result = new Dictionary<int, int>();
            var roundedHandicap = (int)Math.Round(handicapIndex, MidpointRounding.AwayFromZero);

            // Initialize all holes with 0 additional strokes
            foreach (var holeHandicap in holeHandicaps.Distinct())
            {
                result[holeHandicap] = 0;
            }

            // Distribute strokes based on hole handicap order
            var strokesRemaining = Math.Abs(roundedHandicap);
            var strokesPerRound = strokesRemaining / 18;
            var extraStrokes = strokesRemaining % 18;

            // Give base strokes to all holes
            foreach (var holeHandicap in holeHandicaps.Distinct())
            {
                result[holeHandicap] = strokesPerRound;
            }

            // Distribute remaining strokes starting with hardest holes (handicap 1)
            for (int i = 1; i <= extraStrokes && i <= 18; i++)
            {
                if (result.ContainsKey(i))
                {
                    result[i]++;
                }
            }

            // Handle negative handicaps (subtract strokes)
            if (handicapIndex < 0)
            {
                foreach (var key in result.Keys.ToList())
                {
                    result[key] = -result[key];
                }
            }

            return result;
        }

        public int CalculateAdjustedScore(List<(int strokes, int par, int additionalStrokes)> holeScores)
        {
            int adjustedTotal = 0;

            foreach (var (strokes, par, additionalStrokes) in holeScores)
            {
                var netDoubleBogey = par + additionalStrokes + 2;
                var adjustedStrokes = Math.Min(strokes, netDoubleBogey);
                adjustedTotal += adjustedStrokes;
            }

            return adjustedTotal;
        }
    }
}

