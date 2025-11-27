const express = require("express");
const router = express.Router();
const { rooms, participants, getTotalConnections } = require("../store");

module.exports = (io) => {
    router.get("/room/:roomId", (req, res) => {
        const { roomId } = req.params;
        const exists = rooms.has(roomId);
        res.json({
            exists,
            participantCount: exists ? rooms.get(roomId).participants.size : 0,
        });
    });

    router.get("/admin/stats", (req, res) => {
        res.json({
            liveUsers: io.engine.clientsCount,
            totalConnections: getTotalConnections(),
            activeRooms: rooms.size,
            usersInRooms: participants.size
        });
    });

    return router;
};
