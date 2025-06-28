using Golf.Backend.Models;

namespace Golf.Backend.GraphQL.Types
{
    public class HoleType : ObjectType<Hole>
    {
        protected override void Configure(IObjectTypeDescriptor<Hole> descriptor)
        {
            descriptor.Name("Hole");
            descriptor.Description("Represents a single hole on a golf course");

            descriptor.Field(h => h.Id)
                .Type<NonNullType<IdType>>()
                .Description("Unique identifier for the hole");

            descriptor.Field(h => h.CourseId)
                .Type<NonNullType<IdType>>()
                .Description("ID of the course this hole belongs to");

            descriptor.Field(h => h.HoleNumber)
                .Type<NonNullType<IntType>>()
                .Description("Hole number (1-18)");

            descriptor.Field(h => h.Par)
                .Type<NonNullType<IntType>>()
                .Description("Par for this hole (3, 4, or 5)");

            descriptor.Field(h => h.Handicap)
                .Type<NonNullType<IntType>>()
                .Description("Handicap rating for this hole (1-18, 1 being hardest)");

            descriptor.Field(h => h.CreatedAt)
                .Type<NonNullType<DateTimeType>>()
                .Description("When the hole was created");

            // Navigation property for course
            descriptor.Field(h => h.Course)
                .Type<NonNullType<CourseType>>()
                .Description("The course this hole belongs to");

            // Computed field for difficulty description
            descriptor.Field("difficulty")
                .Type<NonNullType<StringType>>()
                .Description("Difficulty level based on handicap rating")
                .Resolve(context =>
                {
                    var hole = context.Parent<Hole>();
                    return hole.Handicap switch
                    {
                        1 or 2 => "Very Hard",
                        >= 3 and <= 6 => "Hard",
                        >= 7 and <= 12 => "Moderate",
                        >= 13 and <= 16 => "Easy",
                        _ => "Very Easy"
                    };
                });

            // Computed field for nine designation
            descriptor.Field("nine")
                .Type<NonNullType<StringType>>()
                .Description("Which nine this hole belongs to (Front/Back)")
                .Resolve(context =>
                {
                    var hole = context.Parent<Hole>();
                    return hole.HoleNumber <= 9 ? "Front" : "Back";
                });
        }
    }
}
