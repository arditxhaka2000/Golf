using Golf.Backend.Data;
using Golf.Backend.Models;
using Golf.Backend.Services.Interfaces;

namespace Golf.Backend.Services
{
    public class AuthService : IAuthService
    {
        public async Task<(User user, string token)?> LoginAsync(string username, string password)
        {
            var user = UserStore.GetUserByUsername(username);
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
            if (UserStore.IsUsernameTaken(username))
            {
                throw new InvalidOperationException("Username is already taken");
            }

            if (UserStore.IsEmailTaken(email))
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

            UserStore.AddUser(user);
            return user;
        }

        public async Task<User?> GetCurrentUserAsync(string token)
        {
            return UserStore.GetUserByToken(token);
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
    }
}
