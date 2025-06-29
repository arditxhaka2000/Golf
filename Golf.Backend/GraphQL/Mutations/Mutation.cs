// Golf.Backend/GraphQL/Mutations/Mutation.cs
// Complete merged mutation class with auth, golf mutations, and all type descriptors

using Golf.Backend.Data;
using Golf.Backend.Models;
using Golf.Backend.Services;
using Golf.Backend.Services.Interfaces;
using Golf.Backend.GraphQL.Types;
using HotChocolate.Authorization;
using HotChocolate.Types;

namespace Golf.Backend.GraphQL.Mutations
{
    // ========== MAIN MUTATION CLASS ==========
    public class Mutation
    {
        public async Task<LoginPayload> Login(LoginInput input, [Service] IAuthService authService)
        {

            if (string.IsNullOrWhiteSpace(input.Username))
            {
                throw new GraphQLException("Username is required");
            }

            if (string.IsNullOrWhiteSpace(input.Password))
            {
                throw new GraphQLException("Password is required");
            }

            var result = await authService.LoginAsync(input.Username, input.Password);
            if (result == null)
            {
                throw new GraphQLException("Invalid username or password");
            }

            return new LoginPayload
            {
                Token = result.Value.token,
                User = result.Value.user
            };
        }

        public async Task<RegisterPayload> Register(RegisterInput input, [Service] IAuthService authService)
        {
            if (string.IsNullOrWhiteSpace(input.Username) || input.Username.Length < 3)
            {
                throw new GraphQLException("Username must be at least 3 characters long");
            }

            if (string.IsNullOrWhiteSpace(input.Email) || !input.Email.Contains('@'))
            {
                throw new GraphQLException("Invalid email address");
            }

            if (string.IsNullOrWhiteSpace(input.Password) || input.Password.Length < 6)
            {
                throw new GraphQLException("Password must be at least 6 characters long");
            }

            try
            {
                var user = await authService.RegisterAsync(input.Username, input.Email, input.Password);
                var loginResult = await authService.LoginAsync(input.Username, input.Password);

                if (loginResult == null)
                {
                    throw new GraphQLException("Registration succeeded but login failed");
                }

                return new RegisterPayload
                {
                    Token = loginResult.Value.token,
                    User = loginResult.Value.user
                };
            }
            catch (InvalidOperationException ex)
            {
                throw new GraphQLException(ex.Message);
            }
        }

        public async Task<LogoutPayload> Logout(string token, [Service] IAuthService authService)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new GraphQLException("Token is required");
            }

            if (!await authService.IsTokenValidAsync(token))
            {
                throw new GraphQLException("Invalid or expired token");
            }

            await authService.LogoutAsync(token);

            return new LogoutPayload
            {
                Success = true,
                Message = "Successfully logged out"
            };
        }

        public async Task<Player> CreatePlayer(CreatePlayerInput input, string token, [Service] IPlayerService playerService, [Service] IAuthService authService)
        {
            var user = await authService.GetCurrentUserAsync(token);
            if (user == null)
            {
                throw new GraphQLException("Invalid or expired token");
            }

            if (!Enum.TryParse<Gender>(input.Gender.ToString(), true, out var genderEnum))
            {
                throw new GraphQLException("Invalid gender. Must be 'Male' or 'Female'");
            }

            return await playerService.CreatePlayerAsync(
                userId: user.Id.ToString(),
                name: input.Name,
                gender: genderEnum
            );
        }

        public async Task<Round> SaveRound(SaveRoundInput input, string token, [Service] IRoundService roundService, [Service] IAuthService authService, [Service] IPlayerService playerService)
        {
            var user = await authService.GetCurrentUserAsync(token);
            if (user == null)
            {
                throw new GraphQLException("Invalid or expired token");
            }

            var player = await playerService.EnsurePlayerExistsAsync(user.Id, user.Username);

            if (player == null)
            {
                throw new GraphQLException("Player profile not found");
            }


            return await roundService.SaveRoundAsync(
                playerId: player.Id,
                courseId: input.CourseId,
                datePlayed: input.DatePlayed,
                playerHandicap: player.CurrentHandicap,
                Holes: input.Holes
            );
        }

        public async Task<Course> ImportCourse(string externalId, [Service] ICourseService courseService)
        {
            return await courseService.ImportCourseFromApiAsync(externalId);
        }

        public async Task<IEnumerable<CourseSearchResult>> SearchCourses(string name, [Service] ICourseService courseService)
        {
            return await courseService.SearchCoursesAsync(name);
        }
    }

    // Input/Output records
    public record LoginInput(string Username, string Password);
    public record RegisterInput(string Username, string Email, string Password);
    public record RoundHoleInput(int HoleNumber, int Strokes);

    public record LoginPayload
    {
        public string Token { get; init; } = string.Empty;
        public User User { get; init; } = null!;
    }

    public record RegisterPayload
    {
        public string Token { get; init; } = string.Empty;
        public User User { get; init; } = null!;
    }

    public record LogoutPayload
    {
        public bool Success { get; init; }
        public string Message { get; init; } = string.Empty;
    }
}