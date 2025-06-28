using Golf.Backend.Data;
using Golf.Backend.Models;
using Golf.Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Golf.Backend.Services
{
    public class RoundService : IRoundService
    {
        private readonly GolfDbContext _context;
        private readonly IHandicapService _handicapService;
        private readonly ILogger<RoundService> _logger;

        public RoundService(GolfDbContext context, IHandicapService handicapService, ILogger<RoundService> logger)
        {
            _context = context;
            _handicapService = handicapService;
            _logger = logger;
        }

        public async Task<Round?> GetRoundAsync(Guid id)
        {
            return await _context.Rounds
                .Include(r => r.Player)
                .Include(r => r.Course)
                .ThenInclude(c => c.Holes)
                .Include(r => r.RoundHoles)
                .ThenInclude(rh => rh.Hole)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<IEnumerable<Round>> GetPlayerRoundsAsync(Guid playerId, int limit = 20)
        {
            return await _context.Rounds
                .Include(r => r.Course)
                .Include(r => r.RoundHoles)
                .ThenInclude(rh => rh.Hole)
                .Where(r => r.PlayerId == playerId)
                .OrderByDescending(r => r.DatePlayed)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<Round> SaveRoundAsync(Guid playerId, int courseId, DateTime datePlayed,
            decimal? playerHandicap, Dictionary<int, int> holeScores)
        {
            var course = await _context.Courses
                .Include(c => c.Holes)
                .FirstOrDefaultAsync(c => c.Id == courseId);

            if (course == null)
            {
                throw new ArgumentException("Course not found");
            }

            var player = await _context.Players.FindAsync(playerId);
            if (player == null)
            {
                throw new ArgumentException("Player not found");
            }

            // Calculate total strokes
            var totalStrokes = holeScores.Values.Sum();

            // Prepare data for calculations
            var holes = course.Holes.OrderBy(h => h.HoleNumber).ToList();
            var holeCalculationData = holes.Select(h => (
                strokes: holeScores.GetValueOrDefault(h.HoleNumber, 0),
                par: h.Par,
                handicap: h.Handicap
            )).ToList();

            // Calculate gross score (Stableford points)
            var grossScore = _handicapService.CalculateGrossScore(
                holeCalculationData.Select(h => (h.strokes, h.par)).ToList()
            );

            // Calculate net score and handicap differential
            var netScore = grossScore; // Default to gross if no handicap
            var handicapDifferential = 0m;

            if (playerHandicap.HasValue)
            {
                netScore = _handicapService.CalculateNetScore(holeCalculationData, playerHandicap.Value);

                // Calculate adjusted score for handicap differential
                var additionalStrokes = _handicapService.DistributeAdditionalStrokes(
                    playerHandicap.Value,
                    holes.Select(h => h.Handicap).ToList()
                );

                // FIX: Prepare data correctly for CalculateAdjustedScore method
                // The method expects (int strokes, int par, int additionalStrokes)
                var adjustedScoreData = holes.Select(h => (
                    strokes: holeScores.GetValueOrDefault(h.HoleNumber, 0),
                    par: h.Par,
                    additionalStrokes: additionalStrokes.GetValueOrDefault(h.Handicap, 0)
                )).ToList();

                var adjustedScore = _handicapService.CalculateAdjustedScore(adjustedScoreData);
                handicapDifferential = _handicapService.CalculateHandicapDifferential(
                    adjustedScore, course.CourseRating, course.SlopeRating
                );
            }

            // Create round
            var round = new Round
            {
                Id = Guid.NewGuid(),
                PlayerId = playerId,
                CourseId = courseId,
                DatePlayed = datePlayed,
                PlayerHandicapAtTime = playerHandicap,
                TotalStrokes = totalStrokes,
                GrossScore = grossScore,
                NetScore = netScore,
                HandicapDifferential = handicapDifferential,
                CreatedAt = DateTime.UtcNow
            };

            // Create round holes
            foreach (var hole in holes)
            {
                var strokes = holeScores.GetValueOrDefault(hole.HoleNumber, 0);
                var additionalStrokes = 0;

                if (playerHandicap.HasValue)
                {
                    var additionalStrokesDict = _handicapService.DistributeAdditionalStrokes(
                        playerHandicap.Value,
                        holes.Select(h => h.Handicap).ToList()
                    );
                    additionalStrokes = additionalStrokesDict.GetValueOrDefault(hole.Handicap, 0);
                }

                var roundHole = new RoundHole
                {
                    Id = Guid.NewGuid(),
                    RoundId = round.Id,
                    HoleId = hole.Id,
                    Strokes = strokes,
                    AdditionalStrokes = additionalStrokes
                };

                round.RoundHoles.Add(roundHole);
            }

            _context.Rounds.Add(round);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Saved round for player {PlayerId} on course {CourseId}", playerId, courseId);
            return round;
        }
    }
}
