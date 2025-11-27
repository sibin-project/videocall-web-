import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

const Home = () => {
  const { userLoggedIn, currentUser } = useAuth();
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState(currentUser?.displayName || currentUser?.email?.split('@')[0] || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Generate a random room ID
  const generateRoomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }
    setIsLoading(true);
    try {
      const newRoomId = generateRoomId();
      navigate(`/room/${newRoomId}?username=${encodeURIComponent(username.trim())}`);
    } catch (err) {
      setError('Failed to create room.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }
    setIsLoading(true);
    try {
      navigate(`/room/${roomId.trim().toUpperCase()}?username=${encodeURIComponent(username.trim())}`);
    } catch (err) {
      setError('Failed to join room.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') action();
  };

  // --- Landing Page for Guests ---
  if (!userLoggedIn) {
    return (
      <div className="min-h-screen bg-background text-text-primary overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>



        {/* Hero Section */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-text-primary">
            Connect with anyone, <br />
            <span className="text-primary">
              anywhere, anytime.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed">
            Experience crystal clear video calls, instant messaging, and seamless screen sharing.
            No downloads required. Just click and connect.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-4 rounded-full bg-primary hover:bg-primary-600 text-white font-semibold text-lg shadow-lg shadow-primary/30 transition-all transform hover:scale-105"
            >
              Get Started for Free
            </button>
          </div>

          {/* Feature Pills */}
          <div className="mt-16 flex flex-wrap justify-center gap-4">
            {['HD Video', 'Crystal Audio', 'Screen Sharing', 'Real-time Chat', 'Secure'].map((feature) => (
              <span key={feature} className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-600 shadow-sm">
                ✨ {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Dashboard for Logged In Users ---
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Left Side: Welcome & Info */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-text-primary mb-2">Welcome back,</h1>
            <h2 className="text-2xl font-semibold text-primary break-all">{currentUser?.email?.split('@')[0]}</h2>
          </div>
          <p className="text-gray-600 text-lg">
            Ready to start a conversation? Create a new room or join an existing one to connect with your team.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface rounded-xl shadow-sm border border-gray-100">
              <div className="text-2xl mb-2">📹</div>
              <div className="font-semibold text-text-primary">Video Calls</div>
              <div className="text-sm text-gray-500">Unlimited HD calls</div>
            </div>
            <div className="p-4 bg-surface rounded-xl shadow-sm border border-gray-100">
              <div className="text-2xl mb-2">💬</div>
              <div className="font-semibold text-text-primary">Chat</div>
              <div className="text-sm text-gray-500">Real-time messaging</div>
            </div>
          </div>
        </div>

        {/* Right Side: Action Card */}
        <div className="bg-surface rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-text-primary"
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-6">
            {/* Create Room */}
            <div>
              <button
                onClick={handleCreateRoom}
                disabled={isLoading || !username.trim()}
                className="w-full group relative flex items-center justify-center px-6 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/30"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span className="mr-2">🚀</span> Create New Room
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface text-gray-500">or join existing</span>
              </div>
            </div>

            {/* Join Room */}
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                onKeyDown={(e) => handleKeyPress(e, handleJoinRoom)}
                placeholder="Enter Room ID"
                className="flex-1 px-4 py-3 bg-background border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-text-primary"
              />
              <button
                onClick={handleJoinRoom}
                disabled={isLoading || !roomId.trim() || !username.trim()}
                className="px-6 py-3 bg-text-primary text-white rounded-xl font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 transition-all shadow-lg"
              >
                Join
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-700 animate-fade-in">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
