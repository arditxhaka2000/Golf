using Golf.Backend.Models;

namespace Golf.Backend.GraphQL.Types
{
    public class RoundType : ObjectType<Round>
    {
        protected override void Configure(IObjectTypeDescriptor<Round> descriptor)
        {
            descriptor.Name("Round");
            descriptor.Description("Represents a completed round of golf");

            descriptor.Field(r => r.Id)
                .Type<NonNullType<IdType>>()
                .Description("Unique identifier for the round");

            descriptor.Field(r => r.PlayerId)
                .Type<NonNullType<IdType>>()
                .Description("ID of the player who played this round");

            descriptor.Field(r => r.CourseId)
                .Type<NonNullType<IdType>>()
                .Description("ID of the course where this round was played");

            descriptor.Field(r => r.DatePlayed)
                .Type<NonNullType<DateTimeType>>()
                .Description("Date when the round was played");

            descriptor.Field(r => r.PlayerHandicapAtTime)
                .Type<FloatType>()
                .Description("Player's handicap at the time of the round");

            descriptor.Field(r => r.TotalStrokes)
                .Type<NonNullType<IntType>>()
                .Description("Total strokes taken in the round");

            descriptor.Field(r => r.GrossScore)
                .Type<NonNullType<IntType>>()
                .Description("Gross Stableford score");

            descriptor.Field(r => r.NetScore)
                .Type<NonNullType<IntType>>()
                .Description("Net Stableford score (with handicap)");

            descriptor.Field(r => r.HandicapDifferential)
                .Type<NonNullType<FloatType>>()
                .Description("Handicap differential for this round");

            descriptor.Field(r => r.CreatedAt)
                .Type<NonNullType<DateTimeType>>()
                .Description("When the round was recorded");

            // Navigation properties
            descriptor.Field(r => r.Player)
                .Type<NonNullType<PlayerType>>()
                .Description("The player who played this round");

            descriptor.Field(r => r.Course)
                .Type<NonNullType<CourseType>>()
                .Description("The course where this round was played");

            descriptor.Field(r => r.RoundHoles)
                .Type<NonNullType<ListType<NonNullType<RoundHoleType>>>>()
                .Description("Hole-by-hole scores for this round");

            // Computed fields
            descriptor.Field("scoreToPar")
                .Type<NonNullType<IntType>>()
                .Description("Total strokes relative to par")
                .Resolve(context =>
                {
                    var round = context.Parent<Round>();
                    var coursePar = round.Course.Holes.Sum(h => h.Par);
                    return round.TotalStrokes - coursePar;
                });

            descriptor.Field("isValidForHandicap")
                .Type<NonNullType<BooleanType>>()
                .Description("Whether this round can be used for handicap calculation")
                .Resolve(context =>
                {
                    var round = context.Parent<Round>();
                    // A round is valid if all 18 holes have scores
                    return round.RoundHoles.Count == 18;
                });
        }
    }
}
