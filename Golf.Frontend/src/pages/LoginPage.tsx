// Golf.Frontend/src/pages/LoginPage.tsx
// ANALYSIS: Your LoginPage is well-structured, but let me suggest some improvements
// and point out potential issues to ensure it works with your golf app

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
      user {
        id
        username
        email
      }
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register($username: String!, $password: String!, $email: String!) {
    register(input: { username: $username, password: $password, email: $email }) {
      token
      user {
        id
        username
        email
      }
    }
  }
`;

function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [isRegister, setIsRegister] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // ✨ IMPROVEMENT: Add loading state
    const { login } = useAuth();

    const [loginMutation, { error: loginError }] = useMutation(LOGIN_MUTATION);
    const [registerMutation, { error: registerError }] = useMutation(REGISTER_MUTATION);

    const handleAuth = async () => {
        //IMPROVEMENT: Add validation
        if (!username.trim()) {
            alert('Username is required');
            return;
        }

        if (!password.trim()) {
            alert('Password is required');
            return;
        }

        if (isRegister && !email.trim()) {
            alert('Email is required for registration');
            return;
        }

        if (isRegister && !email.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        setIsLoading(true);

        try {
            if (isRegister) {
                const { data } = await registerMutation({
                    variables: { username: username.trim(), password, email: email.trim() }
                });

                //Make sure your backend returns this structure
                if (data?.register?.token) {
                    login(data.register.token, username.trim());

                    // ✨ IMPROVEMENT: Show success message
                    console.log('Registration successful!');
                } else {
                    throw new Error('Registration failed - no token received');
                }
            } else {
                const { data } = await loginMutation({
                    variables: { username: username.trim(), password }
                });

                //Make sure your backend returns this structure
                if (data?.login?.token) {
                    login(data.login.token, username.trim());

                    //Show success message
                    console.log('Login successful!');
                } else {
                    throw new Error('Login failed - no token received');
                }
            }
        } catch (e) {
            console.error('Authentication error:', e);

            //Proper error handling for TypeScript
            let errorMessage = `${isRegister ? 'Registration' : 'Login'} failed. Please try again.`;

            if (e instanceof Error) {
                errorMessage = e.message;
            } else if (typeof e === 'string') {
                errorMessage = e;
            }

            //Better error handling
            if (errorMessage.includes('User already exists')) {
                alert('Username or email already exists. Please try logging in instead.');
                setIsRegister(false);
            } else if (errorMessage.includes('Invalid credentials')) {
                alert('Invalid username or password. Please try again.');
            } else {
                alert(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleAuth();
        }
    };

    const error = loginError || registerError;

    return (
        <div className="flex items-center justify-center min-h-screen bg-cover bg-center relative"
            style={{ backgroundImage: "url('https://www.golfclub-fuerth.de/fileadmin/_processed_/8/e/csm_1-66dd9301-2f4a-44d6-9dae-127c692ea6a7_5129e9535a.webp')" }}>
            <div className="absolute inset-0 bg-white bg-opacity-70"></div>
            <div className="relative z-10 w-full flex items-center justify-center">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl">
                            {isRegister ? "Register" : "Login"}
                        </CardTitle>
                        <CardDescription>
                            {isRegister
                                ? "Create an account to start tracking your golf scores."
                                : "Enter your credentials to access your golf tracker."
                            }
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
                                onKeyPress={handleKeyPress}
                                disabled={isLoading}
                                required
                                autoComplete="username"
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
                                    onKeyPress={handleKeyPress}
                                    disabled={isLoading}
                                    required
                                    autoComplete="email"
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
                                onKeyPress={handleKeyPress}
                                disabled={isLoading}
                                required
                                autoComplete={isRegister ? "new-password" : "current-password"}
                            />
                        </div>

                        {/*IMPROVEMENT: Better error display */}
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                                {error.message || 'An error occurred. Please try again.'}
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            onClick={handleAuth}
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading
                                ? (isRegister ? "Creating Account..." : "Signing In...")
                                : (isRegister ? "Sign up" : "Sign in")
                            }
                        </Button>

                        <Button
                            variant="link"
                            onClick={() => setIsRegister(!isRegister)}
                            disabled={isLoading}
                        >
                            {isRegister
                                ? "Already have an account? Sign in"
                                : "Don't have an account? Sign up"
                            }
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

export default LoginPage;