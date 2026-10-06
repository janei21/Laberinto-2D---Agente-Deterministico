import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DifficultyKey, MazeData, Coordinate, EntranceEvaluation } from './types/maze';
import { generateMaze } from './utils/mazeGenerator';
import {
  evaluateEntrances,
  InteractiveAStarRunner,
} from './utils/astarAgent';
import { MazeCanvas } from './components/MazeCanvas';
import { CodeViewer } from './components/CodeViewer';
import {
  Play,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Download,
  Code2,
  Compass,
  Zap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { MAIN_PY_CODE } from './data/mainPyCode';

const DIFFICULTIES_CONFIG: Record<
  DifficultyKey,
  { name: string; size: number; desc: string; defaultSpeed: number }
> = {
  FACIL: {
    name: 'Fácil',
    size: 21,
    desc: '21x21 celdas (~100 pasajes)',
    defaultSpeed: 0.5,
  },
  MEDIO: {
    name: 'Medio',
    size: 31,
    desc: '31x31 celdas (~225 pasajes)',
    defaultSpeed: 0.5,
  },
  DIFICIL: {
    name: 'Difícil',
    size: 45,
    desc: '45x45 celdas (~500 pasajes)',
    defaultSpeed: 1,
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code'>('simulator');
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING'>('MENU');
  const [difficulty, setDifficulty] = useState<DifficultyKey>('FACIL');
  
  // Datos del laberinto
  const [maze, setMaze] = useState<MazeData | null>(null);
  const [comparisons, setComparisons] = useState<EntranceEvaluation[]>([]);
  const [chosenEntranceIndex, setChosenEntranceIndex] = useState<number | null>(null);

  // Estado del agente A*
  const [isSearching, setIsSearching] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [closedSet, setClosedSet] = useState<Set<string>>(new Set());
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());
  const [currentPos, setCurrentPos] = useState<Coordinate | null>(null);
  const [activeEntrance, setActiveEntrance] = useState<Coordinate | null>(null);
  const [reachedExit, setReachedExit] = useState<Coordinate | null>(null);
  const [optimalPath, setOptimalPath] = useState<Coordinate[]>([]);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(0.5);

  const runnerRef = useRef<InteractiveAStarRunner | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const accumulatorRef = useRef<number>(0);

  // Inicializar nuevo laberinto
  const handleStartGame = useCallback((diffKey: DifficultyKey) => {
    setDifficulty(diffKey);
    const config = DIFFICULTIES_CONFIG[diffKey];
    setSpeedMultiplier(config.defaultSpeed);

    const newMaze = generateMaze(config.size);
    setMaze(newMaze);

    // Evaluar entradas determinísticamente
    const evaluation = evaluateEntrances(newMaze);
    setComparisons(evaluation.evaluations);
    setChosenEntranceIndex(evaluation.chosenIndex);

    // Resetear estados del agente
    setIsSearching(false);
    setIsFinished(false);
    setClosedSet(new Set());
    setOpenSet(new Set());
    setCurrentPos(evaluation.bestEntrance);
    setActiveEntrance(evaluation.bestEntrance);
    setReachedExit(null);
    setOptimalPath([]);

    runnerRef.current = null;
    setGameState('PLAYING');
  }, []);

  const handleGenerateNewMaze = useCallback(() => {
    handleStartGame(difficulty);
  }, [difficulty, handleStartGame]);

  const handleResetSearch = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (!maze) return;

    const evaluation = evaluateEntrances(maze);
    setIsSearching(false);
    setIsFinished(false);
    setClosedSet(new Set());
    setOpenSet(new Set());
    setCurrentPos(evaluation.bestEntrance);
    setActiveEntrance(evaluation.bestEntrance);
    setReachedExit(null);
    setOptimalPath([]);
    runnerRef.current = null;
    accumulatorRef.current = 0;
  }, [maze]);

  const handleStartAgent = useCallback(() => {
    if (!maze || isSearching || isFinished) return;

    const evaluation = evaluateEntrances(maze);
    const runner = new InteractiveAStarRunner(maze, evaluation.bestEntrance);
    runnerRef.current = runner;
    accumulatorRef.current = 0;

    setIsSearching(true);
    setIsFinished(false);
    setActiveEntrance(evaluation.bestEntrance);
    setReachedExit(null);
    setOptimalPath([]);
  }, [maze, isSearching, isFinished]);

  // Bucle de animación
  useEffect(() => {
    if (!isSearching || !runnerRef.current) return;

    let isSubscribed = true;

    const loop = () => {
      const runner = runnerRef.current;
      if (!runner || !isSubscribed) return;

      let keepGoing = true;
      accumulatorRef.current += speedMultiplier;
      while (accumulatorRef.current >= 1.0) {
        accumulatorRef.current -= 1.0;
        const canContinue = runner.step();
        if (!canContinue) {
          keepGoing = false;
          break;
        }
      }

      setClosedSet(new Set(runner.getClosedSet()));
      setOpenSet(new Set(runner.getOpenSet()));
      setCurrentPos(runner.currentPos);

      if (runner.isFinished || !keepGoing) {
        setIsSearching(false);
        setIsFinished(true);
        if (runner.foundExit) {
          setReachedExit(runner.reachedExit);
          setOptimalPath(runner.optimalPath);
          setCurrentPos(runner.reachedExit);
        }
      } else {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSearching, speedMultiplier]);

  const handleDownloadMainPy = () => {
    const blob = new Blob([MAIN_PY_CODE], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'main.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* TOP BAR CONTRACT: Zone 1 (Wordmark) — Zone 2 (Nav links) — Zone 3 (Primary Action) */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        {/* Zona 1: Brand title, one line */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            Laberinto 2D A* Pygame
          </span>
        </div>

        {/* Zona 2: Nav links, 1-2 word labels */}
        <nav className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Simulador Visual Web
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Código Pygame (main.py)
          </button>
        </nav>

        {/* Zona 3: 1-2 primary actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadMainPy}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Descargar main.py</span>
            <span className="sm:hidden">main.py</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'code' ? (
          <CodeViewer />
        ) : gameState === 'MENU' ? (
          /* PANTALLA: MENÚ PRINCIPAL */
          <div className="flex flex-col items-center justify-center min-h-[75vh] py-8 text-center">
            <div className="max-w-2xl mx-auto space-y-4">
              <span className="text-xs font-semibold text-blue-400 tracking-wider uppercase">
                Inteligencia Artificial y Búsqueda Heurística
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                Laberinto 2D con Agente A*
              </h1>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                Generación procedural con Recursive Backtracking (DFS) con 2 entradas y 2 salidas externas garantizadas. El agente determinístico utiliza la distancia Manhattan para encontrar la ruta óptima de menor longitud.
              </p>
            </div>

            {/* Tarjeta de Selección de Dificultad */}
            <div className="mt-10 p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full space-y-4 text-left">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                Selecciona la Dificultad
              </h2>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => handleStartGame('FACIL')}
                  className="w-full p-4 rounded-xl bg-slate-800 hover:bg-emerald-600/20 hover:border-emerald-500/50 border border-slate-700/80 transition-all text-left flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-bold text-emerald-400 group-hover:text-emerald-300">
                      1. FÁCIL (21x21)
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {DIFFICULTIES_CONFIG.FACIL.desc}
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-950 text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    Iniciar
                  </span>
                </button>

                <button
                  onClick={() => handleStartGame('MEDIO')}
                  className="w-full p-4 rounded-xl bg-slate-800 hover:bg-blue-600/20 hover:border-blue-500/50 border border-slate-700/80 transition-all text-left flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-bold text-blue-400 group-hover:text-blue-300">
                      2. MEDIO (31x31)
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {DIFFICULTIES_CONFIG.MEDIO.desc}
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-950 text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    Iniciar
                  </span>
                </button>

                <button
                  onClick={() => handleStartGame('DIFICIL')}
                  className="w-full p-4 rounded-xl bg-slate-800 hover:bg-purple-600/20 hover:border-purple-500/50 border border-slate-700/80 transition-all text-left flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-bold text-purple-400 group-hover:text-purple-300">
                      3. DIFÍCIL (45x45)
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {DIFFICULTIES_CONFIG.DIFICIL.desc}
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-950 text-slate-300 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    Iniciar
                  </span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Versión Python: Pygame 2.5+</span>
                <button
                  onClick={() => setActiveTab('code')}
                  className="text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Ver código Python →
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* PANTALLA: JUEGO / LABERINTO ACTIVO */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ZONA IZQUIERDA: CANVAS DEL LABERINTO */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center">
              {maze && (
                <MazeCanvas
                  maze={maze}
                  closedSet={closedSet}
                  openSet={openSet}
                  currentPos={currentPos}
                  optimalPath={optimalPath}
                  isSearching={isSearching}
                  isFinished={isFinished}
                />
              )}

              {/* Barra rápida de navegación de dificultades */}
              <div className="flex items-center gap-2 mt-4 text-xs">
                <span className="text-slate-400">Dificultad actual:</span>
                {(['FACIL', 'MEDIO', 'DIFICIL'] as DifficultyKey[]).map((dk) => (
                  <button
                    key={dk}
                    onClick={() => handleStartGame(dk)}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                      difficulty === dk
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {DIFFICULTIES_CONFIG[dk].name} ({DIFFICULTIES_CONFIG[dk].size}x{DIFFICULTIES_CONFIG[dk].size})
                  </button>
                ))}
              </div>
            </div>

            {/* ZONA DERECHA: PANEL DE CONTROL Y ESTADÍSTICAS */}
            <div className="lg:col-span-5 xl:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              {/* Encabezado del Panel */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Nivel: {DIFFICULTIES_CONFIG[difficulty].name.toUpperCase()}
                  </h2>
                  <span className="text-xs text-slate-400">
                    {maze ? `${maze.rows}x${maze.cols} celdas (${maze.rows * maze.cols} totales)` : ''}
                  </span>
                </div>
                <button
                  onClick={() => setGameState('MENU')}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Menú
                </button>
              </div>

              {/* Estado de la búsqueda */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span>ESTADO DE BÚSQUEDA A*</span>
                  {isSearching ? (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Zap className="w-3.5 h-3.5 animate-pulse" />
                      Explorando
                    </span>
                  ) : isFinished ? (
                    optimalPath.length > 0 ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ¡Salida Encontrada!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Sin salida
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400">En espera</span>
                  )}
                </div>

                {/* Métricas clave */}
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Nodos Explorados</span>
                    <span className="text-base font-bold text-white tabular-nums">{closedSet.size}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Pasos Ruta Óptima</span>
                    <span className="text-base font-bold text-amber-400 tabular-nums">
                      {optimalPath.length > 0 ? optimalPath.length : '--'}
                    </span>
                  </div>
                </div>

                {/* Accesos evaluados */}
                <div className="text-xs space-y-1 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Entrada elegida:</span>
                    <span className="font-semibold text-blue-400">
                      {chosenEntranceIndex ? `Entrada ${chosenEntranceIndex}` : '--'}
                      {activeEntrance ? ` (${activeEntrance[0]}, ${activeEntrance[1]})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Salida alcanzada:</span>
                    <span className="font-semibold text-rose-400">
                      {reachedExit && maze
                        ? `${reachedExit[0] === maze.exits[0][0] && reachedExit[1] === maze.exits[0][1] ? 'Salida 1' : 'Salida 2'} (${reachedExit[0]}, ${reachedExit[1]})`
                        : isFinished
                        ? 'Ninguna'
                        : '--'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparación determinística de las 2 entradas */}
              {comparisons.length === 2 && (
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg space-y-2 text-xs">
                  <div className="font-semibold text-slate-300">
                    Evaluación Comparativa de Entradas (A*):
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {comparisons.map((c) => (
                      <div
                        key={c.entranceIndex}
                        className={`p-2 rounded flex items-center justify-between ${
                          c.entranceIndex === chosenEntranceIndex
                            ? 'bg-blue-950/40 border border-blue-500/40 text-blue-200'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        <span>
                          Entrada {c.entranceIndex} ({c.entrancePos[0]},{c.entrancePos[1]}):
                        </span>
                        <span>
                          {c.pathLength < Infinity ? `${c.pathLength} pasos` : 'Inaccesible'}
                          {c.entranceIndex === chosenEntranceIndex && (
                            <span className="ml-1.5 text-emerald-400 font-sans font-bold">★ Óptima</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Control de Velocidad de la Animación */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-300">Velocidad de Animación:</div>
                <div className="grid grid-cols-6 gap-1">
                  {[
                    { label: '0.25x', speed: 0.25 },
                    { label: '0.5x', speed: 0.5 },
                    { label: '1x', speed: 1 },
                    { label: '2x', speed: 2 },
                    { label: '5x', speed: 5 },
                    { label: 'MAX', speed: 30 },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setSpeedMultiplier(s.speed)}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        Math.abs(speedMultiplier - s.speed) < 0.01
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botones de Control */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleStartAgent}
                  disabled={isSearching || isFinished}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                    isSearching || isFinished
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  INICIAR AGENTE (A*)
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleResetSearch}
                    className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    REINICIAR
                  </button>

                  <button
                    onClick={handleGenerateNewMaze}
                    className="py-2 px-3 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    NUEVO MAPA
                  </button>
                </div>
              </div>

              {/* Leyenda Visual de Colores */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                  Leyenda de Colores
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#0f1117] border border-slate-700"></span>
                    <span>Paredes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-white border border-slate-300"></span>
                    <span>Caminos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#2563eb]"></span>
                    <span>Entradas (E1, E2)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#dc2626]"></span>
                    <span>Salidas (S1, S2)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#22c55e]"></span>
                    <span>Agente (Verde)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#bfdbfe]"></span>
                    <span>Explorado (A*)</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="w-3 h-3 rounded-sm bg-[#eab308]"></span>
                    <span>Camino óptimo (Amarillo/Oro)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-auto py-3 px-6 border-t border-slate-900 bg-slate-950 text-slate-500 text-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          Laberinto 2D determinístico con Pygame y Algoritmo A* (Distancia Manhattan).
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('code')}
            className="text-blue-400 hover:underline"
          >
            Instrucciones VS Code & Pygame
          </button>
        </div>
      </footer>
    </div>
  );
}
