import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { Database, LogOut, Wrench, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useDatabaseContext } from "../context/DatabaseContext";
import CsvUploader from "./CsvUploader";
import AiMockDataButton from "./AiMockDataButton";
import AiQueryGenerator from "./AiQueryGenerator";

const Navbar = () => {
  const { user, loginWithGoogle, logout } = useAuth();
  const { executeSql, query, setQuery } = useDatabaseContext();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="flex items-center justify-between p-4 bg-gray-900 text-white border-b border-gray-700 relative z-50">
      {/* Logo */}
      <div className="flex items-center space-x-2 text-xl font-bold">
        <Database className="text-blue-400" />
        <span>zeroDB</span>
      </div>

      {/* Center/Right Section */}
      <div className="flex items-center space-x-6">
        {user && (
          <div className="flex items-center space-x-4">
            {/* Tools Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all border border-gray-700 text-sm font-medium"
              >
                <Wrench size={16} className="text-blue-400" />
                <span>Tools</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in duration-200 origin-top-right">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Data Ingestion</h3>
                      <CsvUploader onExecuteSql={executeSql} />
                    </div>
                    <div className="border-t border-gray-800 pt-4">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">AI Generation</h3>
                      <AiMockDataButton currentSchema={query} onExecuteSql={executeSql} />
                      <div className="mt-4">
                        <AiQueryGenerator currentSchema={query} onQueryGenerated={(sql) => setQuery(sql)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-gray-800 mx-2" />

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-300">Welcome, {user.name}</span>
              <img
                src={user.avatar}
                alt="Profile"
                className="w-8 h-8 rounded-full border border-gray-600"
              />
              <button onClick={logout} className="p-2 hover:bg-gray-800 rounded transition-colors group">
                <LogOut size={18} className="text-gray-500 group-hover:text-red-400" />
              </button>
            </div>
          </div>
        )}

        {!user && (
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
