using Golf.Backend.Models;

namespace Golf.Backend.GraphQL.Types
{
    public class RoundHoleType : ObjectType<RoundHole>
    {
        protected override void Configure(IObjectTypeDescriptor<RoundHole> descriptor)
        {
            descriptor.Name("RoundHole");
            descriptor.Description("Represents the score for a single hole in a round");

            descriptor.Field(rh => rh.Id)
                .Type<NonNullType<IdType>>()
                .Description("Unique identifier for the round hole");

            descriptor.Field(rh => rh.RoundId)
                .Type<NonNullType<IdType>>()
                .Description("ID of the round this score belongs to");

            descriptor.Field(rh => rh.HoleId)
                .Type<NonNullType<IdType>>()
                .Description("ID of the hole this score is for");

            descriptor.Field(rh => rh.Strokes)
                .Type<NonNullType<IntType>>()
                .Description("Number of strokes taken on this hole");

            descriptor.Field(rh => rh.AdditionalStrokes)
                .Type<NonNullType<IntType>>()
                .Description("Additional strokes due to handicap");

            // Navigation properties
            descriptor.Field(rh => rh.Round)
                .Type<NonNullType<RoundType>>()
                .Description("The round this score belongs to");

            descriptor.Field(rh => rh.Hole)
                .Type<NonNullType<HoleType>>()
                .Description("The hole this score is for");

            // Computed fields
            descriptor.Field("scoreToPar")
                .Type<NonNullType<IntType>>()
                .Description("Strokes relative to par for this hole")
                .Resolve(context =>
                {
                    var roundHole = context.Parent<RoundHole>();
                    return roundHole.Strokes - roundHole.Hole.Par;
                });

            descriptor.Field("stablefordPoints")
                .Type<NonNullType<IntType>>()
                .Description("Stableford points earned on this hole")
                .Resolve(context =>
                {
                    var roundHole = context.Parent<RoundHole>();
                    var adjustedStrokes = roundHole.Strokes + roundHole.AdditionalStrokes;
                    var scoreToPar = adjustedStrokes - roundHole.Hole.Par;

                    return scoreToPar switch
                    {
                        <= -2 => 4, // Eagle or better
                        -1 => 3,    // Birdie
                        0 => 2,     // Par
                        1 => 1,     // Bogey
                        _ => 0      // Double bogey or worse
                    };
                });
        }
    }
}
