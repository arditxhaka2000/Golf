using Golf.Backend.Models;

namespace Golf.Backend.Services.Interfaces
{
    public interface IAuthService
    {
        Task<(User user, string token)?> LoginAsync(string username, string password);
        Task<User> RegisterAsync(string username, string email, string password);
        Task<User?> GetCurrentUserAsync(string token);
        Task LogoutAsync(string token);
        Task<bool> IsTokenValidAsync(string token);
    }
}
