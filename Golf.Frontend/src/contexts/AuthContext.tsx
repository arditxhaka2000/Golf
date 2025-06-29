import React, { useEffect } from 'react';
import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    username: string | null;
    login: (token: string, username: string) => void;
    logout: () => void;
    isLoading: boolean; // Add loading state for validation
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [username, setUsername] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading

    // Validate token with backend
    const validateToken = async (token: string): Promise<boolean> => {
        try {
            const response = await fetch('https://localhost:7074/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: `query ValidateToken($token: String!) { 
            validateToken(token: $token) 
          }`,
                    variables: { token }
                })
            });

            const result = await response.json();
            return !result.errors && result.data?.validateToken;
        } catch (error) {
            console.error('Token validation failed:', error);
            return false;
        }
    };

    // Check authentication on app load
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            const storedUsername = localStorage.getItem('username');

            if (token && storedUsername) {
                const isValid = await validateToken(token);
                if (isValid) {
                    setIsAuthenticated(true);
                    setUsername(storedUsername);
                } else {
                    // Token is invalid, clear everything
                    localStorage.removeItem('token');
                    localStorage.removeItem('username');
                    setIsAuthenticated(false);
                    setUsername(null);
                }
            }

            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = (token: string, username: string) => {
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
        setIsAuthenticated(true);
        setUsername(username);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setIsAuthenticated(false);
        setUsername(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, username, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};