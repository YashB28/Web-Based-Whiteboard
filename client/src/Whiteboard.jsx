import { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

// Backend Socket.IO + API base URL
const SOCKET_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
const API_BASE = SOCKET_URL;

function Whiteboard({ roomId, userName, onLeave }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });

  const socketRef = useRef(null);

  const [color, setColor] = useState("#ffffff");
  const [lineWidth, setLineWidth] = useState(3);
  const [status, setStatus] = useState("Connecting...");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- Socket.IO setup ---
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("Connected");
      socket.emit("join_room", { roomId, userName });
    });

    socket.on("disconnect", () => {
      setStatus("Disconnected");
    });

    socket.on("user_joined", (data) => {
      console.log("User joined:", data);
    });

    socket.on("draw", (data) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const { x0, y0, x1, y1, color, lineWidth } = data;
      drawLine(ctx, x0, y0, x1, y1, color, lineWidth);
    });

    socket.on("clear", () => {
      clearCanvas();
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, userName]);

  // --- Canvas resizing ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const temp = document.createElement("canvas");
      temp.width = canvas.width;
      temp.height = canvas.height;
      temp.getContext("2d").drawImage(canvas, 0, 0);

      canvas.width = rect.width;
      canvas.height = rect.height;

      canvas.getContext("2d").drawImage(temp, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const drawLine = (ctx, x0, y0, x1, y1, strokeColor, strokeWidth) => {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasPos(e);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const newPos = getCanvasPos(e);
    const { x: x0, y: y0 } = lastPointRef.current;
    const { x: x1, y: y1 } = newPos;

    drawLine(ctx, x0, y0, x1, y1, color, lineWidth);

    socketRef.current?.emit("draw", {
      roomId,
      x0,
      y0,
      x1,
      y1,
      color,
      lineWidth,
    });

    lastPointRef.current = newPos;
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClear = () => {
    clearCanvas();
    socketRef.current?.emit("clear", roomId);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL("image/png");
      const res = await fetch(`${API_BASE}/api/sessions/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userName,
          imageData,
        }),
      });
      const data = await res.json();
      console.log("Save response:", data);
      if (!res.ok) {
        alert("Error saving: " + (data.error || "Unknown error"));
      } else {
        alert("Whiteboard saved (" + data.action + ").");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving whiteboard");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/api/sessions/${roomId}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "No saved session for this room.");
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        clearCanvas();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = data.imageData;
    } catch (err) {
      console.error(err);
      alert("Error loading whiteboard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="layout">
      <header>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            Room: {roomId}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
            User: {userName} • Status: {status}
          </div>
        </div>
        <button className="button-danger toolbar-button" onClick={onLeave}>
          Leave
        </button>
      </header>

      <div className="toolbar">
        <div className="toolbar-spacer">Collaborative Whiteboard</div>
        <label>
          Color
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: "32px", height: "32px", border: "none" }}
          />
        </label>
        <label>
          Brush
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
          />
        </label>
        <button onClick={handleClear}>Clear</button>
        <button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button onClick={handleLoad} disabled={isLoading}>
          {isLoading ? "Loading..." : "Load"}
        </button>
      </div>

      <div className="main-canvas-container">
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
        </div>
      </div>
    </div>
  );
}

export default Whiteboard;