namespace Golf.Backend.Services.Interfaces
{
    public interface IHandicapService
    {
        /// <summary>
        /// Calculates Stableford points for gross score
        /// </summary>
        int CalculateGrossScore(List<(int strokes, int par)> holeScores);

        /// <summary>
        /// Calculates Stableford points for net score with handicap
        /// </summary>
        int CalculateNetScore(List<(int strokes, int par, int handicap)> holeScores, decimal handicapIndex);

        /// <summary>
        /// Calculates handicap differential using the formula: (113 / Slope Rating) x (Adjusted Score - Course Rating)
        /// </summary>
        decimal CalculateHandicapDifferential(int adjustedScore, decimal courseRating, int slopeRating);

        /// <summary>
        /// Calculates handicap index from a list of handicap differentials (average of best 8 from last 20)
        /// </summary>
        decimal CalculateHandicapIndex(List<decimal> handicapDifferentials);

        /// <summary>
        /// Distributes additional strokes across holes based on handicap index and hole difficulty
        /// </summary>
        Dictionary<int, int> DistributeAdditionalStrokes(decimal handicapIndex, List<int> holeHandicaps);

        /// <summary>
        /// Calculates adjusted score with net double bogey cap for handicap differential calculation
        /// </summary>
        int CalculateAdjustedScore(List<(int strokes, int par, int additionalStrokes)> holeScores);
    }
}
