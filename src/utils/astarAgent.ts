import { Coordinate, MazeData, EntranceEvaluation } from '../types/maze';

/**
 * Distancia Manhattan admisible y consistente:
 * h((r1, c1), (r2, c2)) = |r1 - r2| + |c1 - c2|
 */
export function manhattanDistance(a: Coordinate, b: Coordinate): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

/**
 * Heurística mínima hacia cualquiera de las salidas
 */
export function heuristicToExits(pos: Coordinate, exits: Coordinate[]): number {
  return Math.min(...exits.map((ex) => manhattanDistance(pos, ex)));
}

/**
 * Obtener vecinos ortogonales válidos (Arriba, Abajo, Izquierda, Derecha)
 */
export function getValidNeighbors(pos: Coordinate, maze: MazeData): Coordinate[] {
  const [r, c] = pos;
  const directions: [number, number][] = [
    [-1, 0], // Arriba
    [1, 0],  // Abajo
    [0, -1], // Izquierda
    [0, 1],  // Derecha
  ];
  const neighbors: Coordinate[] = [];
  for (const [dr, dc] of directions) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < maze.rows && nc >= 0 && nc < maze.cols && maze.grid[nr][nc] === 1) {
      neighbors.push([nr, nc]);
    }
  }
  return neighbors;
}

/**
 * Serializar coordenada a string para Sets y Maps
 */
export function coordKey(c: Coordinate): string {
  return `${c[0]},${c[1]}`;
}

/**
 * Ejecución estática de A* para comparar cuál entrada produce el camino más corto
 */
export function runStaticAstar(start: Coordinate, exits: Coordinate[], maze: MazeData): { path: Coordinate[]; visitedCount: number } {
  let counter = 0;
  // Elemento: [f, h, counter, coord]
  const openQueue: [number, number, number, Coordinate][] = [];
  const startH = heuristicToExits(start, exits);
  openQueue.push([startH, startH, counter++, start]);

  const cameFrom = new Map<string, Coordinate>();
  const gScore = new Map<string, number>();
  gScore.set(coordKey(start), 0);
  const closedSet = new Set<string>();

  const exitKeySet = new Set(exits.map(coordKey));

  while (openQueue.length > 0) {
    // Orden determinístico: menor f, luego menor h, luego menor counter (FIFO)
    openQueue.sort((a, b) => {
      if (a[0] !== b[0]) return a[0] - b[0];
      if (a[1] !== b[1]) return a[1] - b[1];
      return a[2] - b[2];
    });

    const [, , , current] = openQueue.shift()!;
    const curKey = coordKey(current);

    if (closedSet.has(curKey)) continue;
    closedSet.add(curKey);

    // Salida encontrada
    if (exitKeySet.has(curKey)) {
      const path: Coordinate[] = [];
      let trace: Coordinate | undefined = current;
      while (trace) {
        path.push(trace);
        const prevKey = coordKey(trace);
        trace = cameFrom.get(prevKey);
      }
      path.reverse();
      return { path, visitedCount: closedSet.size };
    }

    const curG = gScore.get(curKey) ?? 0;
    for (const neighbor of getValidNeighbors(current, maze)) {
      const nKey = coordKey(neighbor);
      if (closedSet.has(nKey)) continue;

      const tentativeG = curG + 1;
      const prevG = gScore.get(nKey);
      if (prevG === undefined || tentativeG < prevG) {
        cameFrom.set(nKey, current);
        gScore.set(nKey, tentativeG);
        const hVal = heuristicToExits(neighbor, exits);
        const fVal = tentativeG + hVal;
        openQueue.push([fVal, hVal, counter++, neighbor]);
      }
    }
  }

  return { path: [], visitedCount: closedSet.size };
}

/**
 * Evaluar ambas entradas determinísticamente para escoger la de menor camino
 */
export function evaluateEntrances(maze: MazeData): {
  bestEntrance: Coordinate;
  chosenIndex: number;
  evaluations: EntranceEvaluation[];
} {
  const evaluations: EntranceEvaluation[] = maze.entrances.map((entrance, idx) => {
    const { path, visitedCount } = runStaticAstar(entrance, maze.exits, maze);
    const pathLength = path.length > 0 ? path.length : Infinity;
    const targetExit = path.length > 0 ? path[path.length - 1] : null;
    return {
      entranceIndex: idx + 1,
      entrancePos: entrance,
      pathLength,
      visitedCount,
      path,
      targetExit,
    };
  });

  // Ordenar por longitud de camino, desempate por índice
  evaluations.sort((a, b) => {
    if (a.pathLength !== b.pathLength) return a.pathLength - b.pathLength;
    return a.entranceIndex - b.entranceIndex;
  });

  const best = evaluations[0];
  return {
    bestEntrance: best.entrancePos,
    chosenIndex: best.entranceIndex,
    evaluations,
  };
}

export interface AStarStepState {
  current: Coordinate;
  closedSet: Set<string>;
  openSet: Set<string>;
  isFinished: boolean;
  foundExit: boolean;
  reachedExit: Coordinate | null;
  path: Coordinate[];
}

/**
 * Clase para manejar la ejecución paso a paso en el renderizador web
 */
export class InteractiveAStarRunner {
  private maze: MazeData;
  private openQueue: [number, number, number, Coordinate][] = [];
  private cameFrom = new Map<string, Coordinate>();
  private gScore = new Map<string, number>();
  private closedSet = new Set<string>();
  private openSet = new Set<string>();
  private counter = 0;
  private exits: Coordinate[];
  private exitKeySet: Set<string>;
  public startPos: Coordinate;

  public currentPos: Coordinate | null = null;
  public reachedExit: Coordinate | null = null;
  public isFinished = false;
  public foundExit = false;
  public optimalPath: Coordinate[] = [];

  constructor(maze: MazeData, startPos: Coordinate) {
    this.maze = maze;
    this.startPos = startPos;
    this.exits = maze.exits;
    this.exitKeySet = new Set(this.exits.map(coordKey));

    const startH = heuristicToExits(startPos, this.exits);
    this.openQueue.push([startH, startH, this.counter++, startPos]);
    this.openSet.add(coordKey(startPos));
    this.gScore.set(coordKey(startPos), 0);
  }

  public step(): boolean {
    if (this.isFinished || this.openQueue.length === 0) {
      if (!this.foundExit) {
        this.isFinished = true;
      }
      return false; // Terminó
    }

    // Orden determinístico: menor f, luego menor h, luego counter (FIFO)
    this.openQueue.sort((a, b) => {
      if (a[0] !== b[0]) return a[0] - b[0];
      if (a[1] !== b[1]) return a[1] - b[1];
      return a[2] - b[2];
    });

    const [, , , current] = this.openQueue.shift()!;
    const curKey = coordKey(current);
    this.openSet.delete(curKey);

    if (this.closedSet.has(curKey)) {
      return true; // Continuar al siguiente paso
    }

    this.closedSet.add(curKey);
    this.currentPos = current;

    // ¿Llegamos a alguna salida?
    if (this.exitKeySet.has(curKey)) {
      this.reachedExit = current;
      this.foundExit = true;
      this.isFinished = true;

      // Reconstruir camino óptimo
      const path: Coordinate[] = [];
      let trace: Coordinate | undefined = current;
      while (trace) {
        path.push(trace);
        const prevKey = coordKey(trace);
        trace = this.cameFrom.get(prevKey);
      }
      path.reverse();
      this.optimalPath = path;
      return false;
    }

    const curG = this.gScore.get(curKey) ?? 0;
    for (const neighbor of getValidNeighbors(current, this.maze)) {
      const nKey = coordKey(neighbor);
      if (this.closedSet.has(nKey)) continue;

      const tentativeG = curG + 1;
      const prevG = this.gScore.get(nKey);
      if (prevG === undefined || tentativeG < prevG) {
        this.cameFrom.set(nKey, current);
        this.gScore.set(nKey, tentativeG);
        const hVal = heuristicToExits(neighbor, this.exits);
        const fVal = tentativeG + hVal;
        this.openQueue.push([fVal, hVal, this.counter++, neighbor]);
        this.openSet.add(nKey);
      }
    }

    return true;
  }

  public getClosedSet(): Set<string> {
    return this.closedSet;
  }

  public getOpenSet(): Set<string> {
    return this.openSet;
  }
}
