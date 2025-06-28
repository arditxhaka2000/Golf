using Golf.Backend.Models;

namespace Golf.Backend.GraphQL.Types
{
    public class CourseSearchResultType : ObjectType<CourseSearchResult>
    {
        protected override void Configure(IObjectTypeDescriptor<CourseSearchResult> descriptor)
        {
            descriptor.Name("CourseSearchResult");
            descriptor.Field(c => c.Id).Type<IdType>();
            descriptor.Field(c => c.Name).Type<NonNullType<StringType>>();
            descriptor.Field(c => c.Location).Type<StringType>();
            descriptor.Field(c => c.ExternalApiId).Type<StringType>();
            descriptor.Field(c => c.CourseRating).Type<DecimalType>();
            descriptor.Field(c => c.SlopeRating).Type<DecimalType>();
            descriptor.Field(c => c.IsImported).Type<NonNullType<BooleanType>>();
            descriptor.Field(c => c.IsFromApi).Type<NonNullType<BooleanType>>();
            descriptor.Field(c => c.Holes).Type<ListType<HoleType>>();
        }
    }
}
