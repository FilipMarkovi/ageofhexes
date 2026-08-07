import tkinter as tk
from tkinter import messagebox
import math
import re

# --- SYSTEM TERRAINS ---
TERRAINS = [
    {"code": ".", "color": "#111111", "label": "Empty"},
    {"code": "G", "color": "#4a5540", "label": "Grass"},
    {"code": "D", "color": "#e2c49c", "label": "Desert"},
    {"code": "M", "color": "#707070", "label": "Mountain"},
    {"code": "H", "color": "#ffcc00", "label": "HQ"},
    {"code": "W", "color": "#2b5c8f", "label": "Water"}
]

CODE_TO_INDEX = {t["code"]: idx for idx, t in enumerate(TERRAINS)}

ROWS = 32
COLS = 36

class HexEditor:
    def __init__(self, root):
        self.root = root
        self.root.title("Territory.io Hex Map Editor")
        
        # Internal State
        self.grid = [[0 for _ in range(COLS)] for _ in range(ROWS)]
        self.active_terrain_index = 1  # Default active brush is Grass (G)
        self.hex_size = 14  # Default smaller starting size (scaleable via zoom slider)
        
        # --- TOP CONTROL BAR ---
        control_frame = tk.Frame(root, pady=5)
        control_frame.pack(side=tk.TOP, fill=tk.X, padx=10)
        
        gen_btn = tk.Button(control_frame, text="Generate Map Code", command=self.generate_ascii_map, bg="#28a745", fg="white", font=("Arial", 10, "bold"))
        gen_btn.pack(side=tk.LEFT, padx=5)
        
        load_btn = tk.Button(control_frame, text="Load Map Code", command=self.open_load_dialog, bg="#007bff", fg="white", font=("Arial", 10, "bold"))
        load_btn.pack(side=tk.LEFT, padx=5)
        
        clear_btn = tk.Button(control_frame, text="Clear Grid", command=self.clear_grid)
        clear_btn.pack(side=tk.LEFT, padx=5)

        # --- ZOOM / SCALE CONTROL ---
        zoom_frame = tk.Frame(control_frame)
        zoom_frame.pack(side=tk.RIGHT, padx=10)
        tk.Label(zoom_frame, text="Zoom / Hex Size:", font=("Arial", 9, "bold")).pack(side=tk.LEFT, padx=2)
        
        self.zoom_slider = tk.Scale(zoom_frame, from_=8, to=30, orient=tk.HORIZONTAL, command=self.on_zoom_change)
        self.zoom_slider.set(self.hex_size)
        self.zoom_slider.pack(side=tk.LEFT)

        # --- TEXTBOX INPUTS FOR MAP DETAILS ---
        meta_frame = tk.LabelFrame(root, text=" Map Settings ", padx=10, pady=5)
        meta_frame.pack(side=tk.TOP, fill=tk.X, padx=10, pady=5)

        tk.Label(meta_frame, text="Variable Name (JS):").pack(side=tk.LEFT)
        self.name_entry = tk.Entry(meta_frame, width=15)
        self.name_entry.insert(0, "amazon")
        self.name_entry.pack(side=tk.LEFT, padx=5)

        tk.Label(meta_frame, text="Display Name:").pack(side=tk.LEFT, padx=10)
        self.display_name_entry = tk.Entry(meta_frame, width=25)
        self.display_name_entry.insert(0, "The Amazon River")
        self.display_name_entry.pack(side=tk.LEFT, padx=5)

        # --- TERRAIN SELECTOR LEGEND ("BRUSHES") ---
        brush_frame = tk.LabelFrame(root, text=" Select Active Brush ", padx=10, pady=5)
        brush_frame.pack(side=tk.TOP, fill=tk.X, padx=10, pady=5)
        
        self.brush_buttons = []
        for idx, t in enumerate(TERRAINS):
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
            
        self.update_brush_highlights()

        # --- SCROLLABLE CANVAS SETUP ---
        canvas_container = tk.Frame(root)
        canvas_container.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.h_scroll = tk.Scrollbar(canvas_container, orient=tk.HORIZONTAL)
        self.h_scroll.pack(side=tk.BOTTOM, fill=tk.X)

        self.v_scroll = tk.Scrollbar(canvas_container, orient=tk.VERTICAL)
        self.v_scroll.pack(side=tk.RIGHT, fill=tk.Y)

        self.canvas = tk.Canvas(
            canvas_container, 
            bg="#000000",
            xscrollcommand=self.h_scroll.set, 
            yscrollcommand=self.v_scroll.set
        )
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.h_scroll.config(command=self.canvas.xview)
        self.v_scroll.config(command=self.canvas.yview)

        # Mouse Bindings
        self.canvas.bind("<Button-1>", self.on_left_click)      # Paint active brush
        self.canvas.bind("<B1-Motion>", self.on_left_click)    # Drag-to-paint support
        self.canvas.bind("<Button-3>", self.on_right_click)     # Right click to erase
        self.canvas.bind("<Button-2>", self.on_right_click)     # Mac compatibility trackpad
        
        self.draw_grid()

    def set_active_brush(self, index):
        self.active_terrain_index = index
        self.update_brush_highlights()

    def update_brush_highlights(self):
        for idx, btn in enumerate(self.brush_buttons):
            if idx == self.active_terrain_index:
                btn.config(relief=tk.SUNKEN, bd=4, font=("Arial", 9, "bold"))
            else:
                btn.config(relief=tk.RAISED, bd=2, font=("Arial", 9))

    def on_zoom_change(self, val):
        self.hex_size = int(val)
        self.draw_grid()

    def get_hex_center(self, row, col):
        hex_width = self.hex_size * math.sqrt(3)
        x = col * hex_width + (hex_width / 2)
        if row % 2 == 1:
            x += hex_width / 2
        y = row * (self.hex_size * 1.5) + self.hex_size
        return x + 20, y + 20

    def draw_hex_shape(self, cx, cy):
        points = []
        for i in range(6):
            angle_rad = math.pi / 3 * i + math.pi / 6
            points.append(cx + self.hex_size * math.cos(angle_rad))
            points.append(cy + self.hex_size * math.sin(angle_rad))
        return points

    def draw_grid(self):
        self.canvas.delete("all")
        
        # Recalculate full dimensions for scroll region
        max_w = COLS * (self.hex_size * math.sqrt(3)) + 60
        max_h = ROWS * (self.hex_size * 1.5) + 60
        self.canvas.config(scrollregion=(0, 0, max_w, max_h))

        # Font scaling based on zoom
        font_size = max(6, int(self.hex_size / 2.5))

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
                
                # Draw text code only if hex size is big enough to be legible
                if self.hex_size >= 10:
                    text_color = "#555" if code == "." else ("#fff" if code != "D" else "#222")
                    self.canvas.create_text(cx, cy, text=code, fill=text_color, font=("Courier", font_size))

    def find_closest_hex(self, click_x, click_y):
        # Translate canvas click coordinates to actual content coordinates
        canvas_x = self.canvas.canvasx(click_x)
        canvas_y = self.canvas.canvasy(click_y)

        closest_tile = None
        min_dist = float('inf')
        for r in range(ROWS):
            for c in range(COLS):
                cx, cy = self.get_hex_center(r, c)
                dist = math.hypot(canvas_x - cx, canvas_y - cy)
                if dist < min_dist and dist <= self.hex_size * 1.2:
                    min_dist = dist
                    closest_tile = (r, c)
        return closest_tile

    def on_left_click(self, event):
        tile = self.find_closest_hex(event.x, event.y)
        if tile:
            r, c = tile
            if self.grid[r][c] != self.active_terrain_index:
                self.grid[r][c] = self.active_terrain_index
                self.draw_grid()

    def on_right_click(self, event):
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

    def open_load_dialog(self):
        dialog = tk.Toplevel(self.root)
        dialog.title("Load Map Code")
        dialog.geometry("600x450")
        dialog.transient(self.root)
        dialog.grab_set()

        lbl = tk.Label(dialog, text="Paste your JS map file or raw ASCII map string below:", font=("Arial", 10, "bold"))
        lbl.pack(pady=5)

        text_area = tk.Text(dialog, wrap=tk.NONE, font=("Courier", 9))
        text_area.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        def do_import():
            raw_input = text_area.get("1.0", tk.END).strip()
            if not raw_input:
                dialog.destroy()
                return

            if self.parse_and_load_map(raw_input):
                messagebox.showinfo("Success", "Map imported successfully!")
                dialog.destroy()
            else:
                messagebox.showerror("Parse Error", "Failed to parse map code.")

        btn_frame = tk.Frame(dialog)
        btn_frame.pack(fill=tk.X, pady=10)

        import_btn = tk.Button(btn_frame, text="Import to Grid", command=do_import, bg="#28a745", fg="white", font=("Arial", 10, "bold"), padx=10)
        import_btn.pack(side=tk.RIGHT, padx=10)

        cancel_btn = tk.Button(btn_frame, text="Cancel", command=dialog.destroy, padx=10)
        cancel_btn.pack(side=tk.RIGHT)

    def parse_and_load_map(self, text):
        var_match = re.search(r'export\s+const\s+(\w+)', text)
        if var_match:
            self.name_entry.delete(0, tk.END)
            self.name_entry.insert(0, var_match.group(1))

        disp_match = re.findall(r'"([^"]+)"|\'([^\']+)\'', text)
        if len(disp_match) >= 2:
            display_str = disp_match[-1][0] or disp_match[-1][1]
            if display_str and (display_str != var_match.group(1) if var_match else True):
                self.display_name_entry.delete(0, tk.END)
                self.display_name_entry.insert(0, display_str)

        if "`" in text:
            map_body = text.split("`")[1]
        else:
            map_body = text

        lines = [line.strip() for line in map_body.strip().splitlines() if line.strip()]

        if not lines:
            return False

        new_grid = [[0 for _ in range(COLS)] for _ in range(ROWS)]

        for r_idx, line in enumerate(lines[:ROWS]):
            tokens = [token for token in line.split() if token in CODE_TO_INDEX]
            for c_idx, token in enumerate(tokens[:COLS]):
                new_grid[r_idx][c_idx] = CODE_TO_INDEX[token]

        self.grid = new_grid
        self.draw_grid()
        return True

if __name__ == "__main__":
    root = tk.Tk()
    root.geometry("1000x700")  # Set default window size suitable for laptops
    app = HexEditor(root)
    root.mainloop()