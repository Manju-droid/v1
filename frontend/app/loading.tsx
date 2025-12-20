export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/30 flex items-center justify-center">
      <div className="relative">
        {/* Spinner */}
        <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
        {/* Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-xl">V</span>
        </div>
      </div>
    </div>
  );
}

