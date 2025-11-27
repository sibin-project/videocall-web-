# SoulConnect - Premium Video Calling Experience

SoulConnect is a modern, secure, and feature-rich video calling application designed for seamless connection. Built with React, Node.js, and WebRTC, it offers high-definition video, crystal-clear audio, and a premium user interface.

## ✨ Features

- **🎥 HD Video Calling**: High-quality, low-latency video calls using WebRTC.
- **🔄 Camera Switching**: Seamlessly switch between front and rear cameras on mobile devices.
- **💬 Responsive Chat**: Integrated real-time chat with a responsive layout (Sidebar on Desktop, Bottom Sheet on Mobile).
- **🔒 Secure Authentication**: Robust Google Sign-In integration via Firebase.
- **⏳ Waiting Room**: Host-controlled entry for enhanced privacy and security.
- **👥 Participant Management**: View and manage participants with an intuitive list view.
- **⚡ Dynamic Quality Control**: Adjust video quality on the fly (Ultra Low to High) to save data.
- **📱 Mobile Optimized**: Fully responsive design that looks great on all devices.
- **🎨 Premium UI/UX**: Sleek dark mode design with smooth animations and glassmorphism effects.

## 🛠️ Tech Stack

- **Frontend**: React 18, Tailwind CSS, Socket.IO Client, Firebase Auth
- **Backend**: Node.js, Express, Socket.IO
- **Real-time**: WebRTC (Peer-to-Peer), Socket.IO (Signaling)
- **Styling**: Tailwind CSS, Custom Animations

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- A Firebase Project (for authentication)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd vc_web
    ```

2.  **Install Dependencies:**
    ```bash
    # Install backend dependencies
    cd backend
    npm install

    # Install frontend dependencies
    cd ../client
    npm install
    ```

3.  **Configure Environment Variables:**

    **Backend (`backend/.env`):**
    ```env
    PORT=5000
    FRONTEND_URL=http://localhost:3000
    ```

    **Frontend (`client/.env`):**
    ```env
    REACT_APP_BACKEND_URL=http://localhost:5000
    REACT_APP_FIREBASE_API_KEY=your_api_key
    REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    REACT_APP_FIREBASE_PROJECT_ID=your_project_id
    REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    REACT_APP_FIREBASE_APP_ID=your_app_id
    ```

### Running the Application

Since the backend and frontend are decoupled for development:

1.  **Start the Backend Server:**
    ```bash
    cd backend
    npm run server
    # Server runs on http://localhost:5000
    ```

2.  **Start the Frontend Client:**
    ```bash
    cd client
    npm start
    # Client runs on http://localhost:3000
    ```

## 🏗️ Architecture

-   **Backend (`server.js`)**: Handles WebSocket connections for signaling (WebRTC) and chat. Manages room states and waiting room logic.
-   **Frontend (`client/src`)**:
    -   `Room.jsx`: Core component managing the video call logic, media streams, and layout.
    -   `VideoCall.jsx`: Renders video grids and controls.
    -   `Chat.jsx`: Real-time chat interface.
    -   `WaitingRoom.jsx`: UI for users waiting to be approved.

## 🛡️ Security

-   **Host Approval**: New participants must be approved by the host before joining a room.
-   **Secure Signaling**: All signaling traffic is handled via secure WebSockets.
-   **Authentication**: Users are authenticated via Google to ensure verified identities.

