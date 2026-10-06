"""
================================================================================
LABERINTO 2D CON AGENTE INTELIGENTE DETERMINÍSTICO A* (Pygame)
================================================================================
Descripción:
  Este proyecto genera laberintos 2D aleatorios mediante el algoritmo de
  Recursive Backtracking (DFS iterativo), asegurando que el laberinto sea
  100% conectado y solucionable. Cuenta con exactamente 2 entradas (azul) y
  2 salidas (rojo) en el perímetro exterior.
  
  Un agente inteligente implementa el algoritmo A* con heurística de distancia
  Manhattan y desempate determinístico para encontrar la salida accesible con
  el camino de menor longitud. La exploración y el camino final se visualizan
  con una animación fluida paso a paso.

Estructura de Clases:
  - Maze: Generación del laberinto, colocación de entradas/salidas y validación.
  - Agent: Implementación determinística de A*, heurística Manhattan y animación.
  - Button: Componente reutilizable para la interfaz gráfica (menús y controles).
  - Game: Bucle principal, máquina de estados, renderizado y gestión de eventos.
================================================================================
"""

import sys
import heapq
import random
import pygame

# ------------------------------------------------------------------------------
# CONSTANTES DE CONFIGURACIÓN Y PALETA DE COLORES
# ------------------------------------------------------------------------------
WINDOW_WIDTH = 1150
WINDOW_HEIGHT = 760
FPS = 60

# Paleta de colores solicitada en los requisitos
COLOR_WALL = (15, 17, 23)           # Paredes: negro / pizarra muy oscura
COLOR_PATH = (255, 255, 255)        # Caminos: blanco
COLOR_ENTRANCE = (37, 99, 235)      # Entradas (1 y 2): azul
COLOR_EXIT = (220, 38, 38)          # Salidas (1 y 2): rojo
COLOR_AGENT = (34, 197, 94)         # Agente: verde brillante
COLOR_EXPLORED = (191, 219, 254)    # Posiciones exploradas por A*: azul suave
COLOR_FRONTIER = (254, 215, 170)    # Nodos en frontera (Open Set): ámbar suave
COLOR_FINAL_PATH = (234, 179, 8)    # Camino final encontrado: amarillo dorado

# Colores de la interfaz y paneles
COLOR_BG_DARK = (18, 24, 38)        # Fondo general de la ventana
COLOR_PANEL_BG = (28, 36, 56)       # Fondo del panel lateral
COLOR_PANEL_BORDER = (45, 58, 88)   # Borde de paneles
COLOR_TEXT_WHITE = (248, 250, 252)  # Texto principal
COLOR_TEXT_MUTED = (148, 163, 184)  # Texto secundario
COLOR_TEXT_ACCENT = (56, 189, 248)  # Texto resaltado (cian)

# Configuración de Dificultades
DIFFICULTIES = {
    "FACIL": {
        "name": "Fácil",
        "size": 21,
        "desc": "Laberinto 21x21 celdas (~100 pasajes)",
        "default_steps_per_frame": 1
    },
    "MEDIO": {
        "name": "Medio",
        "size": 31,
        "desc": "Laberinto 31x31 celdas (~225 pasajes)",
        "default_steps_per_frame": 2
    },
    "DIFICIL": {
        "name": "Difícil",
        "size": 45,
        "desc": "Laberinto 45x45 celdas (~500 pasajes)",
        "default_steps_per_frame": 5
    }
}


# ==============================================================================
# CLASE: Button (Botones de Interfaz Gráfica)
# ==============================================================================
class Button:
    """
    Componente visual interactivo para botones en Pygame.
    Gestiona detección de cursor (hover), clics y renderizado estilizado.
    """
    def __init__(self, x, y, width, height, text, font,
                 bg_color=(37, 99, 235),
                 hover_color=(59, 130, 246),
                 text_color=(255, 255, 255),
                 border_radius=8,
                 border_color=None):
        self.rect = pygame.Rect(x, y, width, height)
        self.text = text
        self.font = font
        self.bg_color = bg_color
        self.hover_color = hover_color
        self.text_color = text_color
        self.border_radius = border_radius
        self.border_color = border_color
        self.is_hovered = False

    def check_hover(self, mouse_pos):
        self.is_hovered = self.rect.collidepoint(mouse_pos)
        return self.is_hovered

    def is_clicked(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.rect.collidepoint(event.pos):
                return True
        return False

    def draw(self, surface):
        # Color dinámico según hover
        current_bg = self.hover_color if self.is_hovered else self.bg_color
        pygame.draw.rect(surface, current_bg, self.rect, border_radius=self.border_radius)
        
        # Borde opcional
        if self.border_color:
            pygame.draw.rect(surface, self.border_color, self.rect, width=2, border_radius=self.border_radius)

        # Texto centrado
        text_surf = self.font.render(self.text, True, self.text_color)
        text_rect = text_surf.get_rect(center=self.rect.center)
        surface.blit(text_surf, text_rect)


# ==============================================================================
# CLASE: Maze (Generación y Representación del Laberinto)
# ==============================================================================
class Maze:
    """
    Representa el mapa del laberinto en una matriz 2D.
    Valores en la matriz:
      0 = Pared (negro)
      1 = Camino transitable (blanco)
      
    Garantías:
      - Generado con Recursive Backtracking / DFS aleatorio (pila iterativa).
      - Todo el laberinto interior es un árbol de caminos 100% conectado.
      - Exactamente 2 entradas y 2 salidas ubicadas en el perímetro exterior.
      - Conexión garantizada entre todas las entradas y salidas.
    """
    def __init__(self, size=21):
        # Asegurar dimensiones impares para el algoritmo de división de paredes
        if size % 2 == 0:
            size += 1
        self.size = size
        self.rows = size
        self.cols = size
        
        # Matriz: 0 = pared, 1 = camino
        self.grid = [[0 for _ in range(self.cols)] for _ in range(self.rows)]
        
        # Entradas y salidas: coordenadas (fila, columna)
        self.entrances = []
        self.exits = []
        
        # Generar el laberinto y colocar accesos
        self.generate()

    def generate(self):
        """
        Generación del laberinto mediante Recursive Backtracking (DFS con pila).
        Utilizamos una pila explícita en lugar de recursión para evitar límites
        de profundidad de llamada en laberintos grandes (nivel Difícil).
        """
        # 1. Reiniciar la matriz a paredes completas
        for r in range(self.rows):
            for c in range(self.cols):
                self.grid[r][c] = 0

        # 2. Las celdas de paso base están en coordenadas impares (1, 3, 5, ...)
        start_r, start_c = 1, 1
        self.grid[start_r][start_c] = 1
        stack = [(start_r, start_c)]

        while stack:
            current_r, current_c = stack[-1]
            
            # Buscar vecinos no visitados a distancia 2 en las 4 direcciones ortogonales
            neighbors = []
            directions = [(-2, 0), (2, 0), (0, -2), (0, 2)]
            for dr, dc in directions:
                nr, nc = current_r + dr, current_c + dc
                if 1 <= nr < self.rows - 1 and 1 <= nc < self.cols - 1:
                    if self.grid[nr][nc] == 0:
                        neighbors.append((nr, nc, dr, dc))

            if neighbors:
                # Elegir un vecino aleatorio
                nr, nc, dr, dc = random.choice(neighbors)
                # Derribar la pared intermedia (a distancia 1)
                self.grid[current_r + dr // 2][current_c + dc // 2] = 1
                # Marcar la celda de destino como camino
                self.grid[nr][nc] = 1
                # Añadir a la pila para continuar la exploración en profundidad
                stack.append((nr, nc))
            else:
                # Si no hay vecinos sin visitar, retroceder (backtrack)
                stack.pop()

        # 3. Colocación aleatoria de exactamente 2 entradas y 2 salidas en el perímetro
        self._place_entrances_and_exits()

    def _place_entrances_and_exits(self):
        """
        Genera exactamente 2 entradas y 2 salidas en los bordes externos.
        Cada acceso exterior (fila 0, fila N-1, col 0, col N-1) se conecta
        directamente a una celda interior impar transitable (distancia 1).
        
        Esto garantiza de forma matemática que todas las entradas y salidas
        se comunican con el interior del laberinto sin bloqueos.
        """
        candidate_slots = []
        
        # Borde superior (fila 0): se conecta con (1, c)
        for c in range(1, self.cols - 1, 2):
            if self.grid[1][c] == 1:
                candidate_slots.append((0, c))

        # Borde inferior (fila rows-1): se conecta con (rows-2, c)
        for c in range(1, self.cols - 1, 2):
            if self.grid[self.rows - 2][c] == 1:
                candidate_slots.append((self.rows - 1, c))

        # Borde izquierdo (columna 0): se conecta con (r, 1)
        for r in range(1, self.rows - 1, 2):
            if self.grid[r][1] == 1:
                candidate_slots.append((r, 0))

        # Borde derecho (columna cols-1): se conecta con (r, cols-2)
        for r in range(1, self.rows - 1, 2):
            if self.grid[r][self.cols - 2] == 1:
                candidate_slots.append((r, self.cols - 1))

        # Seleccionar 4 posiciones distintas del perímetro
        # Hay decenas de candidatos, seleccionamos 4 sin repetición
        selected_slots = random.sample(candidate_slots, 4)
        
        # Asignar 2 entradas y 2 salidas
        self.entrances = [selected_slots[0], selected_slots[1]]
        self.exits = [selected_slots[2], selected_slots[3]]

        # Abrir el paso en la matriz marcando las posiciones como caminos (1)
        for r, c in self.entrances:
            self.grid[r][c] = 1
        for r, c in self.exits:
            self.grid[r][c] = 1

    def is_valid_cell(self, r, c):
        """Verifica si la celda está dentro de los límites y es camino transitable."""
        return 0 <= r < self.rows and 0 <= c < self.cols and self.grid[r][c] == 1

    def get_neighbors(self, r, c):
        """
        Retorna vecinos transitables en orden ortogonal fijo (Arriba, Abajo, Izquierda, Derecha).
        El orden fijo garantiza determinismo al explorar.
        """
        neighbors = []
        # Arriba, Abajo, Izquierda, Derecha
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if self.is_valid_cell(nr, nc):
                neighbors.append((nr, nc))
        return neighbors


# ==============================================================================
# CLASE: Agent (Agente Inteligente con Algoritmo A*)
# ==============================================================================
class Agent:
    """
    Agente inteligente determinístico basado en A* (A-star).
    
    Características clave:
      - Movimientos ortogonales estrictos (Arriba, Abajo, Izquierda, Derecha).
      - No atraviesa paredes.
      - Utiliza Distancia Manhattan como función heurística admisible y consistente.
      - Desempate determinístico en la cola de prioridad.
      - Evalúa ambas entradas para encontrar la ruta óptima global hacia una salida.
      - Generador paso a paso para animación visual no bloqueante.
    """
    def __init__(self, maze):
        self.maze = maze
        self.reset()

    def reset(self):
        """Reinicia el estado del agente y las estructuras de búsqueda."""
        self.is_searching = False
        self.is_finished = False
        self.found_exit = False
        
        self.current_pos = None
        self.active_entrance = None
        self.reached_exit = None
        
        self.closed_set = set()          # Posiciones exploradas (visitadas)
        self.open_set_items = set()      # Posiciones actualmente en frontera
        self.optimal_path = []           # Camino final reconstruido
        
        self.steps_count = 0             # Longitud del camino final (aristas/pasos)
        self.explored_count = 0          # Total de nodos explorados por A*
        self.step_accumulator = 0.0      # Acumulador para soportar velocidades lentas (< 1.0x)
        
        # Almacena el generador de la animación paso a paso
        self._generator = None
        
        # Registro comparativo de ambas entradas
        self.comparison_info = {}

    @staticmethod
    def manhattan_distance(pos_a, pos_b):
        """
        Heurística de Distancia Manhattan:
          h((r1, c1), (r2, c2)) = |r1 - r2| + |c1 - c2|
        Es admisible (nunca sobrestima el costo real en una cuadrícula con
        movimiento ortogonal) y consistente, garantizando optimalidad en A*.
        """
        return abs(pos_a[0] - pos_b[0]) + abs(pos_a[1] - pos_b[1])

    def heuristic_to_targets(self, pos, target_list):
        """
        Calcula la distancia Manhattan mínima hacia cualquiera de las salidas objetivo.
        h(pos) = min_{s en salidas} Manhattan(pos, s)
        """
        return min(self.manhattan_distance(pos, target) for target in target_list)

    def evaluate_best_entrance(self):
        """
        Evalúa determinísticamente cuál de las 2 entradas produce el camino
        con menor longitud hacia cualquiera de las 2 salidas accesibles.
        
        Retorna:
          best_entrance: Coordenada de la entrada elegida.
          details: Diccionario con la longitud y estadísticas de cada entrada.
        """
        evaluations = []

        for idx, entrance in enumerate(self.maze.entrances):
            path, visited_count = self._run_static_astar(entrance, self.maze.exits)
            path_len = len(path) if path else float('inf')
            target_exit = path[-1] if path else None
            evaluations.append({
                "entrance_index": idx + 1,
                "entrance_pos": entrance,
                "path_length": path_len,
                "visited_count": visited_count,
                "path": path,
                "target_exit": target_exit
            })

        # Desempate determinístico: menor longitud de camino, luego menor índice de entrada
        evaluations.sort(key=lambda item: (item["path_length"], item["entrance_index"]))
        best = evaluations[0]
        
        self.comparison_info = {
            "evaluations": evaluations,
            "chosen_index": best["entrance_index"],
            "chosen_entrance": best["entrance_pos"]
        }
        return best["entrance_pos"]

    def _run_static_astar(self, start_pos, target_list):
        """
        Ejecución interna estática de A* para evaluación previa de las 2 entradas.
        Retorna (camino_optimo, total_nodos_explorados).
        """
        counter = 0  # Criterio de desempate determinístico (FIFO / orden de inserción)
        # Elemento en heap: (f_score, h_score, tie_breaker, current_pos)
        start_h = self.heuristic_to_targets(start_pos, target_list)
        open_heap = [(start_h, start_h, counter, start_pos)]
        
        came_from = {}
        g_score = {start_pos: 0}
        closed_set = set()

        while open_heap:
            f, h, _, current = heapq.heappop(open_heap)

            if current in closed_set:
                continue
            closed_set.add(current)

            # Si alcanzamos cualquiera de las salidas
            if current in target_list:
                # Reconstruir camino
                path = []
                curr = current
                while curr in came_from:
                    path.append(curr)
                    curr = came_from[curr]
                path.append(start_pos)
                path.reverse()
                return path, len(closed_set)

            # Expandir vecinos ortogonales
            for neighbor in self.maze.get_neighbors(*current):
                tentative_g = g_score[current] + 1
                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    h_val = self.heuristic_to_targets(neighbor, target_list)
                    f_val = tentative_g + h_val
                    counter += 1
                    heapq.heappush(open_heap, (f_val, h_val, counter, neighbor))

        return [], len(closed_set)

    def start_search(self):
        """Inicia el proceso de búsqueda animado del agente."""
        self.reset()
        
        # 1. Determinar cuál entrada produce el mejor camino
        chosen_entrance = self.evaluate_best_entrance()
        self.active_entrance = chosen_entrance
        self.current_pos = chosen_entrance
        
        # 2. Inicializar el generador paso a paso
        self._generator = self._astar_step_generator(chosen_entrance, self.maze.exits)
        self.is_searching = True
        self.is_finished = False

    def _astar_step_generator(self, start_pos, target_list):
        """
        Generador de A* que yield-ea el estado de cada paso para permitir
        la animación sin bloquear el bucle de eventos de Pygame.
        """
        counter = 0
        start_h = self.heuristic_to_targets(start_pos, target_list)
        open_heap = [(start_h, start_h, counter, start_pos)]
        self.open_set_items.add(start_pos)

        came_from = {}
        g_score = {start_pos: 0}
        self.closed_set.clear()

        while open_heap:
            f, h, _, current = heapq.heappop(open_heap)
            if current in self.open_set_items:
                self.open_set_items.remove(current)

            if current in self.closed_set:
                continue

            self.closed_set.add(current)
            self.current_pos = current
            self.explored_count = len(self.closed_set)

            # Notificar progreso para dibujar
            yield "EXPLORING"

            # ¿Hemos alcanzado una de las salidas?
            if current in target_list:
                self.reached_exit = current
                self.found_exit = True
                
                # Reconstrucción del camino óptimo final
                path = []
                curr = current
                while curr in came_from:
                    path.append(curr)
                    curr = came_from[curr]
                path.append(start_pos)
                path.reverse()
                
                self.optimal_path = path
                self.steps_count = len(path)
                self.is_searching = False
                self.is_finished = True
                yield "FOUND"
                return

            # Explorar vecinos ortogonales transitables
            for neighbor in self.maze.get_neighbors(*current):
                if neighbor in self.closed_set:
                    continue

                tentative_g = g_score[current] + 1
                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    h_val = self.heuristic_to_targets(neighbor, target_list)
                    f_val = tentative_g + h_val
                    counter += 1
                    heapq.heappush(open_heap, (f_val, h_val, counter, neighbor))
                    self.open_set_items.add(neighbor)

        # Si no hay camino (matemáticamente imposible con nuestro generador)
        self.is_searching = False
        self.is_finished = True
        yield "NO_PATH"

    def update_animation(self, speed=1.0):
        """
        Avanza la animación según el multiplicador de velocidad.
        Soporta velocidades lentas (ej. 0.25x o 0.5x) acumulando fracciones de fotograma
        para observar con calma cada celda explorada, y velocidades rápidas (1x, 2x, 5x, MAX)
        ejecutando múltiples pasos por fotograma.
        """
        if not self.is_searching or self._generator is None:
            return

        self.step_accumulator += speed
        while self.step_accumulator >= 1.0:
            self.step_accumulator -= 1.0
            try:
                status = next(self._generator)
                if status in ("FOUND", "NO_PATH"):
                    break
            except StopIteration:
                self.is_searching = False
                self.is_finished = True
                break


# ==============================================================================
# CLASE: Game (Gestor Principal de la Aplicación y Renderizado)
# ==============================================================================
class Game:
    """
    Controlador central del juego en Pygame.
    Maneja la máquina de estados:
      - STATE_MENU: Menú principal con selección de dificultad y salir.
      - STATE_PLAYING: Vista interactiva del laberinto con animación y controles.
    """
    STATE_MENU = "MENU"
    STATE_PLAYING = "PLAYING"

    def __init__(self):
        pygame.init()
        pygame.display.set_caption("Laberinto 2D - Agente Inteligente A*")
        
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        self.clock = pygame.time.Clock()
        self.state = self.STATE_MENU
        
        # Tipografías limpias y legibles
        self.font_title = pygame.font.SysTransFont(["Segoe UI", "Arial", "sans-serif"], 34, bold=True)
        self.font_subtitle = pygame.font.SysFont(["Segoe UI", "Arial", "sans-serif"], 16)
        self.font_btn = pygame.font.SysFont(["Segoe UI", "Arial", "sans-serif"], 18, bold=True)
        self.font_small_btn = pygame.font.SysFont(["Segoe UI", "Arial", "sans-serif"], 14, bold=True)
        self.font_stats = pygame.font.SysFont(["Segoe UI", "Arial", "sans-serif"], 14)
        self.font_stats_bold = pygame.font.SysFont(["Segoe UI", "Arial", "sans-serif"], 14, bold=True)
        self.font_badge = pygame.font.SysFont(["Segoe UI", "Arial", "sans-serif"], 12, bold=True)
        
        # Estado de configuración actual
        self.current_diff_key = "FACIL"
        self.maze = None
        self.agent = None
        self.current_speed = 0.5
        
        # Área de dibujo del laberinto
        self.maze_view_rect = pygame.Rect(30, 30, 700, 700)
        
        # Botones de Menú
        self._init_menu_buttons()
        # Botones de Juego
        self._init_playing_buttons()
        
        self.is_running = True

    def _init_menu_buttons(self):
        """Inicializa los botones del menú inicial."""
        cx = WINDOW_WIDTH // 2
        btn_w, btn_h = 280, 52
        gap = 20
        start_y = 280
        
        self.menu_btn_facil = Button(
            cx - btn_w // 2, start_y, btn_w, btn_h,
            "1. FÁCIL (21x21)", self.font_btn,
            bg_color=(16, 185, 129), hover_color=(5, 150, 105)
        )
        self.menu_btn_medio = Button(
            cx - btn_w // 2, start_y + (btn_h + gap), btn_w, btn_h,
            "2. MEDIO (31x31)", self.font_btn,
            bg_color=(59, 130, 246), hover_color=(37, 99, 235)
        )
        self.menu_btn_dificil = Button(
            cx - btn_w // 2, start_y + (btn_h + gap) * 2, btn_w, btn_h,
            "3. DIFÍCIL (45x45)", self.font_btn,
            bg_color=(168, 85, 247), hover_color=(147, 51, 234)
        )
        self.menu_btn_salir = Button(
            cx - btn_w // 2, start_y + (btn_h + gap) * 3, btn_w, btn_h,
            "SALIR", self.font_btn,
            bg_color=(239, 68, 68), hover_color=(220, 38, 38)
        )
        self.menu_buttons = [
            self.menu_btn_facil,
            self.menu_btn_medio,
            self.menu_btn_dificil,
            self.menu_btn_salir
        ]

    def _init_playing_buttons(self):
        """Inicializa los botones del panel lateral dentro del laberinto."""
        panel_x = 760
        btn_w = 350
        btn_h = 44
        start_y = 480
        gap = 12

        self.btn_iniciar = Button(
            panel_x, start_y, btn_w, btn_h,
            "INICIAR AGENTE (A*)", self.font_btn,
            bg_color=(34, 197, 94), hover_color=(22, 163, 74)
        )
        self.btn_reiniciar = Button(
            panel_x, start_y + (btn_h + gap), btn_w, btn_h,
            "REINICIAR BÚSQUEDA", self.font_btn,
            bg_color=(59, 130, 246), hover_color=(37, 99, 235)
        )
        self.btn_nuevo = Button(
            panel_x, start_y + (btn_h + gap) * 2, btn_w, btn_h,
            "GENERAR NUEVO LABERINTO", self.font_btn,
            bg_color=(234, 179, 8), hover_color=(202, 138, 4),
            text_color=(20, 20, 20)
        )
        self.btn_menu = Button(
            panel_x, start_y + (btn_h + gap) * 3, btn_w, btn_h,
            "VOLVER AL MENÚ", self.font_btn,
            bg_color=(100, 116, 139), hover_color=(71, 85, 105)
        )

        # Controles de velocidad (incluye 0.25x, 0.5x, 1x, 2x, 5x, MAX)
        speed_w = 54
        speed_h = 32
        speed_gap = 5
        speed_y = 425
        self.speed_btns = [
            ("0.25x", 0.25, Button(panel_x + (speed_w + speed_gap) * 0, speed_y, speed_w, speed_h, "0.25x", self.font_small_btn, bg_color=(45, 58, 88), hover_color=(59, 130, 246))),
            ("0.5x", 0.5, Button(panel_x + (speed_w + speed_gap) * 1, speed_y, speed_w, speed_h, "0.5x", self.font_small_btn, bg_color=(45, 58, 88), hover_color=(59, 130, 246))),
            ("1x", 1.0, Button(panel_x + (speed_w + speed_gap) * 2, speed_y, speed_w, speed_h, "1x", self.font_small_btn, bg_color=(45, 58, 88), hover_color=(59, 130, 246))),
            ("2x", 2.0, Button(panel_x + (speed_w + speed_gap) * 3, speed_y, speed_w, speed_h, "2x", self.font_small_btn, bg_color=(45, 58, 88), hover_color=(59, 130, 246))),
            ("5x", 5.0, Button(panel_x + (speed_w + speed_gap) * 4, speed_y, speed_w, speed_h, "5x", self.font_small_btn, bg_color=(45, 58, 88), hover_color=(59, 130, 246))),
            ("MAX", 50.0, Button(panel_x + (speed_w + speed_gap) * 5, speed_y, speed_w, speed_h, "MAX", self.font_small_btn, bg_color=(45, 58, 88), hover_color=(59, 130, 246)))
        ]

    def setup_game(self, difficulty_key):
        """Genera un nuevo laberinto e inicializa el agente para la dificultad dada."""
        self.current_diff_key = difficulty_key
        config = DIFFICULTIES[difficulty_key]
        self.current_speed = 0.5  # Velocidad por defecto 0.5x para observar claramente el proceso
        
        # Generar laberinto
        self.maze = Maze(size=config["size"])
        # Crear agente
        self.agent = Agent(self.maze)
        self.state = self.STATE_PLAYING

    def run(self):
        """Bucle principal de la aplicación."""
        while self.is_running:
            self.clock.tick(FPS)
            self._handle_events()
            self._update()
            self._render()

        pygame.quit()
        sys.exit()

    def _handle_events(self):
        """Gestión de eventos de teclado y ratón."""
        mouse_pos = pygame.mouse.get_pos()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.is_running = False
                return

            if self.state == self.STATE_MENU:
                for btn in self.menu_buttons:
                    btn.check_hover(mouse_pos)

                if self.menu_btn_facil.is_clicked(event):
                    self.setup_game("FACIL")
                elif self.menu_btn_medio.is_clicked(event):
                    self.setup_game("MEDIO")
                elif self.menu_btn_dificil.is_clicked(event):
                    self.setup_game("DIFICIL")
                elif self.menu_btn_salir.is_clicked(event):
                    self.is_running = False

            elif self.state == self.STATE_PLAYING:
                self.btn_iniciar.check_hover(mouse_pos)
                self.btn_reiniciar.check_hover(mouse_pos)
                self.btn_nuevo.check_hover(mouse_pos)
                self.btn_menu.check_hover(mouse_pos)

                for label, speed, btn in self.speed_btns:
                    btn.check_hover(mouse_pos)
                    if btn.is_clicked(event):
                        self.current_speed = speed

                if self.btn_iniciar.is_clicked(event):
                    if not self.agent.is_searching and not self.agent.is_finished:
                        self.agent.start_search()
                elif self.btn_reiniciar.is_clicked(event):
                    self.agent.reset()
                elif self.btn_nuevo.is_clicked(event):
                    self.setup_game(self.current_diff_key)
                elif self.btn_menu.is_clicked(event):
                    self.state = self.STATE_MENU

                # Atajos de teclado útiles
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_SPACE:
                        if not self.agent.is_searching and not self.agent.is_finished:
                            self.agent.start_search()
                    elif event.key == pygame.K_r:
                        self.agent.reset()
                    elif event.key == pygame.K_n:
                        self.setup_game(self.current_diff_key)
                    elif event.key == pygame.K_ESCAPE:
                        self.state = self.STATE_MENU

    def _update(self):
        """Actualiza la lógica del juego y el progreso de la animación del agente."""
        if self.state == self.STATE_PLAYING and self.agent:
            self.agent.update_animation(self.current_speed)

    def _render(self):
        """Dibuja en pantalla según el estado actual."""
        self.screen.fill(COLOR_BG_DARK)

        if self.state == self.STATE_MENU:
            self._render_menu()
        elif self.state == self.STATE_PLAYING:
            self._render_playing()

        pygame.display.flip()

    # --------------------------------------------------------------------------
    # PANTALLA: MENÚ PRINCIPAL
    # --------------------------------------------------------------------------
    def _render_menu(self):
        cx = WINDOW_WIDTH // 2

        # Título principal
        title_surf = self.font_title.render("LABERINTO 2D - AGENTE INTELIGENTE A*", True, COLOR_TEXT_WHITE)
        title_rect = title_surf.get_rect(center=(cx, 120))
        self.screen.blit(title_surf, title_rect)

        # Subtítulo explicativo
        sub_text = "Generación aleatoria DFS | 2 Entradas y 2 Salidas | Algoritmo A* con Heurística Manhattan"
        sub_surf = self.font_subtitle.render(sub_text, True, COLOR_TEXT_ACCENT)
        sub_rect = sub_surf.get_rect(center=(cx, 165))
        self.screen.blit(sub_surf, sub_rect)

        # Tarjeta decorativa del menú
        card_w, card_h = 440, 430
        card_rect = pygame.Rect(cx - card_w // 2, 230, card_w, card_h)
        pygame.draw.rect(self.screen, COLOR_PANEL_BG, card_rect, border_radius=16)
        pygame.draw.rect(self.screen, COLOR_PANEL_BORDER, card_rect, width=2, border_radius=16)

        # Encabezado de niveles
        label_surf = self.font_btn.render("SELECCIONA LA DIFICULTAD", True, COLOR_TEXT_WHITE)
        self.screen.blit(label_surf, label_surf.get_rect(center=(cx, 255)))

        # Dibujar botones del menú
        for btn in self.menu_buttons:
            btn.draw(self.screen)

        # Pie de página informativo
        info_text = "Controles: Clic en botones o atajos [Espacio: Iniciar | R: Reiniciar | N: Nuevo]"
        info_surf = self.font_stats.render(info_text, True, COLOR_TEXT_MUTED)
        self.screen.blit(info_surf, info_surf.get_rect(center=(cx, 710)))

    # --------------------------------------------------------------------------
    # PANTALLA: JUEGO / LABERINTO
    # --------------------------------------------------------------------------
    def _render_playing(self):
        # 1. Dibujar el laberinto en el área izquierda
        self._render_maze_canvas()

        # 2. Dibujar panel lateral con estadísticas y controles
        self._render_sidebar()

    def _render_maze_canvas(self):
        """Renderiza la cuadrícula del laberinto con sus colores exactos."""
        pygame.draw.rect(self.screen, (10, 13, 20), self.maze_view_rect, border_radius=8)
        pygame.draw.rect(self.screen, COLOR_PANEL_BORDER, self.maze_view_rect, width=3, border_radius=8)

        if not self.maze:
            return

        cols = self.maze.cols
        rows = self.maze.rows
        
        # Calcular tamaño de celda para ajustarse perfectamente al área visible
        cell_size = min(self.maze_view_rect.width // cols, self.maze_view_rect.height // rows)
        
        # Centrar el laberinto dentro del rectángulo contenedor
        offset_x = self.maze_view_rect.x + (self.maze_view_rect.width - (cell_size * cols)) // 2
        offset_y = self.maze_view_rect.y + (self.maze_view_rect.height - (cell_size * rows)) // 2

        # Conjuntos para búsqueda rápida O(1)
        explored_set = self.agent.closed_set if self.agent else set()
        frontier_set = self.agent.open_set_items if self.agent else set()
        optimal_path_set = set(self.agent.optimal_path) if self.agent and self.agent.optimal_path else set()
        entrances_set = set(self.maze.entrances)
        exits_set = set(self.maze.exits)

        for r in range(rows):
            for c in range(cols):
                rect = pygame.Rect(offset_x + c * cell_size, offset_y + r * cell_size, cell_size, cell_size)
                pos = (r, c)

                # Jerarquía estricta de color según especificación del proyecto
                if pos in entrances_set:
                    # Entradas 1 y 2: Azul
                    pygame.draw.rect(self.screen, COLOR_ENTRANCE, rect)
                elif pos in exits_set:
                    # Salidas 1 y 2: Rojo
                    pygame.draw.rect(self.screen, COLOR_EXIT, rect)
                elif pos in optimal_path_set:
                    # Camino final óptimo: Amarillo dorado
                    pygame.draw.rect(self.screen, COLOR_FINAL_PATH, rect)
                elif self.agent and self.agent.current_pos == pos and not self.agent.is_finished:
                    # Posición actual del agente en exploración: Verde
                    pygame.draw.rect(self.screen, COLOR_AGENT, rect)
                elif pos in frontier_set:
                    # Nodos en frontera (Open Set): Ámbar suave
                    pygame.draw.rect(self.screen, COLOR_FRONTIER, rect)
                elif pos in explored_set:
                    # Nodos explorados por A* (Closed Set): Azul suave
                    pygame.draw.rect(self.screen, COLOR_EXPLORED, rect)
                elif self.maze.grid[r][c] == 1:
                    # Camino transitable: Blanco
                    pygame.draw.rect(self.screen, COLOR_PATH, rect)
                else:
                    # Paredes: Negro
                    pygame.draw.rect(self.screen, COLOR_WALL, rect)

        # Dibujar marcador del agente animado si está en camino final o en posición actual
        if self.agent and self.agent.current_pos:
            cur_r, cur_c = self.agent.current_pos
            center_x = offset_x + cur_c * cell_size + cell_size // 2
            center_y = offset_y + cur_r * cell_size + cell_size // 2
            radius = max(2, cell_size // 3)
            pygame.draw.circle(self.screen, COLOR_AGENT, (center_x, center_y), radius)
            pygame.draw.circle(self.screen, (255, 255, 255), (center_x, center_y), radius, width=1)

    def _render_sidebar(self):
        """Renderiza el panel lateral con controles, métricas en vivo y leyenda."""
        panel_x = 750
        panel_y = 30
        panel_w = 370
        panel_h = 700

        # Fondo del panel lateral
        panel_rect = pygame.Rect(panel_x, panel_y, panel_w, panel_h)
        pygame.draw.rect(self.screen, COLOR_PANEL_BG, panel_rect, border_radius=12)
        pygame.draw.rect(self.screen, COLOR_PANEL_BORDER, panel_rect, width=2, border_radius=12)

        px = panel_x + 18
        py = panel_y + 16

        # 1. TÍTULO Y DIFICULTAD
        diff_info = DIFFICULTIES[self.current_diff_key]
        title_txt = f"LABERINTO: {diff_info['name'].upper()}"
        self.screen.blit(self.font_btn.render(title_txt, True, COLOR_TEXT_WHITE), (px, py))
        py += 24
        
        dim_txt = f"Dimensiones: {self.maze.rows}x{self.maze.cols} celdas | Celdas totales: {self.maze.rows * self.maze.cols}"
        self.screen.blit(self.font_stats.render(dim_txt, True, COLOR_TEXT_MUTED), (px, py))
        py += 24

        pygame.draw.line(self.screen, COLOR_PANEL_BORDER, (px, py), (panel_x + panel_w - 18, py), 1)
        py += 12

        # 2. ESTADO DEL AGENTE Y ESTADÍSTICAS EN TIEMPO REAL
        self.screen.blit(self.font_stats_bold.render("ESTADO DE LA BÚSQUEDA A*", True, COLOR_TEXT_ACCENT), (px, py))
        py += 24

        status_str = "En espera (presiona INICIAR)"
        status_color = COLOR_TEXT_MUTED
        if self.agent.is_searching:
            status_str = "Explorando activamente..."
            status_color = (250, 204, 21)
        elif self.agent.is_finished:
            if self.agent.found_exit:
                status_str = "¡SALIDA ENCONTRADA CON ÉXITO!"
                status_color = (74, 222, 128)
            else:
                status_str = "Sin salida accesible"
                status_color = (248, 113, 113)

        self.screen.blit(self.font_stats.render(f"Estado: {status_str}", True, status_color), (px, py))
        py += 22

        # Métricas del agente
        explored_txt = f"Nodos explorados: {self.agent.explored_count}"
        self.screen.blit(self.font_stats.render(explored_txt, True, COLOR_TEXT_WHITE), (px, py))
        py += 20

        steps_txt = f"Pasos del camino óptimo: {self.agent.steps_count if self.agent.is_finished else '--'}"
        self.screen.blit(self.font_stats.render(steps_txt, True, COLOR_TEXT_WHITE), (px, py))
        py += 20

        # Entrada utilizada y Salida encontrada
        ent_txt = "Entrada utilizada: Ninguna"
        if self.agent.active_entrance:
            ent_idx = 1 if self.agent.active_entrance == self.maze.entrances[0] else 2
            ent_txt = f"Entrada utilizada: Entrada {ent_idx} {self.agent.active_entrance}"
        self.screen.blit(self.font_stats.render(ent_txt, True, COLOR_TEXT_WHITE), (px, py))
        py += 20

        exit_txt = "Salida encontrada: Ninguna"
        if self.agent.reached_exit:
            exit_idx = 1 if self.agent.reached_exit == self.maze.exits[0] else 2
            exit_txt = f"Salida encontrada: Salida {exit_idx} {self.agent.reached_exit}"
        self.screen.blit(self.font_stats.render(exit_txt, True, COLOR_TEXT_WHITE), (px, py))
        py += 26

        pygame.draw.line(self.screen, COLOR_PANEL_BORDER, (px, py), (panel_x + panel_w - 18, py), 1)
        py += 12

        # 3. LEYENDA VISUAL DE COLORES (cumplimiento estricto)
        self.screen.blit(self.font_stats_bold.render("LEYENDA DE ELEMENTOS", True, COLOR_TEXT_ACCENT), (px, py))
        py += 22

        legend_items = [
            (COLOR_WALL, "Paredes (intransitables)"),
            (COLOR_PATH, "Caminos transitables"),
            (COLOR_ENTRANCE, "Entrada 1 y Entrada 2"),
            (COLOR_EXIT, "Salida 1 y Salida 2"),
            (COLOR_AGENT, "Agente / Posición actual"),
            (COLOR_EXPLORED, "Celdas exploradas (A*)"),
            (COLOR_FINAL_PATH, "Camino final óptimo"),
        ]

        for color, label in legend_items:
            # Cuadro indicador
            pygame.draw.rect(self.screen, color, pygame.Rect(px, py + 2, 14, 14), border_radius=3)
            pygame.draw.rect(self.screen, (200, 200, 200), pygame.Rect(px, py + 2, 14, 14), width=1, border_radius=3)
            self.screen.blit(self.font_stats.render(label, True, COLOR_TEXT_WHITE), (px + 22, py))
            py += 20

        py += 10
        # 4. CONTROL DE VELOCIDAD
        self.screen.blit(self.font_stats_bold.render("VELOCIDAD DE ANIMACIÓN", True, COLOR_TEXT_ACCENT), (px, py))
        py += 22
        for label, speed, btn in self.speed_btns:
            btn.bg_color = (37, 99, 235) if abs(self.current_speed - speed) < 0.01 else (45, 58, 88)
            btn.draw(self.screen)

        # 5. BOTONES DE ACCIÓN
        self.btn_iniciar.draw(self.screen)
        self.btn_reiniciar.draw(self.screen)
        self.btn_nuevo.draw(self.screen)
        self.btn_menu.draw(self.screen)


# ==============================================================================
# PUNTO DE ENTRADA PRINCIPAL
# ==============================================================================
def main():
    """Inicializa y arranca la aplicación del laberinto."""
    game = Game()
    game.run()


if __name__ == "__main__":
    main()
