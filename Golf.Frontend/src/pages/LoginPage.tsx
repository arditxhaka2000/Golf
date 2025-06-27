import React from 'react';
import { useMutation, gql } from "@apollo/client";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";

const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(input: { username: $username, password: $password }) {
      token
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register($username: String!, $password: String!, $email: String!) {
    register(input: { username: $username, password: $password, email: $email }) {
      token
    }
  }
`;

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const { login } = useAuth();

  const [loginMutation, { error: loginError }] = useMutation(LOGIN_MUTATION);
  const [registerMutation, { error: registerError }] = useMutation(REGISTER_MUTATION);

  const handleAuth = async () => {
    try {
      if (isRegister) {
        const { data } = await registerMutation({ variables: { username, password, email } });
        if (data.register.token) {
          login(data.register.token, username);
        }
      } else {
        const { data } = await loginMutation({ variables: { username, password } });
        if (data.login.token) {
          login(data.login.token, username);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const error = loginError || registerError;

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center relative" style={{ backgroundImage: "url('https://www.golfclub-fuerth.de/fileadmin/_processed_/8/e/csm_1-66dd9301-2f4a-44d6-9dae-127c692ea6a7_5129e9535a.webp')" }}>
      <div className="absolute inset-0 bg-white bg-opacity-70"></div>
      <div className="relative z-10 w-full flex items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">{isRegister ? "Register" : "Login"}</CardTitle>
            <CardDescription>
              {isRegister ? "Create an account to start tracking." : "Enter your credentials to access your account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Input
                id="username"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            {isRegister && (
              <div className="grid gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="grid gap-2">
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error.message}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button onClick={handleAuth} className="w-full">
              {isRegister ? "Sign up" : "Sign in"}
            </Button>
            <Button variant="link" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage; 