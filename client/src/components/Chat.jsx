// ============================================
// CLIENT: Chat.jsx
// ============================================
import React, { useState, useEffect, useRef } from 'react';

const chatHistory = {};

const Chat = ({ socket, roomId, username }) => {
  const [messages, setMessages] = useState(() => chatHistory[roomId] || []);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Map()); // Map<UserId, Username>
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    chatHistory[roomId] = messages;
  }, [messages, roomId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      delete chatHistory[roomId];
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleChatMessage = (data) => {
      console.log('📩 Received message:', data);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          userId: data.userId,
          username: data.username,
          message: data.message,
          type: data.type || 'text',
          imageUrl: data.imageUrl,
          timestamp: new Date(data.timestamp || Date.now()),
          isOwn: data.userId === socket.id,
        },
      ]);

      // Remove user from typing list if they send a message
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    };

    const handleTyping = ({ userId, username }) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, username);
        return newMap;
      });
    };

    const handleStopTyping = ({ userId }) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    };

    if (socket.connected) setIsConnected(true);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat-message', handleChatMessage);
    socket.on('typing', handleTyping);
    socket.on('stop-typing', handleStopTyping);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat-message', handleChatMessage);
      socket.off('typing', handleTyping);
      socket.off('stop-typing', handleStopTyping);
    };
  }, [socket]);

  // Handle input change for typing indicator
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (socket && isConnected) {
      socket.emit('typing');

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing');
      }, 2000);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !isConnected) return;

    socket.emit('chat-message', {
      message: newMessage.trim(),
      type: 'text',
    });

    socket.emit('stop-typing');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setNewMessage('');
  };

  const sendImage = async () => {
    if (!imageFile || !socket || !isConnected) return;

    const reader = new FileReader();
    reader.onload = () => {
      console.log('📤 Sending image, size:', reader.result.length);
      socket.emit('chat-message', {
        type: 'image',
        imageUrl: reader.result,
        message: 'Sent an image',
      });

      setImagePreview(null);
      setImageFile(null);
    };
    reader.onerror = () => {
      console.error('❌ Error reading file');
      alert('Failed to read image file');
      setImagePreview(null);
      setImageFile(null);
    };
    reader.readAsDataURL(imageFile);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
    e.target.value = '';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const formatTime = (timestamp) =>
    timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full bg-surface transition-colors duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-surface/90 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          <h3 className="text-text-primary font-semibold text-lg">Live Chat</h3>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll bg-background">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'} animate-fadeIn`}>
              <div className={`flex items-end gap-2 max-w-[85%] ${msg.isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar Placeholder */}
                {!msg.isOwn && (
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary text-xs font-bold shadow-sm">
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                )}

                <div
                  className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${msg.type === 'image' ? 'p-1 bg-transparent shadow-none' : ''
                    } ${msg.isOwn
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-white text-text-primary rounded-bl-none border border-gray-100'
                    }`}
                >
                  {!msg.isOwn && msg.type !== 'image' && (
                    <div className="text-[10px] font-bold mb-1 opacity-70 text-primary">
                      {msg.username}
                    </div>
                  )}

                  {msg.type === 'image' && msg.imageUrl ? (
                    <div className="relative group">
                      <img
                        src={msg.imageUrl}
                        alt="sent"
                        className="rounded-xl max-w-full h-auto shadow-md transition-transform hover:scale-[1.02]"
                        style={{ maxHeight: '300px' }}
                      />
                      <div className={`absolute bottom-2 right-2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm`}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm leading-relaxed break-words">{msg.message}</div>
                      <div className={`text-[10px] mt-1 text-right ${msg.isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 ml-10 animate-pulse">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-xs text-gray-500">
              {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-surface/95 backdrop-blur-sm">
        {imagePreview && (
          <div className="mb-3 flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-16 h-16 rounded-lg object-cover border border-gray-200"
            />
            <div className="flex gap-2">
              <button
                onClick={sendImage}
                className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
              >
                Send
              </button>
              <button
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                }}
                className="px-3 py-1.5 bg-red-50 text-red-500 text-sm rounded-lg hover:bg-red-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <label
            className="p-3 rounded-xl cursor-pointer transition-all bg-gray-100 hover:bg-gray-200 text-gray-600"
            title="Send Image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </label>

          <div className="flex-1 flex items-center rounded-xl px-4 py-2 bg-gray-50 border border-gray-200 focus-within:ring-2 focus-within:ring-primary transition-all">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
              disabled={!isConnected}
              className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-text-primary"
            />
          </div>

          <button
            type="button"
            onClick={sendMessage}
            disabled={(!newMessage.trim() && !imageFile) || !isConnected}
            className="p-3 bg-primary text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
          >
            <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
