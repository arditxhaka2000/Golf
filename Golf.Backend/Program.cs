// Golf.Backend/Program.cs
// Enhanced with memory caching for API mitigation

using Golf.Backend.Data;
using Golf.Backend.GraphQL;
using Golf.Backend.GraphQL.Mutations;
using Golf.Backend.GraphQL.Types;
using Golf.Backend.Services;
using Golf.Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<GolfDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add memory caching for API mitigation
builder.Services.AddMemoryCache();

// Register services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPlayerService, PlayerService>();
builder.Services.AddScoped<ICourseService, CourseService>();
builder.Services.AddScoped<IRoundService, RoundService>();
builder.Services.AddScoped<IHandicapService, HandicapService>();
builder.Services.AddScoped<IGolfCourseApiService, GolfCourseApiService>();

// Configure Golf Course API with enhanced options
builder.Services.Configure<GolfCourseApiOptions>(options =>
{
    var config = builder.Configuration.GetSection("GolfCourseApi");
    options.BaseUrl = config["BaseUrl"] ?? "https://api.golfcourseapi.com";
    options.ApiKey = config["ApiKey"] ?? string.Empty;
    options.RateLimitMs = config.GetValue<int>("RateLimitMs", 1000);
    options.CircuitBreakerThreshold = config.GetValue<int>("CircuitBreakerThreshold", 3);
    options.CircuitBreakerTimeoutMinutes = config.GetValue<int>("CircuitBreakerTimeoutMinutes", 5);
    options.CacheExpiryHours = config.GetValue<int>("CacheExpiryHours", 24);
});

builder.Services.AddHttpClient<IGolfCourseApiService, GolfCourseApiService>(client =>
{
    // Configure HTTP client with timeout and retry policy
    client.Timeout = TimeSpan.FromSeconds(10);
});

// Add GraphQL with ALL required types
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddType<PlayerType>()
    .AddType<CourseType>()
    .AddType<CourseSearchResultType>()
    .AddType<RoundType>()
    .AddType<HoleType>()
    .AddType<RoundHoleType>()
    .AddType<UserType>()
    .AddType<ParBreakdownType>();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Use CORS
app.UseCors();

// Configure GraphQL endpoint
app.MapGraphQL();

app.Run();