export type Coordinate = [number, number];

export type DifficultyKey = 'FACIL' | 'MEDIO' | 'DIFICIL';

export interface DifficultyConfig {
  key: DifficultyKey;
  name: string;
  size: number;
  description: string;
  defaultSpeed: number;
}

export interface MazeData {
  size: number;
  rows: number;
  cols: number;
  grid: number[][]; // 0: pared, 1: camino
  entrances: [Coordinate, Coordinate];
  exits: [Coordinate, Coordinate];
}

export interface EntranceEvaluation {
  entranceIndex: number;
  entrancePos: Coordinate;
  pathLength: number;
  visitedCount: number;
  path: Coordinate[];
  targetExit: Coordinate | null;
}

export type AgentStatus = 'IDLE' | 'SEARCHING' | 'FOUND' | 'NO_PATH';

export interface AgentMetrics {
  status: AgentStatus;
  activeEntrance: Coordinate | null;
  reachedExit: Coordinate | null;
  currentPos: Coordinate | null;
  exploredCount: number;
  stepsCount: number;
  comparisons: EntranceEvaluation[];
  chosenEntranceIndex: number | null;
}
