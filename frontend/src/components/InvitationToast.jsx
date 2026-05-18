import { useState } from "react";
import { useCollab } from "../context/CollabContext";
import { Bell, Check, X, Loader2, Sparkles } from "lucide-react";

const InvitationToast = () => {
  const { pendingInvites, respondToInvite, joinCollabSession } = useCollab();
  const [loadingInviteId, setLoadingInviteId] = useState(null);
  const [loadingStep, setLoadingStep] = useState("");

  const handleAccept = async (invite) => {
    setLoadingInviteId(invite._id);
    setLoadingStep("Downloading database state...");
    try {
      // 1. Mark invitation as accepted in MongoDB
      await respondToInvite(invite._id, "accepted");
      
      setLoadingStep("Initializing SQLite Wasm Engine...");
      
      // 2. Load shared SQLite file and join the WebSocket room
      await joinCollabSession(invite.roomId, invite.shareId);
      
      console.log("🚀 Collaboration session booted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to join collaboration: " + err.message);
    } finally {
      setLoadingInviteId(null);
      setLoadingStep("");
    }
  };

  const handleDecline = async (inviteId) => {
    try {
      await respondToInvite(inviteId, "declined");
    } catch (err) {
      console.error(err);
    }
  };

  if (!pendingInvites || pendingInvites.length === 0) return null;

  // Show only the most recent pending invite to keep the UI clean
  const currentInvite = pendingInvites[0];

  return (
    <div className="fixed top-20 right-6 z-50 w-full max-w-sm overflow-hidden border border-gray-800 rounded-2xl bg-gray-900/95 backdrop-blur-md shadow-2xl text-white animate-slide-in">
      
      {/* Toast Alert Header */}
      <div className="relative p-5">
        <div className="flex gap-4">
          <div className="relative flex-shrink-0">
            <img
              src={currentInvite.host?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80"}
              alt="Inviter Profile"
              className="w-11 h-11 rounded-full border border-indigo-500/30 object-cover"
            />
            <span className="absolute -bottom-1 -right-1 block p-1 bg-indigo-600 rounded-full text-white">
              <Bell className="w-2.5 h-2.5" />
            </span>
          </div>

          <div className="flex-grow">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Live Invitation
              </span>
            </div>
            <h4 className="text-sm font-semibold mt-0.5">{currentInvite.host?.name}</h4>
            <p className="text-xs text-gray-400 mt-1">
              Invited you to collaborate on the database:
            </p>
            <p className="text-xs font-mono font-medium text-gray-300 mt-0.5 bg-gray-950/60 px-2 py-1 border border-gray-850 rounded-lg inline-block">
              {currentInvite.dbName || "Untitled Database"}
            </p>
          </div>
        </div>

        {/* Action Options */}
        {loadingInviteId === currentInvite._id ? (
          /* Seeding Loader State */
          <div className="mt-4 p-3 bg-indigo-950/40 border border-indigo-900/30 rounded-xl flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
            <span className="text-xs font-medium text-indigo-300 animate-pulse">{loadingStep}</span>
          </div>
        ) : (
          /* Normal State Options */
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleAccept(currentInvite)}
              className="flex-grow py-2.5 px-4 font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/15 flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </button>
            <button
              onClick={() => handleDecline(currentInvite._id)}
              className="py-2.5 px-4 font-semibold text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-all border border-gray-750 flex items-center justify-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Decline
            </button>
          </div>
        )}
      </div>

      {/* Slide-in Animations definition */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default InvitationToast;
