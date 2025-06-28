using Golf.Backend.Data;
using Golf.Backend.Models;
using Golf.Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Golf.Backend.Services
{
    public class AuthService : IAuthService
    {
        private readonly GolfDbContext _context;

        public AuthService(GolfDbContext context)
        {
            _context = context;
        }

        public async Task<(User user, string token)?> LoginAsync(string username, string password)
        {
            // UserStore first (faster), then database
            var user = UserStore.GetUserByUsername(username);

            if (user == null)
            {
                // Check database if not in UserStore
                user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
                if (user != null)
                {
                    // Add to UserStore for future quick access
                    UserStore.AddUser(user);
                }
            }

            if (user == null || !PasswordHasher.VerifyPassword(password, user.PasswordHash))
            {
                return null;
            }

            var token = GenerateToken();
            UserStore.AddToken(token, username);
            return (user, token);
        }

        public async Task<User> RegisterAsync(string username, string email, string password)
        {
            // Check both UserStore and Database for conflicts
            if (UserStore.IsUsernameTaken(username) || await _context.Users.AnyAsync(u => u.Username == username))
            {
                throw new InvalidOperationException("Username is already taken");
            }

            if (UserStore.IsEmailTaken(email) || await _context.Users.AnyAsync(u => u.Email == email))
            {
                throw new InvalidOperationException("Email is already taken");
            }

            var user = new User
            {
                Id = Guid.NewGuid().ToString(),
                Username = username,
                Email = email,
                PasswordHash = PasswordHasher.HashPassword(password)
            };

            // Save to both UserStore (for current session) and Database (for persistence)
            UserStore.AddUser(user);
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return user;
        }

        public async Task<User?> GetCurrentUserAsync(string token)
        {
            // First try UserStore (faster)
            var user = UserStore.GetUserByToken(token);

            if (user == null && UserStore.IsValidToken(token))
            {
                // Token exists but user not in store, try database
                var username = GetUsernameFromToken(token);
                if (!string.IsNullOrEmpty(username))
                {
                    user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
                    if (user != null)
                    {
                        // Add back to UserStore
                        UserStore.AddUser(user);
                    }
                }
            }

            return user;
        }

        public async Task LogoutAsync(string token)
        {
            UserStore.RemoveToken(token);
        }

        public async Task<bool> IsTokenValidAsync(string token)
        {
            return UserStore.IsValidToken(token);
        }

        private string GenerateToken()
        {
            return Guid.NewGuid().ToString("N");
        }

        private string? GetUsernameFromToken(string token)
        {
            // This is a simple helper to get username from token
            // In UserStore, tokens map to usernames
            return UserStore.GetUserByToken(token)?.Username;
        }
    }
}