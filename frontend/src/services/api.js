import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

// Automatically attach the zeroDB JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("zeroDB_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem("zeroDB_user");
      localStorage.removeItem("zeroDB_token");
      
      // Only redirect if not already on the homepage to prevent redirect loops
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
