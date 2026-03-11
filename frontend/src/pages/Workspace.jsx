const Workspace = () => {
  return (
    <div className="flex h-full">
      {/* Sidebar Placeholder */}
      <div className="w-64 border-r border-gray-800 bg-gray-900 p-4">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
          Tables
        </h2>
        <p className="text-sm text-gray-400">
          No tables yet. Drop a CSV or ask AI!
        </p>
      </div>

      {/* Main Editor & Results Placeholder */}
      <div className="flex-1 flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-4">Your Edge Sandbox</h2>
        <div className="flex-1 border border-gray-700 rounded-lg flex items-center justify-center bg-gray-900/50">
          <p className="text-gray-500">
            Monaco Editor & React-Virtual Results will go here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
