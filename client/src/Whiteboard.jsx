import { useRef, useEffect, useState } from "react";

function Whiteboard({ roomId, userName, onLeave }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });

  const [color, setColor] = useState("#ffffff");
  const [lineWidth, setLineWidth] = useState(3);

  // Resize canvas to container size while preserving content
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

  return (
    <div className="layout">
      <header>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            Room: {roomId}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
            User: {userName}
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
        <button onClick={clearCanvas}>Clear</button>
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