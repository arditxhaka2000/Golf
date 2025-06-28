using HotChocolate.Types;

namespace Golf.Backend.GraphQL.Types;

/// <summary>
/// There is no need to define a User model here as it is already defined in the Models namespace.
/// 
/// </summary>
//public class User
//{
//    public int Id { get; set; }
//    public string Username { get; set; } = string.Empty;
//    public string Email { get; set; } = string.Empty;
//}

public class UserType : ObjectType<Golf.Backend.Models.User>
{
    protected override void Configure(IObjectTypeDescriptor<Golf.Backend.Models.User> descriptor)
    {
        descriptor.Field(u => u.Id).Type<NonNullType<StringType>>(); 
        descriptor.Field(u => u.Username).Type<NonNullType<StringType>>();
        descriptor.Field(u => u.Email).Type<NonNullType<StringType>>();
        // No need to expose PasswordHash field
        descriptor.Ignore(u => u.PasswordHash);
    }
}