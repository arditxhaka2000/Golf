﻿using Golf.Backend.GraphQL.Mutations;
using Golf.Backend.Models;

namespace Golf.Backend.Services.Interfaces
{
    public interface IRoundService
    {
        Task<Round?> GetRoundAsync(Guid id);
        Task<IEnumerable<Round>> GetPlayerRoundsAsync(Guid playerId, int limit = 20);
        Task<Round> SaveRoundAsync(Guid playerId, Guid courseId, DateTime datePlayed,
            decimal? playerHandicap, List<RoundHoleInput> Holes);
        Task<bool> DeleteRoundAsync(Guid roundId, string userId);
    }
}
