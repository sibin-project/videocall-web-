// VideoCall.jsx - With conditional control buttons and active speaker detection
import React, { useEffect, useState, useRef } from "react";

/**
 * Hook: Detect active speaker by analyzing audio levels of streams
 * Returns both speaker ID and audio level for animations
 */
const useActiveSpeaker = (localStream, remoteStreams) => {
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const [audioLevels, setAudioLevels] = useState(new Map());
  const analyserRefs = useRef(new Map());

  useEffect(() => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const checkInterval = 100; // ms - faster for smooth animation
    const threshold = 0.05; // volume threshold

    const setupAnalyser = (id, stream) => {
      if (!stream || analyserRefs.current.has(id)) return;

      try {
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);

        analyserRefs.current.set(id, { analyser, dataArray });
      } catch (err) {
        console.warn("Audio analyser error:", err);
      }
    };

    // Attach for local and remote
    if (localStream) setupAnalyser("local", localStream);
    remoteStreams.forEach((stream, peerId) => setupAnalyser(peerId, stream));

    const interval = setInterval(() => {
      let loudestId = null;
      let loudestValue = 0;
      const newLevels = new Map();

      analyserRefs.current.forEach((val, id) => {
        const { analyser, dataArray } = val;
        analyser.getByteFrequencyData(dataArray);

        // Average volume
        const avg =
          dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 256;

        newLevels.set(id, avg);

        if (avg > threshold && avg > loudestValue) {
          loudestId = id;
          loudestValue = avg;
        }
      });

      setAudioLevels(newLevels);

      if (loudestId !== activeSpeakerId) {
        setActiveSpeakerId(loudestId);
      }
    }, checkInterval);

    return () => {
      clearInterval(interval);
      audioCtx.close();
      analyserRefs.current.clear();
    };
  }, [localStream, remoteStreams]);

  return { activeSpeakerId, audioLevels };
};

/**
 * Sound Wave Indicator Component - Google Meet Style
 */
const SoundWaveIndicator = ({ audioLevel, isActive }) => {
  const bars = [1, 2, 3];

  return (
    <div className="flex items-center gap-0.5 h-4">
      {bars.map((bar) => {
        const height = isActive
          ? Math.max(4, Math.min(16, audioLevel * 80 * (bar * 0.8)))
          : 4;

        return (
          <div
            key={bar}
            className={`w-1 rounded-full transition-all duration-100 ${isActive ? 'bg-green-500' : 'bg-gray-500'
              }`}
            style={{
              height: `${height}px`,
              animation: isActive ? `pulse-${bar} 0.5s ease-in-out infinite` : 'none'
            }}
          />
        );
      })}
      <style>{`
        @keyframes pulse-1 {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.5); }
        }
        @keyframes pulse-2 {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(2); }
        }
        @keyframes pulse-3 {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.3); }
        }
      `}</style>
    </div>
  );
};

/**
 * VideoCall Component
 */
const VideoCall = ({
  localStream,
  remoteStreams,
  participantMap,
  localVideoRef,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onLeaveCall,
  showChat,
  hideControls = false, // New prop to hide controls when chat is open
  qualityMode = "medium", // Quality mode prop
  onQualityChange = () => { }, // Quality change handler
  onSwitchCamera = () => { },
  hasMultipleCameras = false,
  isMirrored = true
}) => {
  // Hook to detect speaker with audio levels
  const { activeSpeakerId, audioLevels } = useActiveSpeaker(localStream, remoteStreams);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      console.log("✅ Local video stream attached");
    }
  }, [localStream, localVideoRef]);

  return (
    <div className="h-full flex flex-col relative">
      {/* Video Grid */}
      <div className="flex-1 p-2 overflow-auto bg-black">
        <div
          className="grid gap-2 w-full h-full"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(250px, 1fr))`,
            gridAutoRows: "minmax(200px, auto)"
          }}
        >
          {/* Remote Videos */}
          {[...remoteStreams.entries()].map(([peerId, stream]) => {
            const username = participantMap?.get(peerId) || `User ${peerId.substring(0, 6)}`;
            const audioLevel = audioLevels.get(peerId) || 0;
            const isActiveSpeaker = peerId === activeSpeakerId;

            return (
              <div
                key={peerId}
                className={`relative rounded-lg overflow-hidden flex items-center justify-center transition-all
                  ${isActiveSpeaker
                    ? "ring-4 ring-green-500 shadow-lg shadow-green-500/50"
                    : "bg-gray-900"}`}
              >
                <video
                  autoPlay
                  playsInline
                  ref={(video) => {
                    if (video && video.srcObject !== stream) {
                      video.srcObject = stream;
                      console.log("✅ Remote video stream attached for", peerId);
                    }
                  }}
                  className="w-full h-full object-cover"
                />

                {/* Username and Sound Wave */}
                <div className="absolute bottom-3 left-3 bg-black bg-opacity-80 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                  <span>{username}</span>
                  <SoundWaveIndicator
                    audioLevel={audioLevel}
                    isActive={isActiveSpeaker}
                  />
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {remoteStreams.size === 0 && (
            <div className="relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center col-span-full">
              <div className="text-gray-400 text-center p-8">
                <p className="text-7xl mb-6">👥</p>
                <p className="text-2xl font-semibold mb-2">Waiting for others to join...</p>
                <p className="text-sm mt-3 text-gray-500">Share the room link to invite participants</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Self Video Floating Preview */}
      <div className={`absolute top-2 right-2 w-32 h-32 rounded-lg overflow-hidden shadow-2xl border-2 z-20 hover:scale-105 transition-transform
        ${activeSpeakerId === "local" ? "ring-4 ring-green-500 shadow-lg shadow-green-500/50" : "border-gray-600 bg-gray-900"}`}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: isMirrored ? "scaleX(-1)" : "none" }}
        />

        {/* Username and Sound Wave */}
        <div className="absolute bottom-1 left-1 bg-black bg-opacity-90 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5">
          <span>You</span>
          {!isMuted && (
            <SoundWaveIndicator
              audioLevel={audioLevels.get("local") || 0}
              isActive={activeSpeakerId === "local"}
            />
          )}
        </div>

        {/* Status Indicators */}
        <div className="absolute top-1 right-1 flex gap-1">
          {isMuted && (
            <div className="bg-red-600 text-white px-1.5 py-0.5 rounded text-xs font-medium">🔇</div>
          )}
          {isVideoOff && (
            <div className="bg-red-600 text-white px-1.5 py-0.5 rounded text-xs font-medium">📹</div>
          )}
        </div>
      </div>

      {/* Control Bar - Hidden when chat is open */}
      {!hideControls && (
        <div className="flex justify-center items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-900 border-t border-gray-700 flex-wrap">
          {/* Quality/Data Control Selector - Visible on all screens */}
          <div className="relative group">
            <select
              value={qualityMode}
              onChange={(e) => onQualityChange(e.target.value)}
              className="appearance-none bg-gray-700 border border-gray-600 text-white text-xs sm:text-sm rounded-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 pr-6 sm:pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-600 transition-colors"
              title="Video Quality"
            >
              <option value="ultra">Ultra</option>
              <option value="low">Low</option>
              <option value="medium">Med</option>
              <option value="high">High</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 sm:px-2 text-gray-400">
              <svg className="fill-current h-3 w-3 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-700"></div>

          <button
            onClick={onToggleMute}
            className={`p-4 rounded-full font-semibold transition-all shadow-lg ${isMuted
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>

          <button
            onClick={onToggleVideo}
            className={`p-4 rounded-full font-semibold transition-all shadow-lg ${isVideoOff
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            title={isVideoOff ? "Turn On Video" : "Turn Off Video"}
          >
            📹
          </button>

          {hasMultipleCameras && (
            <button
              onClick={onSwitchCamera}
              className="p-4 rounded-full font-semibold transition-all shadow-lg bg-gray-700 hover:bg-gray-600 text-white"
              title="Switch Camera"
            >
              🔄
            </button>
          )}

          <button
            onClick={onLeaveCall}
            className="p-4 px-6 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-all shadow-lg"
            title="Leave Call"
          >
            📞 Leave
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
