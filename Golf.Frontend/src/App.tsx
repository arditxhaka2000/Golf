import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "./lib/apollo";

function App() {
    return (
        <ApolloProvider client={apolloClient}>
            <AuthProvider>
                <Root />
            </AuthProvider>
        </ApolloProvider>
    );
}

function Root() {
    const { isAuthenticated, isLoading } = useAuth(); // Add isLoading

    // Show loading spinner while validating token
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="text-lg font-medium text-gray-900 mb-2">
                        Checking authentication...
                    </div>
                    <div className="text-sm text-gray-500">
                        Please wait
                    </div>
                </div>
            </div>
        );
    }

    return isAuthenticated ? <MainPage /> : <LoginPage />;
}

export default App;