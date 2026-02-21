import { useContext } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { AuthContext, AuthProvider } from "./context/AuthContext";

// Pages
import Dashboard from "./pages/Dashboard";

import DocumentEditor from "./pages/DocumentEditor";
import Login from "./pages/Login";
import PublicSign from "./pages/PublicSign";
import Register from "./pages/Register";

// Protected Route Wrapper
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const auth = useContext(AuthContext);

  // Wait for auth check to complete
  if (auth?.loading) return <div>Loading...</div>;

  return auth?.user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* PUBLIC SIGNING ROUTE (No auth required) */}
          <Route path="/sign/:token" element={<PublicSign />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/document/:id"
            element={
              <PrivateRoute>
                <DocumentEditor />
              </PrivateRoute>
            }
          />

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
