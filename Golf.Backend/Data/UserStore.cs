using System.Collections.Concurrent;
using Golf.Backend.Models;

namespace Golf.Backend.Data;

public class UserStore
{
    private static readonly ConcurrentDictionary<string, User> _users = new();
    private static readonly ConcurrentDictionary<string, string> _tokens = new();

    public static User? GetUserByUsername(string username)
    {
        return _users.TryGetValue(username, out var user) ? user : null;
    }

    public static User? GetUserByToken(string token)
    {
        return _tokens.TryGetValue(token, out var username) ? GetUserByUsername(username) : null;
    }

    public static bool IsValidToken(string token)
    {
        return _tokens.ContainsKey(token);
    }

    public static void AddUser(User user)
    {
        _users[user.Username] = user;
    }

    public static void AddToken(string token, string username)
    {
        _tokens[token] = username;
    }

    public static void RemoveToken(string token)
    {
        _tokens.TryRemove(token, out _);
    }

    public static bool IsUsernameTaken(string username)
    {
        return _users.ContainsKey(username);
    }

    public static bool IsEmailTaken(string email)
    {
        return _users.Values.Any(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
    }
    //Some additional methods for user management
    public static User? GetUserById(string userId)
    {
        return _users.Values.FirstOrDefault(u => u.Id == userId);
    }

    public static IEnumerable<User> GetAllUsers()
    {
        return _users.Values;
    }
} 