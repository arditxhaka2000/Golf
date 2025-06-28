using Golf.Backend.Data;
using Golf.Backend.Models;
using Golf.Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Golf.Backend.Services
{
    public class PlayerService : IPlayerService
    {
        private readonly GolfDbContext _context;
        private readonly IHandicapService _handicapService;

        public PlayerService(GolfDbContext context, IHandicapService handicapService)
        {
            _context = context;
            _handicapService = handicapService;
        }

        public async Task<Player?> GetPlayerAsync(Guid id)
        {
            return await _context.Players
                .Include(p => p.Rounds)
                .ThenInclude(r => r.Course)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Player?> GetPlayerByUserIdAsync(string userId)
        {
            return await _context.Players
                .Include(p => p.Rounds)
                .ThenInclude(r => r.Course)
                .FirstOrDefaultAsync(p => p.UserId == userId);
        }

        public async Task<IEnumerable<Player>> GetPlayersAsync()
        {
            return await _context.Players
                .Include(p => p.Rounds)
                .ToListAsync();
        }

        public async Task<Player> CreatePlayerAsync(string userId, string name, Gender gender)
        {
            var existingPlayer = await GetPlayerByUserIdAsync(userId);
            if (existingPlayer != null)
            {
                throw new InvalidOperationException("Player already exists for this user");
            }

            var player = new Player
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = name,
                Gender = gender,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Players.Add(player);
            await _context.SaveChangesAsync();

            return player;
        }

        public async Task<Player> UpdatePlayerAsync(Guid id, string name, Gender gender)
        {
            var player = await GetPlayerAsync(id);
            if (player == null)
            {
                throw new ArgumentException("Player not found");
            }

            player.Name = name;
            player.Gender = gender;
            player.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return player;
        }

        public async Task<decimal?> CalculateCurrentHandicapAsync(Guid playerId)
        {
            var player = await GetPlayerAsync(playerId);
            if (player == null) return null;

            var last20Rounds = player.Rounds
                .OrderByDescending(r => r.DatePlayed)
                .Take(20)
                .ToList();

            if (last20Rounds.Count < 5) return null; // Need at least 5 rounds

            var handicapDiffs = last20Rounds.Select(r => r.HandicapDifferential).ToList();
            var handicapIndex = _handicapService.CalculateHandicapIndex(handicapDiffs);

            // Update player's current handicap
            player.CurrentHandicap = handicapIndex;
            player.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return handicapIndex;
        }

        public async Task<Player> EnsurePlayerExistsAsync(string userId, string defaultName)
        {
            var player = await GetPlayerByUserIdAsync(userId);
            if (player == null)
            {
                // Create a default player profile
                player = await CreatePlayerAsync(userId, defaultName, Gender.Male);
            }
            return player;
        }
    }
}
