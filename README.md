# Cellular Automaton Simulator

A web-based interactive simulator for cellular automata, accelerated by WebGPU for high-performance simulations. Users can configure up to four independent rule sets (birth and survival rules based on neighbor counts in customizable masks), set up initial grid states on a large simulation canvas, and run real-time evolutions. Built with React, TypeScript, Tailwind CSS, and WebGPU for a responsive, performant UI.
![Screenshot Placeholder](https://i.imgur.com/cuvOw6A.png)  

## Features

- **High-Performance WebGPU Simulation**: Runs cellular automata on the GPU using WGSL shaders. Supports toroidal (periodic) boundary conditions, multiple overlapping rule sets (up to 4), and large grids (e.g. 200x200 dynamically sized). Ping-pong buffering for efficient double-buffered computation.
- **Multiple Rule Masks**: Four independent 15x15 (configurable) grids (n1–n4) for defining neighborhood rules. Each mask represents valid neighbor positions (alive cells in blue) for counting. Central red cell is the focal point (excluded from counting). Toggle enable/disable per mask.
- **Interactive Grid Editor**: Click and drag on small mask grids to add (blue) or delete (gray) cells. Add/Delete mode buttons and Clear Grid functionality. Rules apply in real-time during simulation if a mask is enabled.
- **Rule Configuration**: Per-mask inputs for Lower/Upper Born (dead cell becomes alive) and Lower/Upper Stable (alive cell survives) neighbor counts. Defaults to Conway's Game of Life for mask n1 (e.g. Born: 3/3, Stable: 2/3).
- **Simulation Controls**:
  - Start/Stop button to toggle animation loop.
  - Speed slider (1–60 FPS). Density slider (0-100%).
  - Randomize (density of alive cells) or Clear (all dead) the main grid.
  - Dynamic grid sizing based on viewport (e.g. fits container width, odd-sized for symmetry).
- **Visual Feedback**:
  - Main simulation: Green pixels for alive cells, black for dead on a canvas.
  - Masks: Blue for active rule positions, gray for inactive, red for focal center.
  - Hover/click effects; disabled states dimmed for read-only viewing.
  - Mobile-responsive layout (stacks vertically on small screens).
- **Accessibility & UX**: Read-only inputs when masks disabled; keyboard navigation; loading overlay for WebGPU init.
- **Extensible Design**: Core logic in custom hooks (`useWebGPUSimulation`) and components (`Mask`). Easy to add more rules, patterns, or export functionality.

This project supports complex automata by combining multiple rules (e.g. hybrid Life + other patterns) and scales to large grids without CPU bottlenecks.

**Browser Support**: Requires WebGPU (Chrome 113+, Edge 113+, Firefox 125+ with flags). Falls back gracefully with error messages.

## Demo

- [Live Demo](https://cellularautomaton.vercel.app)
- Or run locally after installation (see below).

## Installation

1. **Clone the Repository**:
   ```
   git clone https://github.com/omarabdiwali/cellular-automaton.git
   cd cellular-automaton
   ```

2. **Install Dependencies**:
   Ensure you have Node.js (v18+) and npm/yarn installed. WebGPU is native to modern browsers—no extra deps.
   ```
   npm install
   # or
   yarn install
   ```

3. **Run the Development Server**:
   ```
   npm start
   # or
   yarn start
   ```
   The app will open at `http://localhost:3000` (or similar, depending on your setup). Check browser console for WebGPU status.

## Usage

### Quick Start
1. Open the app in a WebGPU-supported browser.
2. Wait for "Ready" status (WebGPU initializes automatically).
3. **Configure Rules** (right panel):
   - Enable a mask (e.g. n1, default Conway's) by clicking "Enable Mask".
   - Use Add/Delete to draw alive positions (blue squares) on the 15x15 grid. Avoid the red center.
   - Adjust numbers: Lower/Upper Born (e.g. 3/3 for birth on exactly 3 neighbors), Lower/Upper Stable (e.g. 2/3 for survival).
   - Disable to lock; enable others (n2–n4) for multi-rule hybrids.
4. **Run Simulation** (left panel):
   - Adjust Density slide (e.g. 15% density).
   - Click "Random" for a starting pattern or "Clear" for empty.
   - Adjust Speed slider (e.g. 30 FPS).
   - Click "Start" to evolve the grid. Watch green cells live/die based on enabled rules.
   - "Stop" pauses; grid size auto-adjusts on resize.
5. **Experiment**: Combine rules (e.g. n1=Life, n2=custom pattern) for emergent behaviors. Changes to masks apply live without restart.

### Key Behaviors
- **Neighbor Counting**: For each cell, count alive neighbors in valid mask positions (relative offsets). Applies birth/survival if count falls in range.
- **Multi-Rule Logic**: A cell survives/births if *any* enabled rule matches. No priority—additive for complex automata.
- **Performance**: GPU handles large grids at 60 FPS easily; scales with workgroup dispatch (8x8 tiles).
- **Editing Modes**: Masks dim when disabled; main canvas is read-only during sim.

### Extending the Project
- **Add Rules**: Extend shader/uniforms for >4 masks; update `RulesData`.
- **Patterns Library**: Preload famous automata (e.g. Wireworld) via buttons that set grids/boundaries.
- **Export/Import**: Save masks to JSON/localStorage; step-by-step generation export (GIF/video).
- **Custom Shaders**: Modify WGSL for non-Moor-like neighborhoods or multi-state cells.
- **CPU Fallback**: Add JS sim for non-WebGPU browsers.
- **Styling**: Tailwind-based; customize colors (e.g. multi-color cells) or add zoom/pan to canvas.
- **Testing**: Add unit tests for hook (mock WebGPU) and integration for Mask interactions.

## Technologies Used

- **Frontend**: React (with TypeScript for type safety), Next.js.
- **Compute**: WebGPU (WGSL shaders for parallel grid processing).
- **Rendering**: HTML5 Canvas (ImageData for pixel-efficient drawing).
- **Styling**: Tailwind CSS (responsive, utility-first).
- **Other**: Custom hooks for state/sim management; no external UI libs.

## Project Structure

```
cellular-automaton/
├── components/
│   └── Mask.tsx          # Rule mask grid editor
├── pages/
│   └── index.tsx         # Main Home component (simulation + UI)
├── utils/
│   ├── useWebGPUSimulation.ts  # WebGPU hook
│   └── types.ts          # Interfaces (Boundaries, RulesData, etc.)
├── public/                   # Static assets
├── package.json              # Dependencies (react, tailwindcss, typescript, @webgpu/types)
└── README.md
```

Note: Enable WebGPU in browsers if needed (e.g. chrome://flags/#enable-unsafe-webgpu).

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Bug reports (e.g. WebGPU errors, mobile issues) and feature requests (e.g. more rules) are welcome! Include browser/version, steps to reproduce, and screenshots.

## Acknowledgments

- Inspired by [Acerola](https://www.youtube.com/watch?v=I1JBiZrZ_XM), Conway's Game of Life, and cellular automata theory.
- WebGPU examples from Mozilla Developer Network (MDN) and WebGPU spec.
- Built with love using React, TypeScript, and WebGPU.
