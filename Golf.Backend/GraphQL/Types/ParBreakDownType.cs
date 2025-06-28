namespace Golf.Backend.GraphQL.Types
{
    public class ParBreakdown
    {
        public int Par3Count { get; set; }
        public int Par4Count { get; set; }
        public int Par5Count { get; set; }
    }
    public class ParBreakdownType : ObjectType<ParBreakdown>
    {
        protected override void Configure(IObjectTypeDescriptor<ParBreakdown> descriptor)
        {
            descriptor.Name("ParBreakdown");
            descriptor.Description("Breakdown of hole pars on a course");

            descriptor.Field(p => p.Par3Count)
                .Type<NonNullType<IntType>>()
                .Description("Number of par 3 holes");

            descriptor.Field(p => p.Par4Count)
                .Type<NonNullType<IntType>>()
                .Description("Number of par 4 holes");

            descriptor.Field(p => p.Par5Count)
                .Type<NonNullType<IntType>>()
                .Description("Number of par 5 holes");
        }
    }
}
