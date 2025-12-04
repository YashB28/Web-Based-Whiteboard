import { useState } from "react";
import Whiteboard from "./Whiteboard";

function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId.trim() || !userName.trim()) return;
    setJoined(true);
  };

  const handleLeave = () => {
    setJoined(false);
  };

  if (!joined) {
    return (
      <div className="app-center">
        <div className="card">
          <h1>Collaborative Whiteboard</h1>
          <p>Enter a display name and room ID to start collaborating.</p>
          <form onSubmit={handleJoin}>
            <div className="field">
              <label>Display Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Yash"
              />
            </div>
            <div className="field">
              <label>Room ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g. room-123"
              />
            </div>
            <button type="submit" className="button-primary">
              Join Whiteboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Whiteboard roomId={roomId} userName={userName} onLeave={handleLeave} />
  );
}

export default App;