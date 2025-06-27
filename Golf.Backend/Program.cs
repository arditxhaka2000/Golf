using Golf.Backend.GraphQL;
using Golf.Backend.GraphQL.Mutations;

var builder = WebApplication.CreateBuilder(args);

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Vite's default port
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Add GraphQL services
builder.Services
    .AddGraphQLServer()
    .AddQueryType<QueryType>()
    .AddMutationType<AuthMutationsType>();

var app = builder.Build();

// Use CORS
app.UseCors();

// Configure GraphQL endpoint
app.MapGraphQL();

app.Run();
