const { rooms, participants, incrementConnections } = require("../store");

module.exports = (io) => {
    // --- Helpers ---
    function removeParticipant(roomId, userId) {
        const room = rooms.get(roomId);
        if (room) {
            room.participants.delete(userId);

            // If host leaves, assign new host
            if (room.hostId === userId) {
                const nextHost = Array.from(room.participants)[0];
                if (nextHost) {
                    room.hostId = nextHost;
                    io.to(nextHost).emit("you-are-host");
                    // Send any pending requests to new host
                    if (room.waitingList && room.waitingList.size > 0) {
                        room.waitingList.forEach(waitingUserId => {
                            const waitingUser = participants.get(waitingUserId);
                            if (waitingUser) {
                                io.to(nextHost).emit("user-requested-join", {
                                    userId: waitingUserId,
                                    username: waitingUser.username
                                });
                            }
                        });
                    }
                }
            }

            broadcastParticipantList(roomId);
        }
    }

    function broadcastParticipantList(roomId) {
        const room = rooms.get(roomId);
        if (room) {
            const participantList = Array.from(room.participants).map((id) => {
                const p = participants.get(id);
                return {
                    userId: id,
                    username: p?.username || "Unknown",
                    mediaState: p?.mediaState || { muted: false, videoOff: false },
                    isHost: room.hostId === id
                };
            });

            io.to(roomId).emit("participant-list-update", {
                participants: participantList,
            });
        }
    }

    io.on("connection", (socket) => {
        incrementConnections();
        console.log(`✅ User connected: ${socket.id}`);

        // --- Join room ---
        socket.on("join-room", ({ roomId, username }) => {
            if (!roomId || roomId.trim() === "") {
                socket.emit("error", { message: "Invalid room ID" });
                return;
            }

            // Store user info immediately
            socket.username = username || `User-${socket.id.substring(0, 6)}`;
            participants.set(socket.id, {
                roomId,
                username: socket.username,
                joinedAt: new Date(),
                mediaState: { muted: false, videoOff: false },
            });

            if (socket.roomId) {
                socket.leave(socket.roomId);
                removeParticipant(socket.roomId, socket.id);
            }

            socket.join(roomId);
            socket.roomId = roomId;

            // Create room if not exists
            if (!rooms.has(roomId)) {
                rooms.set(roomId, {
                    participants: new Set(),
                    waitingList: new Set(),
                    hostId: socket.id,
                    createdAt: new Date()
                });

                // Host joins immediately
                joinRoomSuccess(socket, roomId);
            } else {
                const room = rooms.get(roomId);

                // If user is already in participants (re-join), let them in
                if (room.participants.has(socket.id)) {
                    joinRoomSuccess(socket, roomId);
                } else {
                    // Add to waiting list
                    room.waitingList.add(socket.id);
                    socket.emit("waiting-for-approval");

                    // Notify Host
                    if (room.hostId) {
                        io.to(room.hostId).emit("user-requested-join", {
                            userId: socket.id,
                            username: socket.username
                        });
                    }
                }
            }
        });

        function joinRoomSuccess(socket, roomId) {
            const room = rooms.get(roomId);
            room.participants.add(socket.id);
            room.waitingList.delete(socket.id); // Remove from waiting list if they were there

            console.log(`👤 ${socket.username} joined room ${roomId}`);

            socket.to(roomId).emit("user-joined", {
                userId: socket.id,
                username: socket.username,
                mediaState: { muted: false, videoOff: false },
            });

            const currentParticipants = Array.from(room.participants)
                .filter((id) => id !== socket.id)
                .map((id) => {
                    const p = participants.get(id);
                    return {
                        userId: id,
                        username: p?.username || "Unknown",
                        mediaState: p?.mediaState || { muted: false, videoOff: false },
                        isHost: room.hostId === id
                    };
                });

            socket.emit("room-joined", {
                roomId,
                participants: currentParticipants,
                isHost: room.hostId === socket.id
            });

            broadcastParticipantList(roomId);
        }

        // --- Host Response ---
        socket.on("respond-join-request", ({ userId, approved }) => {
            const roomId = socket.roomId;
            const room = rooms.get(roomId);

            if (!room || room.hostId !== socket.id) return; // Only host can respond

            if (approved) {
                const waitingSocket = io.sockets.sockets.get(userId);
                if (waitingSocket) {
                    joinRoomSuccess(waitingSocket, roomId);
                    waitingSocket.emit("join-approved");
                }
            } else {
                const waitingSocket = io.sockets.sockets.get(userId);
                if (waitingSocket) {
                    waitingSocket.emit("join-rejected");
                    waitingSocket.leave(roomId);
                    room.waitingList.delete(userId);
                }
            }
        });

        // --- WebRTC signaling ---
        socket.on("webrtc-offer", ({ targetUserId, offer }) => {
            if (targetUserId) {
                socket.to(targetUserId).emit("webrtc-offer", {
                    fromUserId: socket.id,
                    offer,
                });
            }
        });

        socket.on("webrtc-answer", ({ targetUserId, answer }) => {
            if (targetUserId) {
                socket.to(targetUserId).emit("webrtc-answer", {
                    fromUserId: socket.id,
                    answer,
                });
            }
        });

        socket.on("webrtc-ice-candidate", ({ targetUserId, candidate }) => {
            if (targetUserId && candidate) {
                socket.to(targetUserId).emit("webrtc-ice-candidate", {
                    fromUserId: socket.id,
                    candidate,
                });
            }
        });

        // --- Chat ---
        socket.on("chat-message", (data) => {
            if (socket.roomId) {
                const messageData = {
                    userId: socket.id,
                    username: socket.username || "Anonymous",
                    message: data.message || "",
                    type: data.type || "text",
                    imageUrl: data.imageUrl || null,
                    gifUrl: data.gifUrl || null,
                    timestamp: new Date().toISOString(),
                    roomId: socket.roomId,
                };

                io.to(socket.roomId).emit("chat-message", messageData);

                console.log("📨 Message broadcasted:", {
                    type: messageData.type,
                    from: messageData.username,
                    hasImage: !!messageData.imageUrl,
                    imageSize: messageData.imageUrl ? `${(messageData.imageUrl.length / 1024).toFixed(2)}KB` : 'N/A'
                });
            }
        });

        // --- Typing Indicators ---
        socket.on("typing", () => {
            if (socket.roomId) {
                socket.to(socket.roomId).emit("typing", {
                    userId: socket.id,
                    username: socket.username
                });
            }
        });

        socket.on("stop-typing", () => {
            if (socket.roomId) {
                socket.to(socket.roomId).emit("stop-typing", {
                    userId: socket.id
                });
            }
        });

        // --- Media state ---
        socket.on("media-state-change", (data) => {
            if (socket.roomId) {
                const p = participants.get(socket.id);
                if (p) {
                    p.mediaState = { ...p.mediaState, ...data };
                    participants.set(socket.id, p);
                }
                socket.to(socket.roomId).emit("user-media-state-change", {
                    userId: socket.id,
                    ...data,
                });
                broadcastParticipantList(socket.roomId);
            }
        });

        // --- Disconnect ---
        socket.on("disconnect", () => {
            console.log(`❌ User disconnected: ${socket.id}`);

            if (socket.roomId) {
                socket.to(socket.roomId).emit("user-left", {
                    userId: socket.id,
                    username: socket.username,
                });

                removeParticipant(socket.roomId, socket.id);

                const room = rooms.get(socket.roomId);
                if (room && room.participants.size === 0) {
                    rooms.delete(socket.roomId);
                    console.log(`🗑️  Room ${socket.roomId} deleted (empty)`);
                }
            }

            participants.delete(socket.id);
        });
    });
};
