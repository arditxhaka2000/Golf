using Golf.Backend.Models;
using Golf.Backend.Services.Interfaces;
using Golf.Backend.Services;
using HotChocolate.Types;

namespace Golf.Backend.GraphQL;

public class Query
{
    public string Hello() => "Hello from GraphQL!";

    // Auth queries
    public async Task<Golf.Backend.Models.User?> GetCurrentUserAsync(
        string token,
        [Service] IAuthService authService)
    {
        return await authService.GetCurrentUserAsync(token);
    }

    // Player queries
    public async Task<Player?> GetPlayerAsync(
        [ID] Guid id,
        [Service] IPlayerService playerService)
    {
        return await playerService.GetPlayerAsync(id);
    }

    public async Task<Player?> GetMyPlayerAsync(
        string token,
        [Service] IAuthService authService,
        [Service] IPlayerService playerService)
    {
        var user = await authService.GetCurrentUserAsync(token);
        if (user == null) return null;
        return await playerService.GetPlayerByUserIdAsync(user.Id);
    }

    public async Task<IEnumerable<Player>> GetPlayersAsync(
        [Service] IPlayerService playerService)
    {
        return await playerService.GetPlayersAsync();
    }

    // Course queries (local database)
    public async Task<Course?> GetCourseAsync(
        [ID] int id,
        [Service] ICourseService courseService)
    {
        return await courseService.GetCourseAsync(id);
    }

    public async Task<IEnumerable<Course>> GetCoursesAsync(
        [Service] ICourseService courseService)
    {
        return await courseService.GetCoursesAsync();
    }

    public async Task<IEnumerable<CourseSearchResult>> SearchCoursesAsync(
     string name,
     [Service] ICourseService courseService)
    {
        return await courseService.SearchCoursesAsync(name);
    }


    public async Task<CourseDetails?> GetExternalCourseDetailsAsync(
        string courseId,
        [Service] IGolfCourseApiService golfCourseApiService)
    {
        if (string.IsNullOrWhiteSpace(courseId))
        {
            return null;
        }

        return await golfCourseApiService.GetCourseDetailsAsync(courseId);
    }

    // Round queries
    public async Task<IEnumerable<Round>> GetPlayerRoundsAsync(
        [ID] Guid playerId,
        int limit,
        [Service] IRoundService roundService)
    {
        return await roundService.GetPlayerRoundsAsync(playerId, limit);
    }

    public async Task<IEnumerable<Round>> GetMyRoundsAsync(
        string token,
        int limit,
        [Service] IAuthService authService,
        [Service] IPlayerService playerService,
        [Service] IRoundService roundService)
    {
        var user = await authService.GetCurrentUserAsync(token);
        if (user == null) throw new UnauthorizedAccessException();

        var player = await playerService.GetPlayerByUserIdAsync(user.Id);
        if (player == null) throw new ArgumentException("Player profile not found");

        return await roundService.GetPlayerRoundsAsync(player.Id, limit);
    }

    // Handicap queries
    public async Task<decimal?> CalculateHandicapAsync(
        [ID] Guid playerId,
        [Service] IPlayerService playerService)
    {
        return await playerService.CalculateCurrentHandicapAsync(playerId);
    }

    public async Task<decimal?> CalculateMyHandicapAsync(
        string token,
        [Service] IAuthService authService,
        [Service] IPlayerService playerService)
    {
        var user = await authService.GetCurrentUserAsync(token);
        if (user == null) throw new UnauthorizedAccessException();

        var player = await playerService.GetPlayerByUserIdAsync(user.Id);
        if (player == null) throw new ArgumentException("Player profile not found");

        return await playerService.CalculateCurrentHandicapAsync(player.Id);
    }
}

