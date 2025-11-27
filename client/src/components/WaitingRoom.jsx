import React from 'react';

const WaitingRoom = ({ roomId }) => {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-gray-700">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <span className="text-4xl">⏳</span>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Waiting for Host</h2>
                <p className="text-gray-400 mb-6">
                    The host has been notified. You will join the room automatically once approved.
                </p>

                <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-500 mb-1">Room ID</p>
                    <p className="text-lg font-mono text-blue-400 font-semibold tracking-wider">{roomId}</p>
                </div>

                <div className="flex justify-center">
                    <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WaitingRoom;
