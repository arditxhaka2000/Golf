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
        // ========== AUTH MUTATIONS ==========

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

        // ========== GOLF MUTATIONS ==========

        public async Task<Player> CreatePlayer(CreatePlayerInput input, string token, [Service] IPlayerService playerService, [Service] IAuthService authService)
        {
            var user = await authService.GetCurrentUserAsync(token);
            if (user == null)
            {
                throw new GraphQLException("Invalid or expired token");
            }

            // Parse gender string to Gender enum
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

            var player = await playerService.GetPlayerByUserIdAsync(user.Id);
            if (player == null)
            {
                throw new GraphQLException("Player profile not found");
            }

            // Convert the input format to match your IRoundService signature
            var holeScores = input.Holes.ToDictionary(h => h.HoleNumber, h => h.Strokes);

            return await roundService.SaveRoundAsync(
                playerId: player.Id,
                courseId: input.CourseId,
                datePlayed: input.DatePlayed,
                playerHandicap: player.CurrentHandicap,
                holeScores: holeScores
            );
        }

        public async Task<Course> ImportCourse(string externalId, [Service] ICourseService courseService, [Service] IGolfCourseApiService golfCourseApiService)
        {
            var courseDetails = await golfCourseApiService.GetCourseDetailsAsync(externalId);
            if (courseDetails == null)
            {
                throw new GraphQLException("Course not found in external API");
            }

            // Fixed: Pass externalId instead of courseDetails
            return await courseService.ImportCourseFromApiAsync(externalId);
        }

        public async Task<IEnumerable<CourseSearchResult>> SearchCourses(string name, [Service] ICourseService courseService)
        {
            return await courseService.SearchCoursesAsync(name);
        }
    }

    // ========== INPUT/OUTPUT RECORDS ==========

    // Auth input types
    public record LoginInput(string Username, string Password);
    public record RegisterInput(string Username, string Email, string Password);

    // Auth payload types
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

    // Golf input types
    public record RoundHoleInput(int HoleNumber, int Strokes);

    // ========== GRAPHQL TYPE DESCRIPTORS ==========

    // Auth Input Type Configurations
    public class LoginInputType : InputObjectType<LoginInput>
    {
        protected override void Configure(IInputObjectTypeDescriptor<LoginInput> descriptor)
        {
            descriptor.Name("LoginInput");
            descriptor.Description("Input for user login");
            descriptor.Field(i => i.Username)
                .Type<NonNullType<StringType>>()
                .Description("Username for login");
            descriptor.Field(i => i.Password)
                .Type<NonNullType<StringType>>()
                .Description("Password for login");
        }
    }

    public class RegisterInputType : InputObjectType<RegisterInput>
    {
        protected override void Configure(IInputObjectTypeDescriptor<RegisterInput> descriptor)
        {
            descriptor.Name("RegisterInput");
            descriptor.Description("Input for user registration");
            descriptor.Field(i => i.Username)
                .Type<NonNullType<StringType>>()
                .Description("Desired username (minimum 3 characters)");
            descriptor.Field(i => i.Email)
                .Type<NonNullType<StringType>>()
                .Description("Valid email address");
            descriptor.Field(i => i.Password)
                .Type<NonNullType<StringType>>()
                .Description("Password (minimum 6 characters)");
        }
    }

    // Auth Output Type Configurations
    public class LoginPayloadType : ObjectType<LoginPayload>
    {
        protected override void Configure(IObjectTypeDescriptor<LoginPayload> descriptor)
        {
            descriptor.Name("LoginPayload");
            descriptor.Description("Response payload for login");
            descriptor.Field(p => p.Token)
                .Type<NonNullType<StringType>>()
                .Description("Authentication token");
            descriptor.Field(p => p.User)
                .Type<NonNullType<UserType>>()
                .Description("Authenticated user information");
        }
    }

    public class RegisterPayloadType : ObjectType<RegisterPayload>
    {
        protected override void Configure(IObjectTypeDescriptor<RegisterPayload> descriptor)
        {
            descriptor.Name("RegisterPayload");
            descriptor.Description("Response payload for registration");
            descriptor.Field(p => p.Token)
                .Type<NonNullType<StringType>>()
                .Description("Authentication token");
            descriptor.Field(p => p.User)
                .Type<NonNullType<UserType>>()
                .Description("Newly registered user information");
        }
    }

    public class LogoutPayloadType : ObjectType<LogoutPayload>
    {
        protected override void Configure(IObjectTypeDescriptor<LogoutPayload> descriptor)
        {
            descriptor.Name("LogoutPayload");
            descriptor.Description("Response payload for logout");
            descriptor.Field(p => p.Success)
                .Type<NonNullType<BooleanType>>()
                .Description("Whether logout was successful");
            descriptor.Field(p => p.Message)
                .Type<StringType>()
                .Description("Optional message about the logout result");
        }
    }

    // Golf Input Type Configurations
    public class CreatePlayerInputType : InputObjectType<CreatePlayerInput>
    {
        protected override void Configure(IInputObjectTypeDescriptor<CreatePlayerInput> descriptor)
        {
            descriptor.Name("CreatePlayerInput");
            descriptor.Description("Input for creating a new player");
            descriptor.Field(i => i.Name)
                .Type<NonNullType<StringType>>()
                .Description("Player's full name");
            descriptor.Field(i => i.Gender)
                .Type<NonNullType<StringType>>()
                .Description("Player's gender (Male/Female)");
        }
    }

    public class SaveRoundInputType : InputObjectType<SaveRoundInput>
    {
        protected override void Configure(IInputObjectTypeDescriptor<SaveRoundInput> descriptor)
        {
            descriptor.Name("SaveRoundInput");
            descriptor.Description("Input for saving a golf round");
            descriptor.Field(i => i.CourseId)
                .Type<NonNullType<IdType>>()
                .Description("ID of the golf course");
            descriptor.Field(i => i.DatePlayed)
                .Type<NonNullType<DateTimeType>>()
                .Description("Date when the round was played");
            descriptor.Field(i => i.Holes)
                .Type<NonNullType<ListType<NonNullType<RoundHoleInputType>>>>()
                .Description("List of hole scores");
        }
    }

    public class RoundHoleInputType : InputObjectType<RoundHoleInput>
    {
        protected override void Configure(IInputObjectTypeDescriptor<RoundHoleInput> descriptor)
        {
            descriptor.Name("RoundHoleInput");
            descriptor.Description("Input for a single hole score");
            descriptor.Field(i => i.HoleNumber)
                .Type<NonNullType<IntType>>()
                .Description("Hole number (1-18)");
            descriptor.Field(i => i.Strokes)
                .Type<NonNullType<IntType>>()
                .Description("Number of strokes taken");
        }
    }
}