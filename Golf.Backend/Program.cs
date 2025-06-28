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

// Register services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPlayerService, PlayerService>();
builder.Services.AddScoped<ICourseService, CourseService>();
builder.Services.AddScoped<IRoundService, RoundService>();
builder.Services.AddScoped<IHandicapService, HandicapService>();
builder.Services.AddScoped<IGolfCourseApiService, GolfCourseApiService>();

// Configure Golf Course API
builder.Services.Configure<GolfCourseApiOptions>(
    builder.Configuration.GetSection("GolfCourseApi"));

builder.Services.AddHttpClient<IGolfCourseApiService, GolfCourseApiService>();

// Add GraphQL with ALL required types
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddType<PlayerType>()
    .AddType<CourseType>()
    .AddType<CourseSearchResultType>()  // Added this
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
