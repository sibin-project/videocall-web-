const { participants, rooms } = require("../store");

module.exports = (io, socket) => {
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

            // Broadcast to ALL users in room (including sender)
            io.to(socket.roomId).emit("chat-message", messageData);
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
            broadcastParticipantList(io, socket.roomId);
        }
    });
};

// Helper needed for media state change
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
