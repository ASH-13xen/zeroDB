const LandingPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-6">
        Welcome to zeroDB
      </h1>
      <p className="text-xl text-gray-400 max-w-2xl mb-8">
        The zero-friction, AI-populated browser database. Sign in with Google
        above to instantly spin up your local SQLite environment.
      </p>
    </div>
  );
};

export default LandingPage;
