# WebChat

## Overview
WebChat is a real-time, multi-room chat application built with Node.js, Express, Socket.IO, and MongoDB. Users can join different chat rooms, exchange messages, upload profile pictures, and send GIFs. The application supports dark and bright themes, is mobile-friendly, and retains chat history.

## Features
- Multi-room chat with three predefined rooms.
- Real-time messaging using Socket.IO.
- User nickname and profile picture support.
- Persistent chat history stored in MongoDB.
- GIF search and sending using Giphy API.
- Dark and bright theme toggle with smooth transitions.
- Responsive design for mobile and desktop.
- Settings section with font size sliders and other options.
- Animated gradient background with grain overlay.

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express, Socket.IO
- Database: MongoDB
- APIs: Giphy API
- Deployment: Vercel, Render, or any platform supporting WebSockets

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/webchat.git
cd webchat
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in a `.env` file:
```
MONGO_URI=your_mongodb_connection_string
PORT=3000
```

4. Start the server:
```bash
node server.js
```

5. Open the app in your browser at `http://localhost:3000`.

## File Structure
```
webchat/
├─ server.js          # Backend server with Express and Socket.IO
├─ index.html         # Frontend HTML
├─ script.js          # Frontend JavaScript
├─ styles.css         # Styles and responsive layout
├─ images/            # Icons and grain overlay
├─ package.json       # Node.js dependencies
└─ README.md          # Project documentation
```

## Usage
1. Enter a nickname and optionally upload a profile picture.
2. Choose a chat room and click **Join**.
3. Send text messages or GIFs.
4. Adjust settings like font size or theme.
5. Click **Leave** to exit the room.

## Notes
- Messages are limited to 60 characters.
- GIFs are sent as URLs and displayed inline.
- Avatars are stored in MongoDB along with messages.
- Dark/bright themes have smooth transitions.
- Mobile devices with notches are fully supported.

## Future Improvements
- Add user authentication and private rooms.
- Enable message reactions and emojis.
- Implement message editing and deletion.
- Optimize GIF loading and caching.
- Improve mobile UX with gestures and accessibility enhancements.

## License
MIT License

