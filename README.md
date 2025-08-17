# Advanced Chat Application

## Description

This is a full-stack chat application built with a **NestJS** backend and a **Next.js** frontend. It provides real-time messaging capabilities, user authentication, and a modern, responsive user interface, all running on a secure local network.

## Features

-   **Real-Time Messaging**: Instant text communication in a general room or in private one-on-one chats.
-   **End-to-End Encryption**: All messages and files are encrypted using AES, ensuring that only the sender and recipient can view the content.
-   **User Presence**: See the status of other users in real-time (e.g., 'online' or 'busy').
-   **Secure File Sharing**: Share files up to 5MB directly within chats, with the same end-to-end encryption as text messages.
-   **WebRTC Voice Calls**: Initiate secure, peer-to-peer voice calls with other users. The application handles call signaling, busy status, and call termination.
-   **Link Previews**: Automatically generates previews for links shared in messages, including YouTube videos.
-   **Audio Visualizer**: An in-call audio visualizer provides feedback on your microphone activity.
-   **Secure Local Hosting**: Both frontend and backend run on HTTPS, ensuring a secure connection within your local network.

## Installation

Before you begin, ensure you have Node.js and npm installed on your system.

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/advanced_chat_app.git](https://github.com/your-username/advanced_chat_app.git)
    cd advanced_chat_app
    ```

2.  **Install Backend Dependencies:**
    ```bash
    cd advanced-chat-backend
    npm install
    ```

3.  **Install Frontend Dependencies:**
    ```bash
    cd ../advanced-chat-frontend
    npm install
    ```

## Running the App

### Backend (NestJS)

To run the backend server, navigate to the `advanced-chat-backend` directory.

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

The backend server will be running on `https://localhost:3001`.

### Frontend (Next.js)

To run the frontend application, navigate to the `advanced-chat-frontend` directory.

```bash
# development
$ npm run dev

# production build
$ npm run build

# start production server
$ npm run start
```

The frontend application will be accessible at `https://localhost:10000`.

## Stay in touch

-   Author - [Your Name](https://your-website.com)
-   GitHub - [@your-username](https://github.com/your-username)

## License

This project is [MIT licensed](LICENSE).
