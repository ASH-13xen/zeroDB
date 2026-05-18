import { useState, useEffect } from "react";
import { useCollab } from "../context/CollabContext";
import { useDatabaseContext } from "../context/DatabaseContext";
import { useAuth } from "../context/AuthContext";
import { X, Mail, Link, Copy, Check, Users, UsersRound, Power, LogOut, Loader2 } from "lucide-react";

const CollabInviteModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const {
    activeRoomId,
    collaborators,
    startCollabSession,
    leaveCollabSession,
    sendEmailInvite,
    socket,
  } = useCollab();

  const { activeDb, executionMode } = useDatabaseContext();

  const [email, setEmail] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null); // 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Construct invite link from current URL parameters
  const getInviteLink = () => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room") || activeRoomId;
    const importDb = params.get("importDb") || "postgres-prod-dummy";
    
    if (!room) return "";
    return `${window.location.origin}/workspace?room=${room}&importDb=${importDb}`;
  };

  const handleStartSession = async () => {
    setIsStarting(true);
    try {
      await startCollabSession();
    } catch (err) {
      console.error(err);
      alert("Failed to initialize collaboration session: " + err.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsInviting(true);
    setInviteStatus(null);
    setStatusMessage("");

    try {
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get("importDb") || "postgres-prod-dummy";
      
      await sendEmailInvite(email.trim(), activeRoomId, shareId);
      
      setInviteStatus("success");
      setStatusMessage(`Invitation successfully sent to ${email}!`);
      setEmail("");
    } catch (err) {
      setInviteStatus("error");
      setStatusMessage(err.message || "Failed to send invitation.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = () => {
    const link = getInviteLink();
    if (!link) return;

    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg overflow-hidden border border-gray-800 rounded-2xl bg-gray-900 shadow-2xl text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-850">
          <div className="flex items-center gap-3">
            <div className="p-2 text-indigo-400 bg-indigo-500/10 rounded-lg">
              <UsersRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-wide">Multiplayer Workspace</h2>
              <p className="text-xs text-gray-400">Collaborate with your team in real-time</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {!activeRoomId ? (
            /* STATE A: Session Not Yet Spawned */
            <div className="flex flex-col items-center text-center py-6">
              <div className="relative mb-6 p-4 text-indigo-400 bg-indigo-500/5 rounded-full border border-indigo-500/15">
                <Users className="w-12 h-12" />
                <span className="absolute top-3 right-3 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500"></span>
                </span>
              </div>
              <h3 className="text-lg font-medium mb-2">Go Live & Invite Others</h3>
              <p className="text-sm text-gray-400 max-w-sm mb-8 leading-relaxed">
                Turn this session into a live room. You can invite your team to write queries, inspect schemas, and edit data collaboratively in real-time.
              </p>

              {executionMode !== "draft" && (
                <div className="w-full p-3.5 mb-6 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 text-left">
                  <span className="font-bold">Note:</span>
                  <span>
                    You are in <span className="capitalize font-semibold">{executionMode} mode</span>. Multiplayer sync replicates queries and edits live, but local saving on leaving is exclusive to SQLite Draft Mode.
                  </span>
                </div>
              )}

              <button
                onClick={handleStartSession}
                disabled={isStarting}
                className="w-full py-3.5 px-6 font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initializing Collaboration...
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Start Collaboration Room
                  </>
                )}
              </button>
            </div>
          ) : (
            /* STATE B: Session Active */
            <div className="space-y-6">
              {/* Telemetry Indicator */}
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-medium text-emerald-400 capitalize">Live Collaboration Active</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    Database: <span className="font-mono text-gray-300">{activeDb || "Remote Connection"}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded font-mono">
                  Room: {activeRoomId.slice(5, 12)}...
                </div>
              </div>

              {/* Invite Form */}
              <form onSubmit={handleSendInvite} className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
                  Invite via Registered Email
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      required
                      placeholder="teammate@zerodb.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pl-10 pr-4 py-3 rounded-xl text-sm transition-all outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-5 font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-indigo-600/15 flex items-center gap-1.5"
                  >
                    {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
                  </button>
                </div>
                {statusMessage && (
                  <p className={`text-xs mt-1.5 px-1 font-medium ${inviteStatus === "success" ? "text-emerald-400" : "text-rose-400"}`}>
                    {statusMessage}
                  </p>
                )}
              </form>

              {/* Manual Link Copy */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
                  Or share invitation link manually
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Link className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      readOnly
                      value={getInviteLink()}
                      className="w-full bg-gray-950 border border-gray-800 pl-10 pr-4 py-3 rounded-xl text-xs font-mono text-gray-300 select-all outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-all border border-gray-750 flex items-center justify-center"
                    title="Copy to clipboard"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Presence List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-gray-850 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Active Collaborators ({collaborators.length + 1})
                  </span>
                </div>
                <div className="space-y-2.5 max-h-40 overflow-y-auto">
                  {/* Host/Guest (Yourself) */}
                  {(() => {
                    const isHost = activeRoomId ? activeRoomId.includes(user?._id) : false;
                    return (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-gray-950/40 border border-gray-850">
                        <div className="flex items-center gap-3">
                          {socket ? (
                            <div className="relative">
                              <img
                                src={socket.userProfile?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80"}
                                alt="Your Avatar"
                                className="w-8 h-8 rounded-full border border-indigo-500/20 object-cover"
                              />
                              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-gray-950"></span>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold">ME</div>
                          )}
                          <div>
                            <div className="text-sm font-semibold flex items-center gap-1.5">
                              {socket?.userProfile?.name || "You"}
                              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 px-1.5 py-0.5 rounded font-medium">
                                {isHost ? "Host (You)" : "Guest (You)"}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400">{socket?.userProfile?.email || ""}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Connected Collaborators */}
                  {collaborators.map((peer) => {
                    const isPeerHost = activeRoomId ? activeRoomId.includes(peer._id) : false;
                    return (
                      <div key={peer._id} className="flex items-center justify-between p-2 rounded-lg bg-gray-950/20 border border-gray-850">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={peer.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80"}
                              alt={peer.name}
                              className="w-8 h-8 rounded-full border border-gray-800 object-cover"
                            />
                            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-gray-950"></span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold flex items-center gap-1.5">
                              {peer.name}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                                isPeerHost
                                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15"
                                  : "bg-zinc-500/10 text-zinc-400 border-zinc-500/15"
                              }`}>
                                {isPeerHost ? "Host" : "Guest"}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-405">{peer.email}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-gray-850 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={leaveCollabSession}
                  className="flex-grow py-3 px-4 font-semibold text-sm bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/10 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Leave Collaborative Room
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollabInviteModal;
