import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { DatabaseProvider } from "./context/DatabaseContext";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import Workspace from "./pages/Workspace";

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="flex-grow overflow-hidden">
        <Routes>
          {/* If user is logged in, redirect them to their workspace (preserving query params), otherwise show landing page */}
          <Route
            path="/"
            element={user ? <Navigate to={`/workspace${location.search}`} replace /> : <LandingPage />}
          />

          {/* Protected Route: Only show Workspace if logged in, else redirect to home with query params */}
          <Route
            path="/workspace"
            element={user ? <Workspace /> : <Navigate to={`/${location.search}`} replace />}
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <DatabaseProvider>
        <AppRoutes />
      </DatabaseProvider>
    </Router>
  );
}

export default App;
