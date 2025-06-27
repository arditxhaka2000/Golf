using HotChocolate.Types;

namespace Golf.Backend.GraphQL;

public class Query
{
    public string Hello() => "Hello from GraphQL!";
}

public class QueryType : ObjectType<Query>
{
    protected override void Configure(IObjectTypeDescriptor<Query> descriptor)
    {
        descriptor.Field(q => q.Hello())
            .Description("A simple hello world query");
    }
} 