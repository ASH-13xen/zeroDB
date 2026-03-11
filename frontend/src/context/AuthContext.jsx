/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

// 1. Create the context, but DO NOT export it
const AuthContext = createContext();

// 2. Export the Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("zeroDB_user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);
  const loginWithGoogle = async (credential) => {
    console.log("FRONTEND STEP 1: Google Popup closed. Got token from Google.");
    console.log("FRONTEND STEP 2: Sending token to backend API...");

    try {
      const response = await api.post("/auth/google", { credential });

      console.log("FRONTEND STEP 3: Backend responded!", response.data);

      if (response.data.success) {
        const { user, token } = response.data;

        console.log("FRONTEND STEP 4: Saving user to state and LocalStorage.");
        setUser(user);
        localStorage.setItem("zeroDB_user", JSON.stringify(user));
        localStorage.setItem("zeroDB_token", token);
        console.log("FRONTEND STEP 5: All done! User should be redirected.");
      } else {
        console.error("FRONTEND ERROR: Backend said it wasn't successful.");
      }
    } catch (error) {
      console.error("❌ FRONTEND AXIOS ERROR:");
      if (error.response) {
        // The backend responded with an error status code (4xx, 5xx)
        console.error("Backend returned status:", error.response.status);
        console.error("Backend error message:", error.response.data);
      } else if (error.request) {
        // The request was made but no response was received (e.g., backend is offline or CORS issue)
        console.error(
          "No response from backend. Is the Node server running and CORS enabled?",
        );
      } else {
        // Something else happened
        console.error("Error setting up the request:", error.message);
      }
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("zeroDB_user");
    localStorage.removeItem("zeroDB_token");
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Export a Custom Hook to consume the context
// (Fast Refresh loves this because hooks are allowed alongside components!)
export const useAuth = () => {
  return useContext(AuthContext);
};
