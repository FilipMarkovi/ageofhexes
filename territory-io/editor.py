import tkinter as tk
from tkinter import messagebox
import math

# --- SYSTEM TERRAINS ---
TERRAINS = [
    {"code": ".", "color": "#111111", "label": "Empty"},
    {"code": "G", "color": "#4a5540", "label": "Grass"},
    {"code": "D", "color": "#e2c49c", "label": "Desert"},
    {"code": "M", "color": "#707070", "label": "Mountain"},
    {"code": "H", "color": "#ffcc00", "label": "HQ"},
    {"code": "W", "color": "#2b5c8f", "label": "Water"}
]

ROWS = 32
COLS = 36
HEX_SIZE = 20  # Radius size of the hexes in pixels

class HexEditor:
    def __init__(self, root):
        self.root = root
        self.root.title("Territory.io Hex Map Editor")
        
        # Internal State
        self.grid = [[0 for _ in range(COLS)] for _ in range(ROWS)]
        self.active_terrain_index = 1  # Default active brush is Grass (G)
        
        # --- TOP CONTROL BAR ---
        control_frame = tk.Frame(root, pady=5)
        control_frame.pack(side=tk.TOP, fill=tk.X, padx=10)
        
        gen_btn = tk.Button(control_frame, text="Generate Map Code", command=self.generate_ascii_map, bg="#28a745", fg="white", font=("Arial", 10, "bold"))
        gen_btn.pack(side=tk.LEFT, padx=5)
        
        clear_btn = tk.Button(control_frame, text="Clear Grid", command=self.clear_grid)
        clear_btn.pack(side=tk.LEFT, padx=5)

        # --- TEXTBOX INPUTS FOR MAP DETAILS ---
        meta_frame = tk.LabelFrame(root, text=" Map Settings ", padx=10, pady=5)
        meta_frame.pack(side=tk.TOP, fill=tk.X, padx=10, pady=5)

        tk.Label(meta_frame, text="Variable Name (JS):").pack(side=tk.LEFT)
        self.name_entry = tk.Entry(meta_frame, width=15)
        self.name_entry.insert(0, "amazon") # Default value
        self.name_entry.pack(side=tk.LEFT, padx=5)

        tk.Label(meta_frame, text="Display Name:").pack(side=tk.LEFT, padx=10)
        self.display_name_entry = tk.Entry(meta_frame, width=25)
        self.display_name_entry.insert(0, "The Amazon River") # Default value
        self.display_name_entry.pack(side=tk.LEFT, padx=5)

        # --- TERRAIN SELECTOR LEGEND ("BRUSHES") ---
        brush_frame = tk.LabelFrame(root, text=" Select Active Brush ", padx=10, pady=5)
        brush_frame.pack(side=tk.TOP, fill=tk.X, padx=10, pady=5)
        
        self.brush_buttons = []
        for idx, t in enumerate(TERRAINS):
            # Create interactive click buttons for the legend
            btn = tk.Button(
                brush_frame, 
                text=f"{t['label']} ({t['code']})", 
                bg=t["color"], 
                fg="white" if t["code"] != "D" else "black",
                command=lambda i=idx: self.set_active_brush(i),
                relief=tk.RAISED,
                bd=2,
                padx=8
            )
            btn.pack(side=tk.LEFT, padx=4)
            self.brush_buttons.append(btn)
            
        # Highlight initial grass button selection
        self.update_brush_highlights()

        # --- CANVAS SETUP ---
        self.width = COLS * (HEX_SIZE * math.sqrt(3)) + 50
        self.height = ROWS * (HEX_SIZE * 1.5) + 50
        
        self.canvas = tk.Canvas(root, width=self.width, height=self.height, bg="#000000")
        self.canvas.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # Mouse Bindings
        self.canvas.bind("<Button-1>", self.on_left_click)      # Paint active brush
        self.canvas.bind("<B1-Motion>", self.on_left_click)    # Drag-to-paint support!
        self.canvas.bind("<Button-3>", self.on_right_click)     # Right click to erase
        self.canvas.bind("<Button-2>", self.on_right_click)     # Mac compatibility trackpad
        
        self.draw_grid()

    def set_active_brush(self, index):
        """Changes the active terrain brush type."""
        self.active_terrain_index = index
        self.update_brush_highlights()

    def update_brush_highlights(self):
        """Visually shows which brush button is active."""
        for idx, btn in enumerate(self.brush_buttons):
            if idx == self.active_terrain_index:
                btn.config(relief=tk.SUNKEN, bd=4, font=("Arial", 9, "bold"))
            else:
                btn.config(relief=tk.RAISED, bd=2, font=("Arial", 9))

    def get_hex_center(self, row, col):
        hex_width = HEX_SIZE * math.sqrt(3)
        x = col * hex_width + (hex_width / 2)
        if row % 2 == 1:
            x += hex_width / 2
        y = row * (HEX_SIZE * 1.5) + HEX_SIZE
        return x + 20, y + 20

    def draw_hex_shape(self, cx, cy):
        points = []
        for i in range(6):
            angle_rad = math.pi / 3 * i + math.pi / 6
            points.append(cx + HEX_SIZE * math.cos(angle_rad))
            points.append(cy + HEX_SIZE * math.sin(angle_rad))
        return points

    def draw_grid(self):
        self.canvas.delete("all")
        for r in range(ROWS):
            for c in range(COLS):
                cx, cy = self.get_hex_center(r, c)
                points = self.draw_hex_shape(cx, cy)
                
                terrain_idx = self.grid[r][c]
                color = TERRAINS[terrain_idx]["color"]
                code = TERRAINS[terrain_idx]["code"]
                
                self.canvas.create_polygon(
                    points, fill=color, outline="#222222", width=1, 
                    tags=f"hex_{r}_{c}"
                )
                
                text_color = "#555" if code == "." else ("#fff" if code != "D" else "#222")
                self.canvas.create_text(cx, cy, text=code, fill=text_color, font=("Courier", 8))

    def find_closest_hex(self, click_x, click_y):
        closest_tile = None
        min_dist = float('inf')
        for r in range(ROWS):
            for c in range(COLS):
                cx, cy = self.get_hex_center(r, c)
                dist = math.hypot(click_x - cx, click_y - cy)
                if dist < min_dist and dist <= HEX_SIZE * 1.2:
                    min_dist = dist
                    closest_tile = (r, c)
        return closest_tile

    def on_left_click(self, event):
        """Paints the currently selected brush onto the hex grid."""
        tile = self.find_closest_hex(event.x, event.y)
        if tile:
            r, c = tile
            # Paint with the selected active brush index
            if self.grid[r][c] != self.active_terrain_index:
                self.grid[r][c] = self.active_terrain_index
                self.draw_grid()

    def on_right_click(self, event):
        """Erases a tile, setting it back to empty (.)."""
        tile = self.find_closest_hex(event.x, event.y)
        if tile:
            r, c = tile
            if self.grid[r][c] != 0:
                self.grid[r][c] = 0
                self.draw_grid()

    def clear_grid(self):
        self.grid = [[0 for _ in range(COLS)] for _ in range(ROWS)]
        self.draw_grid()

    def generate_ascii_map(self):
        # Read parameters dynamically from textboxes
        map_name = self.name_entry.get().strip() or "customMap"
        map_display_name = self.display_name_entry.get().strip() or "Custom Map Layout"

        lines = []
        for r in range(ROWS):
            row_chars = []
            for c in range(COLS):
                terrain_idx = self.grid[r][c]
                row_chars.append(TERRAINS[terrain_idx]["code"])
            
            row_str = " ".join(row_chars)
            if r % 2 == 1:
                formatted_line = f"     {row_str} ."
            else:
                formatted_line = f"    {row_str} . ."
            lines.append(formatted_line)

        map_body = "\n".join(lines)
        
        js_code = (
            f"import {{ asciiToGameMap }} from \"../asciiMap.js\";\n\n"
            f"export const {map_name} = asciiToGameMap(\n"
            f"  \"{map_name}\",\n"
            f"  `\n{map_body}\n  `,\n"
            f"  \"{map_display_name}\"\n"
            f");"
        )
        
        print("\n--- GENERATED CODE BELOW (Copy and Paste) ---")
        print(js_code)
        print("---------------------------------------------\n")
        messagebox.showinfo("Export Successful", f"Map code compiled for variable '{map_name}'! Check your python terminal.")

if __name__ == "__main__":
    root = tk.Tk()
    app = HexEditor(root)
    root.mainloop()