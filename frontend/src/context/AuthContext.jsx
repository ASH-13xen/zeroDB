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
    try {
      const response = await api.post("/auth/google", { credential });
      const { user, token } = response.data;

      setUser(user);
      localStorage.setItem("zeroDB_user", JSON.stringify(user));
      localStorage.setItem("zeroDB_token", token);
    } catch (error) {
      console.error("Login failed:", error);
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
