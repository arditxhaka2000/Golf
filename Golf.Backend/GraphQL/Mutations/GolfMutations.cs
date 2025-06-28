using Golf.Backend.Models;
using Golf.Backend.Services.Interfaces;

namespace Golf.Backend.GraphQL.Mutations
{
    public class GolfMutations
    {
        // Player mutations
        public async Task<Player> CreatePlayerAsync(
            CreatePlayerInput input,
            string token,
            [Service] IAuthService authService,
            [Service] IPlayerService playerService)
        {
            var user = await authService.GetCurrentUserAsync(token);
            if (user == null) throw new UnauthorizedAccessException();

            return await playerService.CreatePlayerAsync(user.Id, input.Name, input.Gender);
        }

        public async Task<Player> UpdateMyPlayerAsync(
            UpdatePlayerInput input,
            string token,
            [Service] IAuthService authService,
            [Service] IPlayerService playerService)
        {
            var user = await authService.GetCurrentUserAsync(token);
            if (user == null) throw new UnauthorizedAccessException();

            var player = await playerService.GetPlayerByUserIdAsync(user.Id);
            if (player == null) throw new ArgumentException("Player profile not found");

            return await playerService.UpdatePlayerAsync(player.Id, input.Name, input.Gender);
        }

        // Round mutations
        public async Task<Round> SaveRoundAsync(
            SaveRoundInput input,
            string token,
            [Service] IAuthService authService,
            [Service] IPlayerService playerService,
            [Service] IRoundService roundService)
        {
            var user = await authService.GetCurrentUserAsync(token);
            if (user == null) throw new UnauthorizedAccessException();

            var player = await playerService.EnsurePlayerExistsAsync(user.Id, user.Username);

            return await roundService.SaveRoundAsync(
                player.Id,
                input.CourseId,
                input.DatePlayed,
                input.PlayerHandicap,
                input.HoleScores);
        }

        // Course mutations
        public async Task<Course> ImportCourseAsync(
            string externalId,
            [Service] ICourseService courseService)
        {
            return await courseService.ImportCourseFromApiAsync(externalId);
        }
    }
    public record CreatePlayerInput(string Name, Gender Gender);
    public record UpdatePlayerInput(string Name, Gender Gender);
    public record SaveRoundInput(
        int CourseId,
        DateTime DatePlayed,
        decimal? PlayerHandicap,
        Dictionary<int, int> HoleScores,
            List<RoundHoleInput> Holes);
}