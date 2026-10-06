import React, { useEffect, useRef } from 'react';
import { MazeData, Coordinate } from '../types/maze';
import { coordKey } from '../utils/astarAgent';

interface MazeCanvasProps {
  maze: MazeData;
  closedSet: Set<string>;
  openSet: Set<string>;
  currentPos: Coordinate | null;
  optimalPath: Coordinate[];
  isSearching: boolean;
  isFinished: boolean;
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({
  maze,
  closedSet,
  openSet,
  currentPos,
  optimalPath,
  isSearching,
  isFinished,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Obtener dimensiones
    const size = Math.min(canvas.clientWidth, canvas.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Fondo
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    const cols = maze.cols;
    const rows = maze.rows;
    const cellSize = Math.floor(size / Math.max(cols, rows));
    const offsetX = Math.floor((size - cellSize * cols) / 2);
    const offsetY = Math.floor((size - cellSize * rows) / 2);

    const entrance1Key = coordKey(maze.entrances[0]);
    const entrance2Key = coordKey(maze.entrances[1]);
    const exit1Key = coordKey(maze.exits[0]);
    const exit2Key = coordKey(maze.exits[1]);

    const optimalSet = new Set(optimalPath.map(coordKey));

    // 1. Dibujar celdas base
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const key = `${r},${c}`;

        // Determinar color según jerarquía
        if (key === entrance1Key || key === entrance2Key) {
          ctx.fillStyle = '#2563eb'; // Azul (Entradas)
        } else if (key === exit1Key || key === exit2Key) {
          ctx.fillStyle = '#dc2626'; // Rojo (Salidas)
        } else if (optimalSet.has(key)) {
          ctx.fillStyle = '#eab308'; // Amarillo Dorado (Camino óptimo)
        } else if (currentPos && currentPos[0] === r && currentPos[1] === c && !isFinished) {
          ctx.fillStyle = '#22c55e'; // Verde (Agente activo)
        } else if (openSet.has(key)) {
          ctx.fillStyle = '#fed7aa'; // Ámbar suave (Frontera)
        } else if (closedSet.has(key)) {
          ctx.fillStyle = '#bfdbfe'; // Azul suave (Explorado por A*)
        } else if (maze.grid[r][c] === 1) {
          ctx.fillStyle = '#ffffff'; // Blanco (Caminos)
        } else {
          ctx.fillStyle = '#0f1117'; // Negro (Paredes)
        }

        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    // 2. Dibujar etiquetas en Entradas (E1, E2) y Salidas (S1, S2) si la celda es suficientemente grande
    if (cellSize >= 14) {
      ctx.font = `bold ${Math.max(9, Math.floor(cellSize * 0.45))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Entradas (E1, E2)
      maze.entrances.forEach(([r, c], idx) => {
        const x = offsetX + c * cellSize + cellSize / 2;
        const y = offsetY + r * cellSize + cellSize / 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`E${idx + 1}`, x, y);
      });

      // Salidas (S1, S2)
      maze.exits.forEach(([r, c], idx) => {
        const x = offsetX + c * cellSize + cellSize / 2;
        const y = offsetY + r * cellSize + cellSize / 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`S${idx + 1}`, x, y);
      });
    }

    // 3. Resaltar agente con un círculo distintivo si está explorando
    if (currentPos && (isSearching || isFinished)) {
      const [ar, ac] = currentPos;
      const ax = offsetX + ac * cellSize + cellSize / 2;
      const ay = offsetY + ar * cellSize + cellSize / 2;
      const radius = Math.max(3, cellSize * 0.35);

      ctx.beginPath();
      ctx.arc(ax, ay, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      ctx.lineWidth = Math.max(1, cellSize * 0.1);
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    ctx.restore();
  }, [maze, closedSet, openSet, currentPos, optimalPath, isSearching, isFinished]);

  return (
    <div className="relative w-full aspect-square max-w-[680px] mx-auto bg-slate-950 p-2 rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full block rounded-lg"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
