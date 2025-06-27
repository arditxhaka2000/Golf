using Golf.Backend.Data;
using Golf.Backend.Models;
using Golf.Backend.Services;
using HotChocolate.Authorization;

namespace Golf.Backend.GraphQL.Mutations;

public class AuthMutationsType
{
    public async Task<LoginPayload> Login(LoginInput input)
    {
        var user = UserStore.GetUserByUsername(input.Username);
        if (user == null)
        {
            throw new GraphQLException("User not found");
        }

        if (!PasswordHasher.VerifyPassword(input.Password, user.PasswordHash))
        {
            throw new GraphQLException("Invalid password");
        }

        var token = Guid.NewGuid().ToString();
        UserStore.AddToken(token, user.Username);

        return new LoginPayload
        {
            Token = token,
            User = user
        };
    }

    public async Task<RegisterPayload> Register(RegisterInput input)
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

        if (UserStore.IsUsernameTaken(input.Username))
        {
            throw new GraphQLException("Username already exists");
        }

        if (UserStore.IsEmailTaken(input.Email))
        {
            throw new GraphQLException("Email already registered");
        }

        var user = new User
        {
            Username = input.Username,
            Email = input.Email,
            PasswordHash = PasswordHasher.HashPassword(input.Password)
        };

        UserStore.AddUser(user);

        var token = Guid.NewGuid().ToString();
        UserStore.AddToken(token, user.Username);

        return new RegisterPayload
        {
            Token = token,
            User = user
        };
    }

    public async Task<LogoutPayload> Logout(string token)
    {
        if (!UserStore.IsValidToken(token))
        {
            throw new GraphQLException("Invalid token");
        }

        UserStore.RemoveToken(token);

        return new LogoutPayload
        {
            Success = true
        };
    }
}

public record LoginInput(string Username, string Password);
public record RegisterInput(string Username, string Email, string Password);

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
} 