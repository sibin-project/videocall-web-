const { rooms, participants, pendingRequests } = require("../store");

module.exports = (io, socket) => {
    // --- Request to join room (Waiting for approval) ---
    socket.on("request-join-room", ({ roomId, username }) => {
        if (!roomId || !roomId.trim()) {
            return socket.emit("error", { message: "Invalid room ID" });
        }

        const sanitizedUsername = username || `User-${socket.id.substring(0, 6)}`;

        // Check if room exists
        if (!rooms.has(roomId)) {
            // First person - auto-join as host
            joinRoomDirectly(io, socket, roomId, sanitizedUsername, true);
            return;
        }

        // Room exists - add to pending requests
        if (!pendingRequests.has(roomId)) {
            pendingRequests.set(roomId, []);
        }

        const pending = pendingRequests.get(roomId);

        // Check if already pending
        if (pending.some(req => req.socketId === socket.id)) {
            return;
        }

        pending.push({
            userId: socket.id,
            username: sanitizedUsername,
            socketId: socket.id,
            requestedAt: new Date()
        });

        // Notify user they're waiting
        socket.emit("waiting-for-approval", { roomId });

        // Notify room host about new join request
        const room = rooms.get(roomId);
        if (room && room.host) {
            io.to(room.host).emit("join-request", {
                userId: socket.id,
                username: sanitizedUsername,
                roomId
            });
        }
    });

    // --- Host approves join request ---
    socket.on("approve-join-request", ({ roomId, userId }) => {
        const room = rooms.get(roomId);

        // Verify requester is the host
        if (!room || room.host !== socket.id) {
            return;
        }

        const pending = pendingRequests.get(roomId) || [];
        const request = pending.find(req => req.userId === userId);

        if (!request) {
            return;
        }

        // Remove from pending
        const index = pending.indexOf(request);
        pending.splice(index, 1);

        // Get the socket and join them
        const userSocket = io.sockets.sockets.get(userId);
        if (userSocket) {
            joinRoomDirectly(io, userSocket, roomId, request.username, false);
        }
    });

    // --- Host rejects join request ---
    socket.on("reject-join-request", ({ roomId, userId }) => {
        const room = rooms.get(roomId);

        // Verify requester is the host
        if (!room || room.host !== socket.id) {
            return;
        }

        const pending = pendingRequests.get(roomId) || [];
        const request = pending.find(req => req.userId === userId);

        if (!request) {
            return;
        }

        // Remove from pending
        const index = pending.indexOf(request);
        pending.splice(index, 1);

        // Notify user they were rejected
        const userSocket = io.sockets.sockets.get(userId);
        if (userSocket) {
            userSocket.emit("join-rejected", { roomId });
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

            removeParticipant(io, socket.roomId, socket.id);

            const room = rooms.get(socket.roomId);
            if (room && room.participants.size === 0) {
                rooms.delete(socket.roomId);
                console.log(`🗑️  Room ${socket.roomId} deleted (empty)`);
            }
        }

        participants.delete(socket.id);
    });
};

// --- Helpers ---
function joinRoomDirectly(io, socket, roomId, username, isHost = false) {
    if (socket.roomId) {
        socket.leave(socket.roomId);
        removeParticipant(io, socket.roomId, socket.id);
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;

    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            participants: new Set(),
            createdAt: new Date(),
            host: isHost ? socket.id : null
        });
    }

    const room = rooms.get(roomId);
    room.participants.add(socket.id);

    // If room has no host (e.g. host left), make this user the host
    if (!room.host) {
        room.host = socket.id;
        isHost = true;
    }

    participants.set(socket.id, {
        roomId,
        username: socket.username,
        joinedAt: new Date(),
        mediaState: { muted: false, videoOff: false },
        isHost
    });

    console.log(`👤 ${socket.username} joined room ${roomId} (Host: ${isHost})`);

    // Notify others
    socket.to(roomId).emit("user-joined", {
        userId: socket.id,
        username: socket.username,
        mediaState: { muted: false, videoOff: false },
        isHost
    });

    // Send room details to user
    const currentParticipants = Array.from(room.participants)
        .filter((id) => id !== socket.id)
        .map((id) => {
            const p = participants.get(id);
            return {
                userId: id,
                username: p?.username || "Unknown",
                mediaState: p?.mediaState || { muted: false, videoOff: false },
                isHost: p?.isHost || false
            };
        });

    socket.emit("room-joined", {
        roomId,
        participants: currentParticipants,
        isHost
    });

    broadcastParticipantList(io, roomId);
}

function removeParticipant(io, roomId, userId) {
    const room = rooms.get(roomId);
    if (room) {
        room.participants.delete(userId);
        broadcastParticipantList(io, roomId);
    }
}

function broadcastParticipantList(io, roomId) {
    const room = rooms.get(roomId);
    if (room) {
        const participantList = Array.from(room.participants).map((id) => {
            const p = participants.get(id);
            return {
                userId: id,
                username: p?.username || "Unknown",
                mediaState: p?.mediaState || { muted: false, videoOff: false },
                isHost: p?.isHost || false
            };
        });

        io.to(roomId).emit("participant-list-update", {
            participants: participantList,
        });
    }
}
