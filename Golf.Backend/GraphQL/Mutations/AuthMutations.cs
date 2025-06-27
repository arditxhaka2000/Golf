using HotChocolate.Types;
using Golf.Backend.GraphQL.Types;

namespace Golf.Backend.GraphQL.Mutations;

public class AuthMutations
{
    public record LoginInput(string Username, string Password);
    public record RegisterInput(string Username, string Email, string Password);
    public record AuthPayload(string Token, User User);

    public AuthPayload Login(LoginInput input)
    {
        // TODO: Implement actual authentication
        return new AuthPayload(
            Token: "dummy-token",
            User: new User { Id = 1, Username = input.Username, Email = "user@example.com" }
        );
    }

    public AuthPayload Register(RegisterInput input)
    {
        // TODO: Implement actual registration
        return new AuthPayload(
            Token: "dummy-token",
            User: new User { Id = 1, Username = input.Username, Email = input.Email }
        );
    }
}

public class LoginInputType : InputObjectType<AuthMutations.LoginInput>
{
    protected override void Configure(IInputObjectTypeDescriptor<AuthMutations.LoginInput> descriptor)
    {
        descriptor.Field(i => i.Username).Type<NonNullType<StringType>>();
        descriptor.Field(i => i.Password).Type<NonNullType<StringType>>();
    }
}

public class RegisterInputType : InputObjectType<AuthMutations.RegisterInput>
{
    protected override void Configure(IInputObjectTypeDescriptor<AuthMutations.RegisterInput> descriptor)
    {
        descriptor.Field(i => i.Username).Type<NonNullType<StringType>>();
        descriptor.Field(i => i.Email).Type<NonNullType<StringType>>();
        descriptor.Field(i => i.Password).Type<NonNullType<StringType>>();
    }
}

public class AuthPayloadType : ObjectType<AuthMutations.AuthPayload>
{
    protected override void Configure(IObjectTypeDescriptor<AuthMutations.AuthPayload> descriptor)
    {
        descriptor.Field(p => p.Token).Type<NonNullType<StringType>>();
        descriptor.Field(p => p.User).Type<NonNullType<UserType>>();
    }
} 