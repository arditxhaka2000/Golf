using Golf.Backend.Models;

namespace Golf.Backend.GraphQL.Types
{
    public class CourseType : ObjectType<Course>
    {
        protected override void Configure(IObjectTypeDescriptor<Course> descriptor)
        {
            descriptor.Name("Course");
            descriptor.Description("Represents a golf course with holes and rating information");

            descriptor.Field(c => c.Id)
                .Type<NonNullType<IdType>>()
                .Description("Unique identifier for the course");

            descriptor.Field(c => c.Name)
                .Type<NonNullType<StringType>>()
                .Description("Name of the golf course");

            descriptor.Field(c => c.CourseRating)
                .Type<NonNullType<FloatType>>()
                .Description("Course rating (difficulty for scratch golfer)");

            descriptor.Field(c => c.SlopeRating)
                .Type<NonNullType<IntType>>()
                .Description("Slope rating (relative difficulty, 55-155)");

            descriptor.Field(c => c.ExternalApiId)
                .Type<StringType>()
                .Description("External API identifier (if imported from golf course API)");

            descriptor.Field(c => c.CreatedAt)
                .Type<NonNullType<DateTimeType>>()
                .Description("When the course was added to the system");

            // Navigation property for holes
            descriptor.Field(c => c.Holes)
                .Type<NonNullType<ListType<NonNullType<HoleType>>>>()
                .Description("All 18 holes of the course");

            // Navigation property for rounds
            descriptor.Field(c => c.Rounds)
                .Type<NonNullType<ListType<NonNullType<RoundType>>>>()
                .Description("All rounds played on this course");

            // Computed field for holes ordered by hole number
            descriptor.Field("holesOrdered")
                .Type<NonNullType<ListType<NonNullType<HoleType>>>>()
                .Description("Holes ordered by hole number (1-18)")
                .Resolve(context =>
                {
                    var course = context.Parent<Course>();
                    return course.Holes
                        .OrderBy(h => h.HoleNumber)
                        .ToList();
                });

            // Computed field for total par
            descriptor.Field("totalPar")
                .Type<NonNullType<IntType>>()
                .Description("Total par for the course (sum of all hole pars)")
                .Resolve(context =>
                {
                    var course = context.Parent<Course>();
                    return course.Holes.Sum(h => h.Par);
                });

            // Computed field for front nine par
            descriptor.Field("frontNinePar")
                .Type<NonNullType<IntType>>()
                .Description("Total par for holes 1-9")
                .Resolve(context =>
                {
                    var course = context.Parent<Course>();
                    return course.Holes
                        .Where(h => h.HoleNumber <= 9)
                        .Sum(h => h.Par);
                });

            // Computed field for back nine par
            descriptor.Field("backNinePar")
                .Type<NonNullType<IntType>>()
                .Description("Total par for holes 10-18")
                .Resolve(context =>
                {
                    var course = context.Parent<Course>();
                    return course.Holes
                        .Where(h => h.HoleNumber >= 10)
                        .Sum(h => h.Par);
                });

            // Computed field for rounds count
            descriptor.Field("roundsPlayed")
                .Type<NonNullType<IntType>>()
                .Description("Total number of rounds played on this course")
                .Resolve(context =>
                {
                    var course = context.Parent<Course>();
                    return course.Rounds.Count;
                });

            // Computed field for course difficulty level
            descriptor.Field("difficultyLevel")
                .Type<NonNullType<StringType>>()
                .Description("Course difficulty based on slope rating")
                .Resolve(context =>
                {
                    var course = context.Parent<Course>();
                    return course.SlopeRating switch
                    {
                        <= 95 => "Easy",
                        <= 105 => "Moderate",
                        <= 120 => "Moderately Difficult",
                        <= 135 => "Difficult",
                        _ => "Very Difficult"
                    };
                });

            // Computed field for par breakdown
            descriptor.Field("parBreakdown")
                .Type<NonNullType<ParBreakdownType>>()
                .Description("Breakdown of par 3s, 4s, and 5s")
                .Resolve(context =>
                {
                    var course = context.Parent<Course>();
                    var holes = course.Holes.ToList();

                    return new ParBreakdown
                    {
                        Par3Count = holes.Count(h => h.Par == 3),
                        Par4Count = holes.Count(h => h.Par == 4),
                        Par5Count = holes.Count(h => h.Par == 5)
                    };
                });
        }
    }
}
