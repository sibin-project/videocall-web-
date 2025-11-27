// Room.js - Video Call Room Component
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import io from "socket.io-client";
import VideoCall from "./VideoCall";
import Chat from "./Chat";
import ParticipantList from "./ParticipantList";
import WaitingRoom from "./WaitingRoom";

// ==================== CONSTANTS ====================
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:relay1.expressturn.com:3478",
    username: "efree",
    credential: "efree123",
  },
];

const QUALITY_SETTINGS = {
  ultra: {
    video: { width: 320, height: 180, frameRate: 8 },
    bitrate: 50000,
    audioBitrate: 16000,
    label: "Ultra Low (Data Saver)"
  },
  low: {
    video: { width: 320, height: 240, frameRate: 15 },
    bitrate: 150000,
    audioBitrate: 16000,
    label: "Low"
  },
  medium: {
    video: { width: 640, height: 480, frameRate: 24 },
    bitrate: 500000,
    audioBitrate: 32000,
    label: "Medium (Balanced)"
  },
  high: {
    video: { width: 1280, height: 720, frameRate: 30 },
    bitrate: 1500000,
    audioBitrate: 64000,
    label: "High (HD)"
  }
};

// ==================== MAIN COMPONENT ====================
const Room = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ==================== REFS ====================
  const socketRef = useRef(null);
  const peerConnections = useRef(new Map());
  const pendingCandidates = useRef(new Map());
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map());
  const myUserId = useRef(null);
  const currentDeviceId = useRef(null);

  // ==================== STATE ====================
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participantMap, setParticipantMap] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [qualityMode, setQualityMode] = useState("medium"); // Video quality mode
  const [videoDevices, setVideoDevices] = useState([]);
  const [isMirrored, setIsMirrored] = useState(true); // Default to mirrored (front camera)

  // Waiting Room States
  const [isHost, setIsHost] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  // ==================== USERNAME ====================
  const storedUsername = localStorage.getItem("username");
  const usernameParam = searchParams.get("username");
  const username = usernameParam || storedUsername || "Anonymous";

  useEffect(() => {
    if (username && username !== storedUsername) {
      localStorage.setItem("username", username);
    }
  }, [username, storedUsername]);

  // Fetch video devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
      } catch (err) {
        console.warn("Error fetching devices:", err);
      }
    };
    getDevices();
  }, []);

  // ==================== WEBRTC HELPER FUNCTIONS ====================
  const replaceTracksInPeerConnections = useCallback((newStream) => {
    peerConnections.current.forEach((pc, peerId) => {
      pc.getSenders().forEach((sender) => {
        const newTrack = newStream.getTracks().find(t => t.kind === sender.track?.kind);
        if (newTrack) {
          sender.replaceTrack(newTrack).then(() => {
            console.log(`🔄 Replaced ${newTrack.kind} track for peer ${peerId}`);
            const params = sender.getParameters();
            if (!params.encodings) params.encodings = [{}];

            const settings = QUALITY_SETTINGS[qualityMode];
            if (newTrack.kind === "video") {
              params.encodings[0].maxBitrate = settings.bitrate;
              params.encodings[0].maxFramerate = settings.video.frameRate;
              params.encodings[0].priority = "low";
              params.encodings[0].networkPriority = "low";
            } else if (newTrack.kind === "audio") {
              params.encodings[0].maxBitrate = settings.audioBitrate;
              params.encodings[0].priority = "low";
              params.encodings[0].networkPriority = "low";
            }

            sender.setParameters(params).catch(err =>
              console.warn("⚠️ Failed to set params after track replacement:", err)
            );
          }).catch(err => console.error("❌ Track replacement failed:", err));
        }
      });
    });
  }, [qualityMode]);

  const createPeerConnection = useCallback((targetUserId) => {
    if (peerConnections.current.has(targetUserId)) {
      console.warn(`⚠️ Peer connection already exists for ${targetUserId}`);
      return peerConnections.current.get(targetUserId);
    }

    console.log(`🆕 Creating peer connection for ${targetUserId}`);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, localStream);
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];

        const settings = QUALITY_SETTINGS[qualityMode];
        if (track.kind === "video") {
          params.encodings[0].maxBitrate = settings.bitrate;
          params.encodings[0].maxFramerate = settings.video.frameRate;
        } else if (track.kind === "audio") {
          params.encodings[0].maxBitrate = settings.audioBitrate;
        }

        sender.setParameters(params).catch((err) => console.warn("⚠️ Failed:", err));
      });
    }

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      console.log(`📺 Received remote stream from ${targetUserId}`);
      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(targetUserId, stream);
        return newMap;
      });
      if (!remoteVideoRefs.current.has(targetUserId)) {
        remoteVideoRefs.current.set(targetUserId, React.createRef());
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("webrtc-ice-candidate", {
          targetUserId,
          candidate: e.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`📶 Connection state with ${targetUserId}: ${pc.connectionState}`);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // Handle disconnection
      }
    };

    peerConnections.current.set(targetUserId, pc);
    return pc;
  }, [localStream, qualityMode]);

  const createOffer = useCallback(async (targetUserId) => {
    try {
      const pc = createPeerConnection(targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("webrtc-offer", { targetUserId, offer });
    } catch (err) {
      console.error("❌ Error creating offer:", err);
    }
  }, [createPeerConnection]);

  const handleOffer = useCallback(async ({ fromUserId, offer }) => {
    try {
      const pc = createPeerConnection(fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("webrtc-answer", { targetUserId: fromUserId, answer });

      // Process pending candidates
      if (pendingCandidates.current.has(fromUserId)) {
        const candidates = pendingCandidates.current.get(fromUserId);
        candidates.forEach(candidate => pc.addIceCandidate(new RTCIceCandidate(candidate)));
        pendingCandidates.current.delete(fromUserId);
      }
    } catch (err) {
      console.error("❌ Error handling offer:", err);
    }
  }, [createPeerConnection]);

  const handleAnswer = useCallback(async ({ fromUserId, answer }) => {
    try {
      const pc = peerConnections.current.get(fromUserId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (err) {
      console.error("❌ Error handling answer:", err);
    }
  }, []);

  const handleCandidate = useCallback(async ({ fromUserId, candidate }) => {
    const pc = peerConnections.current.get(fromUserId);
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("❌ Error adding ICE candidate:", err);
      }
    } else {
      if (!pendingCandidates.current.has(fromUserId)) {
        pendingCandidates.current.set(fromUserId, []);
      }
      pendingCandidates.current.get(fromUserId).push(candidate);
    }
  }, []);

  // ==================== MEDIA INITIALIZATION ====================
  useEffect(() => {
    const startMedia = async () => {
      try {
        const settings = QUALITY_SETTINGS[qualityMode];
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: settings.video.width, max: settings.video.width },
            height: { ideal: settings.video.height, max: settings.video.height },
            frameRate: { ideal: settings.video.frameRate, max: settings.video.frameRate },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!currentDeviceId.current) {
          const videoTrack = stream.getVideoTracks()[0];
          currentDeviceId.current = videoTrack.getSettings().deviceId;
        }

        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }

        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.volume = 0;
        }

        console.log(`✅ Local media started (${QUALITY_SETTINGS[qualityMode].label})`);

        if (peerConnections.current.size > 0) {
          replaceTracksInPeerConnections(stream);
        }
      } catch (err) {
        console.error("❌ Media error", err);
        setError("Cannot access camera/mic.");
        setIsLoading(false);
      }
    };
    startMedia();
  }, [replaceTracksInPeerConnections]);

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    if (!localStream) return;

    const socketUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      myUserId.current = socket.id;
      console.log("🔌 Connected with ID:", socket.id);
      // Request to join instead of joining directly
      socket.emit("request-join-room", { roomId, username });
    });

    socket.on("disconnect", () => console.log("❌ Disconnected"));

    // Waiting Room Events
    socket.on("waiting-for-approval", () => {
      setIsWaiting(true);
      setIsLoading(false);
    });

    socket.on("join-rejected", () => {
      alert("Your request to join the room was rejected by the host.");
      navigate("/");
    });

    socket.on("join-request", (request) => {
      setPendingRequests(prev => [...prev, request]);
    });

    socket.on("room-joined", (data) => {
      setIsWaiting(false); // No longer waiting
      setIsHost(data.isHost); // Set host status

      const others = data.participants.filter((p) => p.userId !== socket.id);
      setParticipants(others);

      const pMap = new Map();
      others.forEach((p) => pMap.set(p.userId, p.username));
      setParticipantMap(pMap);

      setIsLoading(false);

      setTimeout(() => {
        others.forEach((p) => createOffer(p.userId));
      }, 500);
    });

    socket.on("user-joined", (data) => {
      if (data.userId !== socket.id) {
        setParticipants((prev) => [...prev, data]);
        setParticipantMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.userId, data.username);
          return newMap;
        });
      }
    });

    socket.on("user-left", (data) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
      setParticipantMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });

      const pc = peerConnections.current.get(data.userId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(data.userId);
      }
      pendingCandidates.current.delete(data.userId);
      setRemoteStreams((prev) => {
        const map = new Map(prev);
        map.delete(data.userId);
        return map;
      });
      remoteVideoRefs.current.delete(data.userId);
    });

    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleCandidate);

    return () => {
      socket.close();
    };
  }, [roomId, username, localStream, createOffer, handleOffer, handleAnswer, handleCandidate]);

  // ==================== CONTROL FUNCTIONS ====================
  const toggleMute = () => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  };

  const toggleVideo = () => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoOff(!track.enabled);
    }
  };

  const switchCamera = async () => {
    if (videoDevices.length < 2) return;

    const currentDeviceIndex = videoDevices.findIndex(d => d.deviceId === currentDeviceId.current);
    const nextDeviceIndex = (currentDeviceIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextDeviceIndex];

    currentDeviceId.current = nextDevice.deviceId;
    console.log(`🔄 Switching to camera: ${nextDevice.label || nextDevice.deviceId}`);

    // Determine if we should mirror (Front = yes, Back = no)
    const isBackCamera = nextDevice.label.toLowerCase().includes('back') || nextDevice.label.toLowerCase().includes('environment');
    setIsMirrored(!isBackCamera);

    try {
      const settings = QUALITY_SETTINGS[qualityMode];
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: nextDevice.deviceId },
          width: { ideal: settings.video.width, max: settings.video.width },
          height: { ideal: settings.video.height, max: settings.video.height },
          frameRate: { ideal: settings.video.frameRate, max: settings.video.frameRate },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Stop old stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      setLocalStream(newStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      if (peerConnections.current.size > 0) {
        replaceTracksInPeerConnections(newStream);
      }
    } catch (err) {
      console.error("❌ Camera switch error:", err);
    }
  };

  const handleQualityChange = async (mode) => {
    console.log(`🎥 Quality changed to: ${mode}`);
    setQualityMode(mode);

    // Restart media with new quality settings
    try {
      const settings = QUALITY_SETTINGS[mode];

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: settings.video.width, max: settings.video.width },
          height: { ideal: settings.video.height, max: settings.video.height },
          frameRate: { ideal: settings.video.frameRate, max: settings.video.frameRate },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Stop old stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      // Update stream
      setLocalStream(newStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      // Update peer connections
      if (peerConnections.current.size > 0) {
        replaceTracksInPeerConnections(newStream);
      }

      console.log(`✅ Quality changed to ${settings.label}`);
    } catch (err) {
      console.error("❌ Quality change error:", err);
    }
  };

  const leaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    pendingCandidates.current.clear();
    setRemoteStreams(new Map());
    setParticipants([]);
    remoteVideoRefs.current.clear();
    socketRef.current?.disconnect();
    navigate("/");
  };

  // ==================== RENDER STATES ====================
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-white bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Joining room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isWaiting) {
    return <WaitingRoom roomId={roomId} />;
  }

  // ==================== MAIN RENDER ====================
  return (
    <div className="h-screen flex flex-col bg-gray-900 relative">
      {/* Host Approval Modal */}
      {isHost && pendingRequests.length > 0 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl border border-blue-500/30 overflow-hidden animate-fade-in-down">
            <div className="bg-blue-600 px-4 py-2 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span>🔔</span> Join Request
              </h3>
              <span className="bg-blue-500 text-xs px-2 py-0.5 rounded-full text-white">
                {pendingRequests.length} pending
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {pendingRequests.map((req) => (
                <div key={req.userId} className="p-4 border-b border-gray-700 last:border-0 hover:bg-gray-700/50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">{req.username}</p>
                      <p className="text-xs text-gray-400">Wants to join...</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          socketRef.current.emit("reject-join-request", { roomId, userId: req.userId });
                          setPendingRequests(prev => prev.filter(r => r.userId !== req.userId));
                        }}
                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"
                        title="Reject"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => {
                          socketRef.current.emit("approve-join-request", { roomId, userId: req.userId });
                          setPendingRequests(prev => prev.filter(r => r.userId !== req.userId));
                        }}
                        className="p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-lg transition-all"
                        title="Approve"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex justify-between text-white items-center border-b border-gray-700">
        <div>
          <span className="font-semibold text-lg">Room: {roomId}</span>
          <span className="ml-4 text-sm text-gray-400">
            {participants.length + 1} participant{participants.length !== 0 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`p-2 rounded-lg transition-colors ${showParticipants
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
          >
            👥 <span className="hidden sm:inline ml-1">Participants</span>
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-lg transition-colors ${showChat
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
          >
            💬 <span className="hidden sm:inline ml-1">Chat</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Wrapper - Flex Row on Desktop if chat open */}
        <div className={`flex-1 flex ${showChat ? 'flex-col lg:flex-row' : 'flex-col'}`}>

          {/* Video Call Section */}
          <div className={`bg-black transition-all ${showChat
            ? 'h-1/2 lg:h-full lg:flex-1'
            : 'h-full'
            }`}>
            <VideoCall
              localStream={localStream}
              remoteStreams={remoteStreams}
              participants={participants}
              participantMap={participantMap}
              localVideoRef={localVideoRef}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onLeaveCall={leaveCall}
              showChat={showChat}
              hideControls={showChat}
              qualityMode={qualityMode}
              onQualityChange={handleQualityChange}
              onSwitchCamera={switchCamera}
              hasMultipleCameras={videoDevices.length > 1}
              isMirrored={isMirrored}
            />
          </div>

          {/* Chat Section */}
          {showChat && (
            <div className={`bg-gray-800 flex flex-col ${showChat
              ? 'h-1/2 border-t-2 lg:h-full lg:w-96 lg:border-t-0 lg:border-l border-gray-700'
              : ''
              }`}>
              <Chat
                socket={socketRef.current}
                roomId={roomId}
                username={username}
              />
            </div>
          )}
        </div>

        {/* Participants Sidebar / Bottom Sheet */}
        {showParticipants && (
          <>
            {/* Mobile Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setShowParticipants(false)}
            ></div>

            <div className="fixed inset-x-0 bottom-0 h-[70vh] z-50 rounded-t-2xl border-t border-gray-700 bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out lg:static lg:h-full lg:w-64 lg:border-l lg:border-t-0 lg:rounded-none lg:shadow-none lg:z-auto">
              <ParticipantList
                participants={participants}
                localUsername={username}
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                onClose={() => setShowParticipants(false)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Room;