import React from 'react';

const ParticipantList = ({ participants, localUsername, onClose }) => {
  const totalParticipants = participants.length + 1; // +1 for local user

  return (
    <div className="flex flex-col h-full bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold">Participants</h3>
          <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
            {totalParticipants}
          </span>
        </div>

        {/* Close Button (Mobile) */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors lg:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Local User */}
        <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-white font-medium truncate">{localUsername}</p>
              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                You
              </span>
            </div>
            <p className="text-gray-400 text-sm">Local participant</p>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected"></div>
          </div>
        </div>

        {/* Remote Participants */}
        {participants.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <p className="text-sm">No other participants</p>
            <p className="text-xs mt-1">Share the room ID to invite others</p>
          </div>
        ) : (
          participants.map((participant) => (
            <div
              key={participant.userId}
              className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg participant-enter"
            >
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {participant.username}
                </p>
                <p className="text-gray-400 text-sm">Remote participant</p>
              </div>
              <div className="flex items-center space-x-2">
                {/* Media status indicators */}
                {participant.isMuted && (
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center" title="Muted">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  </div>
                )}

                {participant.isVideoOff && (
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center" title="Camera off">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  </div>
                )}

                {/* Connection status */}
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected"></div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-center">
          <p className="text-gray-400 text-xs">
            Room ID: <span className="font-mono text-white">{window.location.pathname.split('/').pop()}</span>
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Share this ID to invite others
          </p>
        </div>
      </div>
    </div>
  );
};

export default ParticipantList;
