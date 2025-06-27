using HotChocolate.Types;

namespace Golf.Backend.GraphQL.Types;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class UserType : ObjectType<User>
{
    protected override void Configure(IObjectTypeDescriptor<User> descriptor)
    {
        descriptor.Field(u => u.Id).Type<NonNullType<IdType>>();
        descriptor.Field(u => u.Username).Type<NonNullType<StringType>>();
        descriptor.Field(u => u.Email).Type<NonNullType<StringType>>();
    }
} 