import { Coordinate, MazeData } from '../types/maze';

/**
 * Genera un laberinto 2D aleatorio utilizando Recursive Backtracking (DFS con pila).
 * Garantiza:
 * 1. Todos los caminos internos están 100% conectados en un solo árbol generador.
 * 2. Exactamente 2 entradas y 2 salidas ubicadas en el perímetro exterior.
 * 3. Las entradas y salidas conectan directamente con pasajes interiores impares.
 * 4. El laberinto es matemáticamente solucionable.
 */
export function generateMaze(size: number): MazeData {
  // Asegurar dimensión impar para división de paredes
  const actualSize = size % 2 === 0 ? size + 1 : size;
  const rows = actualSize;
  const cols = actualSize;

  // 1. Inicializar toda la matriz con paredes (0)
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  // 2. DFS iterativo con pila para tallar caminos
  const startR = 1;
  const startC = 1;
  grid[startR][startC] = 1;
  const stack: Coordinate[] = [[startR, startC]];

  const directions: [number, number][] = [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ];

  while (stack.length > 0) {
    const [currR, currC] = stack[stack.length - 1];

    // Buscar vecinos no visitados a distancia 2
    const unvisited: [number, number, number, number][] = [];
    for (const [dr, dc] of directions) {
      const nr = currR + dr;
      const nc = currC + dc;
      if (nr >= 1 && nr < rows - 1 && nc >= 1 && nc < cols - 1) {
        if (grid[nr][nc] === 0) {
          unvisited.push([nr, nc, dr, dc]);
        }
      }
    }

    if (unvisited.length > 0) {
      // Elegir vecino al azar
      const randIdx = Math.floor(Math.random() * unvisited.length);
      const [nr, nc, dr, dc] = unvisited[randIdx];

      // Romper pared intermedia
      grid[currR + dr / 2][currC + dc / 2] = 1;
      // Romper celda de destino
      grid[nr][nc] = 1;
      stack.push([nr, nc]);
    } else {
      stack.pop();
    }
  }

  // 3. Colocar exactamente 2 entradas y 2 salidas en el perímetro exterior
  const candidateSlots: Coordinate[] = [];

  // Borde superior (fila 0) -> conecta con (1, c)
  for (let c = 1; c < cols - 1; c += 2) {
    if (grid[1][c] === 1) candidateSlots.push([0, c]);
  }
  // Borde inferior (fila rows-1) -> conecta con (rows-2, c)
  for (let c = 1; c < cols - 1; c += 2) {
    if (grid[rows - 2][c] === 1) candidateSlots.push([rows - 1, c]);
  }
  // Borde izquierdo (col 0) -> conecta con (r, 1)
  for (let r = 1; r < rows - 1; r += 2) {
    if (grid[r][1] === 1) candidateSlots.push([r, 0]);
  }
  // Borde derecho (col cols-1) -> conecta con (r, cols-2)
  for (let r = 1; r < rows - 1; r += 2) {
    if (grid[r][cols - 2] === 1) candidateSlots.push([r, cols - 1]);
  }

  // Barajar candidatos y tomar 4 ranuras únicas
  const shuffled = [...candidateSlots].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);

  const entrances: [Coordinate, Coordinate] = [selected[0], selected[1]];
  const exits: [Coordinate, Coordinate] = [selected[2], selected[3]];

  // Abrir celdas de entrada y salida en la matriz
  for (const [r, c] of entrances) {
    grid[r][c] = 1;
  }
  for (const [r, c] of exits) {
    grid[r][c] = 1;
  }

  return {
    size: actualSize,
    rows,
    cols,
    grid,
    entrances,
    exits,
  };
}
