
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import Workspace from "./pages/Workspace";

function App() {
  const { user } = useAuth();

  return (
    <Router>
      {/* Navbar stays outside Routes so it is always visible */}
      <div className="flex flex-col h-screen bg-gray-950 text-white">
        <Navbar />

        {/* Main Content Area */}
        <div className="flex-grow overflow-hidden">
          <Routes>
            {/* If user is logged in, redirect them to their workspace, otherwise show landing page */}
            <Route
              path="/"
              element={user ? <Navigate to="/workspace" /> : <LandingPage />}
            />

            {/* Protected Route: Only show Workspace if logged in */}
            <Route
              path="/workspace"
              element={user ? <Workspace /> : <Navigate to="/" />}
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
