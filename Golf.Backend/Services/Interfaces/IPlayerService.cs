using Golf.Backend.Models;

namespace Golf.Backend.Services.Interfaces
{
    public interface IPlayerService
    {
        Task<Player?> GetPlayerAsync(Guid id);
        Task<Player?> GetPlayerByUserIdAsync(string userId);
        Task<IEnumerable<Player>> GetPlayersAsync();
        Task<Player> CreatePlayerAsync(string userId, string name, Gender gender);
        Task<Player> UpdatePlayerAsync(Guid id, string name, Gender gender);
        Task<decimal?> CalculateCurrentHandicapAsync(Guid playerId);
        Task<Player> EnsurePlayerExistsAsync(string userId, string defaultName);
    }
}
