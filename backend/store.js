// In-memory storage for rooms and participants
const rooms = new Map();
const participants = new Map();
const pendingRequests = new Map(); // roomId -> [{userId, username, socketId}]

let totalConnections = 0;
const incrementTotalConnections = () => { totalConnections++; };

module.exports = {
    rooms,
    participants,
    pendingRequests,
    getTotalConnections: () => totalConnections,
    incrementTotalConnections
};
