import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { Database, LogOut } from "lucide-react";

const Navbar = () => {
  const { user, loginWithGoogle, logout } = useAuth();
  return (
    <nav className="flex items-center justify-between p-4 bg-gray-900 text-white border-b border-gray-700">
      {/* Logo */}
      <div className="flex items-center space-x-2 text-xl font-bold">
        <Database className="text-blue-400" />
        <span>zeroDB</span>
      </div>

      {/* Auth Section */}
      <div>
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">Welcome, {user.name}</span>
            <img
              src={user.avatar}
              alt="Profile"
              className="w-8 h-8 rounded-full border border-gray-600"
            />
            <button onClick={logout} className="p-2 hover:bg-gray-800 rounded">
              <LogOut size={18} className="text-red-400" />
            </button>
          </div>
        ) : (
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              loginWithGoogle(credentialResponse.credential);
            }}
            onError={() => {
              console.log("Login Failed");
            }}
            theme="filled_black"
            shape="pill"
          />
        )}
      </div>
    </nav>
  );
};

export default Navbar;
