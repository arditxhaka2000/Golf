using Golf.Backend.Data;
using Golf.Backend.Models;

namespace Golf.Backend.GraphQL.Types
{
    public class PlayerType : ObjectType<Player>
    {
        protected override void Configure(IObjectTypeDescriptor<Player> descriptor)
        {
            descriptor.Name("Player");
            descriptor.Description("Represents a golf player with their profile and handicap information");

            descriptor.Field(p => p.Id)
                .Type<NonNullType<IdType>>()
                .Description("Unique identifier for the player");

            descriptor.Field(p => p.UserId)
                .Type<NonNullType<StringType>>()
                .Description("ID of the associated user account");

            descriptor.Field(p => p.Name)
                .Type<NonNullType<StringType>>()
                .Description("Player's display name");

            descriptor.Field(p => p.Gender)
                .Type<NonNullType<EnumType<Gender>>>()
                .Description("Player's gender (affects handicap calculations)");

            descriptor.Field(p => p.CurrentHandicap)
                .Type<FloatType>()
                .Description("Player's current handicap index (null if insufficient rounds)");

            descriptor.Field(p => p.CreatedAt)
                .Type<NonNullType<DateTimeType>>()
                .Description("When the player profile was created");

            descriptor.Field(p => p.UpdatedAt)
                .Type<NonNullType<DateTimeType>>()
                .Description("When the player profile was last updated");

            // Navigation property for rounds
            descriptor.Field(p => p.Rounds)
                .Type<NonNullType<ListType<NonNullType<RoundType>>>>()
                .Description("All rounds played by this player");

            // Computed field to get associated user information
            descriptor.Field("user")
                .Type<UserType>()
                .Description("Associated user account information")
                .Resolve(context =>
                {
                    var player = context.Parent<Player>();
                    return UserStore.GetUserById(player.UserId);
                });

            // Computed field for recent rounds (last 20)
            descriptor.Field("recentRounds")
                .Type<NonNullType<ListType<NonNullType<RoundType>>>>()
                .Description("Player's 20 most recent rounds")
                .Resolve(context =>
                {
                    var player = context.Parent<Player>();
                    return player.Rounds
                        .OrderByDescending(r => r.DatePlayed)
                        .Take(20)
                        .ToList();
                });

            // Computed field for total rounds count
            descriptor.Field("totalRounds")
                .Type<NonNullType<IntType>>()
                .Description("Total number of rounds played")
                .Resolve(context =>
                {
                    var player = context.Parent<Player>();
                    return player.Rounds.Count;
                });

            // Computed field for scoring average (last 10 rounds)
            descriptor.Field("averageScore")
                .Type<FloatType>()
                .Description("Average gross score from last 10 rounds")
                .Resolve(context =>
                {
                    var player = context.Parent<Player>();
                    var last10Rounds = player.Rounds
                        .OrderByDescending(r => r.DatePlayed)
                        .Take(10)
                        .ToList();

                    if (last10Rounds.Count == 0)
                        return null;

                    return (decimal)last10Rounds.Average(r => r.GrossScore);
                });

            // Computed field for best score
            descriptor.Field("bestScore")
                .Type<IntType>()
                .Description("Player's best gross score")
                .Resolve(context =>
                {
                    var player = context.Parent<Player>();
                    if (!player.Rounds.Any())
                        return null;

                    return player.Rounds.Min(r => r.GrossScore);
                });
        }
    }
}
