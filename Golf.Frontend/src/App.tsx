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
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <MainPage /> : <LoginPage />;
}

export default App; 