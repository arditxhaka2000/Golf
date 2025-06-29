// Golf.Frontend/src/pages/LoginPage.tsx
// Enhanced with proper error handling and user-friendly messages

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
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const { login } = useAuth();

    const [loginMutation] = useMutation(LOGIN_MUTATION, {
        errorPolicy: 'all' // This helps capture all errors
    });

    const [registerMutation] = useMutation(REGISTER_MUTATION, {
        errorPolicy: 'all'
    });

    // Helper function to get user-friendly error messages
    const getErrorMessage = (error: any, isRegistering: boolean): string => {
        // Check for network errors first
        if (error?.networkError) {
            const statusCode = error.networkError.statusCode;
            if (statusCode === 500) {
                return isRegistering
                    ? "Registration failed. Username or email might already be taken."
                    : "Login failed. Please check your username and password.";
            }
            return "Network error. Please check your connection and try again.";
        }

        // Check for GraphQL errors
        if (error?.graphQLErrors?.length > 0) {
            const graphQLError = error.graphQLErrors[0];
            const message = graphQLError.message.toLowerCase();

            if (message.includes('user not found') || message.includes('invalid credentials')) {
                return "Invalid username or password. Please try again.";
            }
            if (message.includes('user already exists') || message.includes('username') && message.includes('taken')) {
                return "Username already exists. Please choose a different username or try logging in.";
            }
            if (message.includes('email') && message.includes('taken')) {
                return "Email already registered. Please use a different email or try logging in.";
            }
            return graphQLError.message;
        }

        // Default error messages
        return isRegistering
            ? "Registration failed. Please try again with different credentials."
            : "Login failed. Please check your username and password.";
    };

    const validateInput = (): boolean => {
        setErrorMessage("");
        setSuccessMessage("");

        if (!username.trim()) {
            setErrorMessage('Username is required');
            return false;
        }

        if (username.trim().length < 3) {
            setErrorMessage('Username must be at least 3 characters long');
            return false;
        }

        if (!password.trim()) {
            setErrorMessage('Password is required');
            return false;
        }

        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters long');
            return false;
        }

        if (isRegister) {
            if (!email.trim()) {
                setErrorMessage('Email is required for registration');
                return false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                setErrorMessage('Please enter a valid email address');
                return false;
            }
        }

        return true;
    };

    const handleAuth = async () => {
        if (!validateInput()) return;

        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            if (isRegister) {
                const { data, errors } = await registerMutation({
                    variables: {
                        username: username.trim(),
                        password,
                        email: email.trim()
                    }
                });

                if (errors) {
                    throw { graphQLErrors: errors };
                }

                if (data?.register?.token) {
                    login(data.register.token, username.trim());
                    setSuccessMessage('Registration successful! Welcome to Golf Tracker!');
                } else {
                    throw new Error('Registration failed - no token received');
                }
            } else {
                const { data, errors } = await loginMutation({
                    variables: {
                        username: username.trim(),
                        password
                    }
                });

                if (errors) {
                    throw { graphQLErrors: errors };
                }

                if (data?.login?.token) {
                    login(data.login.token, username.trim());
                    setSuccessMessage('Login successful! Welcome back!');
                } else {
                    throw new Error('Login failed - no token received');
                }
            }
        } catch (error) {
            console.error('Authentication error:', error);
            const friendlyMessage = getErrorMessage(error, isRegister);
            setErrorMessage(friendlyMessage);

            // Auto-switch to login if registration fails due to existing user
            if (isRegister && friendlyMessage.includes('already')) {
                setTimeout(() => {
                    setIsRegister(false);
                    setErrorMessage("Please try logging in with your existing account.");
                }, 2000);
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

    // Clear messages when switching between login/register
    const toggleMode = () => {
        setIsRegister(!isRegister);
        setErrorMessage("");
        setSuccessMessage("");
        setEmail("");
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-cover bg-center relative"
            style={{ backgroundImage: "url('https://www.golfclub-fuerth.de/fileadmin/_processed_/8/e/csm_1-66dd9301-2f4a-44d6-9dae-127c692ea6a7_5129e9535a.webp')" }}>
            <div className="absolute inset-0 bg-white bg-opacity-70"></div>
            <div className="relative z-10 w-full flex items-center justify-center">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl">
                            {isRegister ? "Create Account" : "Welcome Back"}
                        </CardTitle>
                        <CardDescription>
                            {isRegister
                                ? "Join Golf Tracker to start recording your rounds and tracking your handicap."
                                : "Sign in to access your golf scores and handicap calculator."
                            }
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Input
                                id="username"
                                type="text"
                                placeholder="Username (min. 3 characters)"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoading}
                                required
                                autoComplete="username"
                                className={errorMessage.includes('Username') ? 'border-red-300' : ''}
                            />
                        </div>

                        {isRegister && (
                            <div className="grid gap-2">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={isLoading}
                                    required
                                    autoComplete="email"
                                    className={errorMessage.includes('Email') || errorMessage.includes('email') ? 'border-red-300' : ''}
                                />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Input
                                id="password"
                                type="password"
                                placeholder="Password (min. 6 characters)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoading}
                                required
                                autoComplete={isRegister ? "new-password" : "current-password"}
                                className={errorMessage.includes('Password') || errorMessage.includes('password') ? 'border-red-300' : ''}
                            />
                        </div>

                        {/* Success Message */}
                        {successMessage && (
                            <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                                {successMessage}
                            </div>
                        )}

                        {/* Error Message */}
                        {errorMessage && (
                            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                                {errorMessage}
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            onClick={handleAuth}
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    {isRegister ? "Creating Account..." : "Signing In..."}
                                </span>
                            ) : (
                                isRegister ? "Create Account" : "Sign In"
                            )}
                        </Button>

                        <Button
                            variant="link"
                            onClick={toggleMode}
                            disabled={isLoading}
                            className="text-sm"
                        >
                            {isRegister
                                ? "Already have an account? Sign in here"
                                : "New to Golf Tracker? Create an account"
                            }
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

export default LoginPage;