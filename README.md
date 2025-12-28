# 2D Room Planner 📐

A browser-based room design tool built with **Modern Angular**, **TypeScript**, and the **HTML5 Canvas API**. This project features a custom-built 2D rendering engine for drafting architectural layouts and arranging furniture with precision.

🚧 **Project Status - Active Prototype**

*Note: This is a functional drafting tool. While core vector drawing and manipulation are implemented, advanced features like 3D extrusion are planned for future updates.*

---

## ✨ Features Implemented

### Core Functionality
*   ✅ **Zoneless Angular Architecture** - High-performance rendering using Angular Signals and `provideZonelessChangeDetection`.
*   ✅ **Custom Canvas Engine** - Optimized 2D render loop (`requestAnimationFrame`) handling geometry, transforms, and collision.
*   ✅ **Vector-Based Wall Drawing** - Click-to-draw wall segments with automatic vertex snapping.
*   ✅ **Parametric Furniture** - Dynamic furniture templates (Beds, Sofas, Tables) with adjustable dimensions, rotation, and colors.
*   ✅ **Infinite Canvas** - Smooth Pan (Space+Drag) and Zoom (Scroll Wheel) controls.
*   ✅ **Local Persistence** - Auto-save functionality using `localStorage` to persist multiple room layouts.
*   ✅ **Export System** - Generate high-resolution PNG blueprints of your designs.

### Tech Stack
*   **Frontend Framework:** Angular (Standalone Components, Signals)
*   **Language:** TypeScript
*   **Rendering:** HTML5 Canvas API (`CanvasRenderingContext2D`)
*   **State Management:** Angular Signals (`WritableSignal`, `computed`, `effect`)
*   **Styling:** Tailwind CSS
*   **Build Tool:** Vite / Angular CLI
*   **Math:** Custom vector geometry (Euclidean distance, dot products, matrix transformations)

---

## 📁 Project Structure

```text
src/
├── components/
│   ├── canvas-editor/      # 🎨 The core engine. Handles the HTML5 Canvas, mouse events, and rendering loop.
│   ├── furniture-palette/  # 🛋️ UI library for selecting and adding furniture to the scene.
│   ├── room-properties/    # 📝 Inspector panel for modifying selected objects (walls/furniture).
│   ├── wall-toolbar/       # 📊 Real-time statistics (wall counts, perimeter, room dimensions).
│   ├── save-load-panel/    # 💾 Manages saved rooms via LocalStorage.
│   └── landing-page/       # 🏠 Initial welcome screen.
│
├── services/
│   ├── room.service.ts     # 🧠 Global state manager. Handles the Room model, walls, and active selection.
│   └── furniture.service.ts# 📦 Factory for creating furniture instances from templates.
│
├── models/                 # 📐 Type definitions for Wall, Furniture, and Room data structures.
└── interfaces/             # 🔗 Shared interfaces (Point, Dimension).
```

---

## 🔧 Setup & Installation

### Prerequisites
*   Node.js (Latest LTS recommended)
*   npm or yarn

### Installation Steps

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd room-planner-2d
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm start
    # or
    ng serve
    ```

4.  **Open Browser**
    Navigate to local address (usually `http://localhost:3000`)

---

## 🎮 Controls & Shortcuts

| Action | Input |
| :--- | :--- |
| **Select Object** | `Left Click` on an item |
| **Move Object** | `Left Click + Drag` |
| **Pan Canvas** | `Spacebar + Left Drag` OR `Middle Mouse Drag` |
| **Zoom In/Out** | `Mouse Wheel` |
| **Rotate Furniture** | Drag the rotation handle (small circle) on a selected item |
| **Resize Wall** | Drag wall endpoints |
| **Delete Selected** | `Del` Key or Trash Icon |
| **Clear Selection** | `Right Click` |

---

## 🚀 Planned Features & To-Do List

### 🎨 Design & UX
*   **Current Design**: Minimalist, architectural aesthetic using Zinc and White color palette.
*   **UI Components**: Floating toolbar for tools, Sidebar for properties, designed with Tailwind CSS.

### 🛠️ Technical Architecture

**State Management Strategy**
The app relies entirely on **Angular Signals**. The `RoomService` holds the source of truth (`currentRoom` signal). Components like `WallToolbar` use `computed` signals to derive statistics (e.g., total wall length) automatically without manual subscription management.

**Rendering Strategy**
Unlike DOM-based editors, this project uses an imperative Canvas API approach. The `CanvasEditorComponent` maintains a `requestAnimationFrame` loop that redraws the entire scene whenever state changes (via `effect`), ensuring 60FPS performance even with complex plans.

---

## 📄 License
This project is for educational and personal use.
