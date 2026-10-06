import React, { useState } from 'react';
import { MAIN_PY_CODE } from '../data/mainPyCode';
import { Copy, Check, Download, Terminal, BookOpen, ExternalLink } from 'lucide-react';

export const CodeViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'instructions'>('instructions');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MAIN_PY_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = MAIN_PY_CODE;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

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

  const handleDownloadRequirements = () => {
    const blob = new Blob(['pygame>=2.5.0\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'requirements.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Barra superior del visor */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('instructions')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'instructions'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Guía de Instalación y Ejecución
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'code'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Código Fuente Completo (main.py)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            title="Copiar código al portapapeles"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-300" />
                <span>Copiar main.py</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadMainPy}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Descargar main.py</span>
          </button>

          <button
            onClick={handleDownloadRequirements}
            className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors hidden sm:flex items-center gap-1.5"
            title="Descargar requirements.txt"
          >
            <Download className="w-3.5 h-3.5" />
            <span>requirements.txt</span>
          </button>
        </div>
      </div>

      {/* Contenido según la pestaña activa */}
      {activeTab === 'instructions' ? (
        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Tarjeta 1: Requisitos y Versión de Python */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold">1</span>
              Versión de Python recomendada
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Cualquier versión moderna de <strong>Python 3.8, 3.9, 3.10, 3.11 o 3.12+</strong> (64-bit).
              El código utiliza únicamente la biblioteca estándar de Python (<code className="text-blue-300 bg-slate-800 px-1.5 py-0.5 rounded">heapq</code>, <code className="text-blue-300 bg-slate-800 px-1.5 py-0.5 rounded">random</code>, <code className="text-blue-300 bg-slate-800 px-1.5 py-0.5 rounded">sys</code>) junto con <strong>Pygame</strong>.
            </p>
          </div>

          {/* Tarjeta 2: Instalación de Pygame */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold">2</span>
              Cómo instalar Pygame
            </h3>
            <p className="text-sm text-slate-300">
              Abre tu terminal (PowerShell, CMD, Terminal de macOS o Linux) y ejecuta:
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-sm text-emerald-400 flex items-center justify-between">
              <code>pip install pygame</code>
            </div>
            <p className="text-xs text-slate-400">
              O si usas Linux/macOS con múltiples versiones: <code className="text-slate-300">pip3 install pygame</code> o <code className="text-slate-300">pip install -r requirements.txt</code>
            </p>
          </div>

          {/* Tarjeta 3: Qué comando ejecutar */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold">3</span>
              Comando para ejecutar el proyecto
            </h3>
            <p className="text-sm text-slate-300">
              En la carpeta donde guardaste el archivo <code className="text-blue-300">main.py</code>:
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-sm text-emerald-400">
              <code>python main.py</code>
            </div>
            <p className="text-xs text-slate-400">
              (En macOS o Linux también puedes usar: <code className="text-slate-300">python3 main.py</code>).
            </p>
          </div>

          {/* Tarjeta 4: Archivos necesarios */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold">4</span>
              Archivos necesarios
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              El proyecto fue diseñado de manera <strong>100% autocontenida</strong> en un único archivo:
            </p>
            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
              <li>
                <strong className="text-white">main.py</strong>: Contiene la lógica completa (clases <code className="text-blue-300">Maze</code>, <code className="text-blue-300">Agent</code>, <code className="text-blue-300">Button</code> y <code className="text-blue-300">Game</code>), interfaz gráfica con menú, animación no bloqueante y algoritmo A*.
              </li>
              <li>
                <strong className="text-white">requirements.txt</strong> (opcional): Útil para entornos virtuales o despliegues rápidos (<code className="text-blue-300">pygame&gt;=2.5.0</code>).
              </li>
            </ul>
          </div>

          {/* Tarjeta 5: Guía paso a paso para Visual Studio Code */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold">5</span>
              Cómo abrirlo y ejecutarlo desde Visual Studio Code
            </h3>
            <ol className="text-sm text-slate-300 space-y-3 list-decimal list-inside leading-relaxed">
              <li>
                <strong>Crea una carpeta</strong> en tu computadora (ej: <code className="text-slate-200">laberinto-pygame</code>) y guarda dentro el archivo <strong>main.py</strong> (usa el botón superior verde "Descargar main.py").
              </li>
              <li>
                <strong>Abre Visual Studio Code</strong> y ve a <strong className="text-white">Archivo &gt; Abrir carpeta...</strong> (o <code className="text-slate-200">File &gt; Open Folder...</code>) y selecciona tu carpeta.
              </li>
              <li>
                Asegúrate de tener instalada la extensión oficial de <strong>Python</strong> en VS Code (de Microsoft).
              </li>
              <li>
                Abre el archivo <strong className="text-white">main.py</strong> en el editor.
              </li>
              <li>
                Abre la terminal integrada de VS Code presionando <code className="text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded">Ctrl + `</code> (o en el menú superior: <strong className="text-white">Terminal &gt; New Terminal</strong>).
              </li>
              <li>
                En la terminal escribe <code className="text-emerald-400 bg-slate-950 px-2 py-1 rounded">pip install pygame</code> y presiona Enter.
              </li>
              <li>
                Haz clic en el botón triangular <strong className="text-emerald-400">▷ Run Python File</strong> en la esquina superior derecha del editor, o escribe en la terminal integrada: <code className="text-emerald-400 bg-slate-950 px-2 py-1 rounded">python main.py</code>.
              </li>
              <li>
                ¡Se abrirá la ventana gráfica de Pygame a 60 FPS con el menú interactivo para seleccionar dificultad!
              </li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400 font-mono">
            <span>main.py (Python 3 / Pygame)</span>
            <span>{MAIN_PY_CODE.split('\n').length} líneas</span>
          </div>
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
            <pre className="whitespace-pre">
              <code>{MAIN_PY_CODE}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
