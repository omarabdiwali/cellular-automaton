import Mask from "@/components/Mask";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useWebGPUSimulation } from "@/utils/useWebGPUSimulation";
import { Boundaries, RulesData } from "@/utils/types";

/**
 * Main Home component for the Cellular Automaton simulator.
 * Handles the grid rendering, simulation controls, and rule configurations.
 */
export default function Home() {
  // Grid dimensions and sizing
  const mSize = 15; // Size for rule masks (small grid for controls)
  const [mSize, setMSize] = useState(200); // Dynamic size for main simulation grid, adjusts to container width
  
  // Refs for DOM elements and performance tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobileLayout, setIsMobileLayout] = useState(false); // Detects if screen is mobile-sized (<1000px)
  const canvasRef = useRef<HTMLCanvasElement>(null); // Canvas for rendering the grid
  const imageDataRef = useRef<ImageData | null>(null); // Cached image data for efficient drawing
  const lastUpdateTimeRef = useRef<number>(0); // Tracks time since last simulation step
  const isUpdatingGridRef = useRef<boolean>(false); // Prevents concurrent grid updates
  
  const animationFrameId = useRef<number | null>(null); // ID for requestAnimationFrame loop

  /**
   * Initializes a small grid with Conway's Game of Life starting pattern (a 3x3 square).
   * @param size - The side length of the square grid
   * @returns Uint8Array with the pattern in the center
   */
  const initializeConways = (size: number): Uint8Array => {
    const grid = new Uint8Array(size * size);
    const center = Math.floor(size / 2);
    const deltas = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    deltas.forEach(([dx, dy]) => {
      const pos = (center + dy) * size + (center + dx);
      grid[pos] = 1;
    });
    return grid;
  };

  // Rule states for four different masks (m1 to m4)
  // m1 is initialized with Conway's Game of Life pattern
  const [m1, setM1] = useState<Uint8Array>(() => initializeConways(mSize));
  const [m2, setM2] = useState<Uint8Array>(() => new Uint8Array(mSize * mSize));
  const [m3, setM3] = useState<Uint8Array>(() => new Uint8Array(mSize * mSize));
  const [m4, setM4] = useState<Uint8Array>(() => new Uint8Array(mSize * mSize));
  
  // Boundaries for birth and survival rules for each mask
  const [m1Boundaries, setM1Boundaries] = useState<Boundaries>({ lowerStable: 2, upperStable: 3, lowerBorn: 3, upperBorn: 3 });
  const [m2Boundaries, setM2Boundaries] = useState<Boundaries>({ lowerStable: 0, upperStable: 0, lowerBorn: 0, upperBorn: 0 });
  const [m3Boundaries, setM3Boundaries] = useState<Boundaries>({ lowerStable: 0, upperStable: 0, lowerBorn: 0, upperBorn: 0 });
  const [m4Boundaries, setM4Boundaries] = useState<Boundaries>({ lowerStable: 0, upperStable: 0, lowerBorn: 0, upperBorn: 0 });
  
  // Enable/disable flags for each mask
  const [m1Enabled, setM1Enabled] = useState(true);
  const [m2Enabled, setM2Enabled] = useState(false);
  const [m3Enabled, setM3Enabled] = useState(false);
  const [m4Enabled, setM4Enabled] = useState(false);

  // Simulation controls
  const [isRunning, setIsRunning] = useState(false); // Toggle for starting/stopping animation
  const [isEnabled, setIsEnabled] = useState(true); // Overall enabled state based on any mask active
  const [animationSpeed, setAnimationSpeed] = useState(30); // FPS for simulation speed
  const [density, setDensity] = useState(0.1); // Density for random grid generation (0 to 1, initial 0.1)
  const [initializationStatus, setInitializationStatus] = useState("Initializing WebGPU..."); // Status for loading

  // Custom hook for WebGPU-based simulation
  const { runSimulationStep, drawGridData, resetSimulation, isReady } = useWebGPUSimulation(mSize, mSize);
  const isRunningRef = useRef(isRunning); // Ref to track running state without re-renders
  const animationSpeedRef = useRef(animationSpeed); // Ref to track animation speed

  // Sync running state to ref
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // Ref to hold the latest rulesData for live updates in the animation loop (avoids stale closures)
  const rulesDataRef = useRef<RulesData | null>(null);

  // Memoized rules data object passed to simulation
  const rulesData = useMemo(() => ({
    m1, m2, m3, m4,
    b1: m1Boundaries, b2: m2Boundaries, b3: m3Boundaries, b4: m4Boundaries,
    e1: m1Enabled ? 1 : 0, e2: m2Enabled ? 1 : 0, e3: m3Enabled ? 1 : 0, e4: m4Enabled ? 1 : 0,
  }), [m1, m2, m3, m4, m1Boundaries, m2Boundaries, m3Boundaries, m4Boundaries, m1Enabled, m2Enabled, m3Enabled, m4Enabled]);

  // Update the ref whenever rulesData changes (enables live updates without restarting animation)
  useEffect(() => {
    rulesDataRef.current = rulesData;
  }, [rulesData]);

  // Auto-pause when all masks are disabled (stops the loop to save resources and feel truly "paused")
  useEffect(() => {
    setIsEnabled(m1Enabled || m2Enabled || m3Enabled || m4Enabled);
  }, [m1Enabled, m2Enabled, m3Enabled, m4Enabled]);

  /**
   * Initializes a random grid with a specified density (0 to 1).
   * @param size - The side length of the square grid
   * @param density - Probability (0-1) of a cell being alive
   * @returns Uint8Array representing the grid (1 = alive, 0 = dead)
   */
  const initializeGrid = useCallback((size: number, density: number): Uint8Array => {
    const grid = new Uint8Array(size * size);
    for (let i = 0; i < grid.length; i++) {
      grid[i] = Math.random() < density ? 1 : 0;
    }
    return grid;
  }, []);

  // Handle responsive layout detection (mobile vs desktop)
  useEffect(() => {
    const checkScreenWidth = () => setIsMobileLayout(window.innerWidth < 1000);
    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  // Dynamically adjust grid size based on container width
  useEffect(() => {
    const calculateGridSize = () => {
      if (!containerRef.current) return;
      setIsRunning(false);
      const containerWidth = containerRef.current.offsetWidth;
      const cellSize = 1;
      const newSize = Math.floor(containerWidth / cellSize);
      const validMSize = newSize % 2 === 0 ? newSize - 1 : newSize; // Ensure odd size for symmetry
      setMSize(validMSize);
    };
    calculateGridSize();
    window.addEventListener('resize', calculateGridSize);
    return () => window.removeEventListener('resize', calculateGridSize);
  }, []);

  // Initialize simulation when WebGPU is ready and size changes
  useEffect(() => {
    if (isReady) {
      setInitializationStatus("Ready");
      const emptyGrid = new Uint8Array(mSize * mSize);
      resetSimulation({ canvas: canvasRef.current, imageData: imageDataRef.current, grid: emptyGrid });
    } else {
      setInitializationStatus("Initializing WebGPU...");
    }
  }, [mSize, isReady, resetSimulation]);

  useEffect(() => {
    animationSpeedRef.current = animationSpeed;
  }, [animationSpeed]);

  // Main animation loop using requestAnimationFrame, throttled by animationSpeed
  useEffect(() => {
    if (isRunning && isReady && isEnabled) {
      const animate = async (timestamp: number) => {
        if (!isRunningRef.current) {
          return;
        }
        const frameInterval = 1000 / animationSpeedRef.current; // ms per frame based on FPS

        // Throttle updates to target FPS
        if (!isUpdatingGridRef.current && timestamp - lastUpdateTimeRef.current >= frameInterval) {
          isUpdatingGridRef.current = true;
          lastUpdateTimeRef.current = timestamp;
          
          // Use the latest rules from ref (enables live updates)
          const currentRules = rulesDataRef.current;
          if (currentRules) {
            await runSimulationStep(currentRules);
          }
          
          await drawGridData({ canvas: canvasRef.current, imageData: imageDataRef.current });
          isUpdatingGridRef.current = false;
        }

        if (isRunningRef.current) {
          animationFrameId.current = requestAnimationFrame(animate);
        }
      };

      lastUpdateTimeRef.current = performance.now();
      animationFrameId.current = requestAnimationFrame(animate);
    }

    // Cleanup on unmount or deps change
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isRunning, isEnabled, isReady, drawGridData, runSimulationStep]);

  /**
   * Randomizes the grid with a new random pattern and resets simulation.
   * Stops any running animation.
   */
  const handleRandomize = () => {
    setIsRunning(false);
    const newGrid = initializeGrid(mSize, density);
    setTimeout(() => resetSimulation({ canvas: canvasRef.current, imageData: imageDataRef.current, grid: newGrid }), 50);
  };

  /**
   * Clears the grid to all dead cells and resets simulation.
   * Stops any running animation.
   */
  const handleClear = () => {
    setIsRunning(false);
    const clearedGrid = new Uint8Array(mSize * mSize);
    setTimeout(() => resetSimulation({ canvas: canvasRef.current, imageData: imageDataRef.current, grid: clearedGrid }), 50);
  };

  return (
    <div className={`flex ${isMobileLayout ? 'flex-col' : 'flex-row'} gap-2 py-3 text-white`}>
      {/* Left section: Canvas and controls */}
      <div ref={containerRef} className={`flex flex-col ${isMobileLayout ? 'w-full px-5' : 'w-1/2 pr-5 h-full'} gap-4`}>
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          {/* Loading overlay when WebGPU is initializing */}
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
              <span className="text-xl font-bold">{initializationStatus}</span>
            </div>
          )}
          {/* Size overlay in top-left corner */}
          <div className="absolute top-2 left-2 z-10 bg-black opacity-70 text-white text-sm px-2 py-1 rounded">
            {mSize}x{mSize}
          </div>
          <canvas
            ref={canvasRef}
            className="w-full h-full border border-gray-600 object-contain"
          />
        </div>
        {/* Controls: Speed slider, density slider, buttons */}
        <div className="flex flex-col gap-3 pl-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 min-w-[80px]">Speed: {animationSpeed}fps</span>
            <input
              type="range"
              min="1"
              max="60"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 min-w-[80px]">Density: {density.toFixed(2)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleRandomize} className="px-4 py-2 bg-green-600 rounded hover:bg-green-700">Random</button>

            <button onClick={handleClear} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700">Clear</button>
            <button onClick={() => setIsRunning(!isRunning)} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 w-20">
              {isRunning ? "Stop" : "Start"}
            </button>
          </div>
        </div>
      </div>

      {/* Right section: Rule masks configuration */}
      <div className={`flex flex-col ${isMobileLayout ? 'w-full px-5' : 'w-max px-5'} gap-5`}>
        <div className="flex flex-row gap-5">
          <Mask
            initialGrid={m1}
            setGlobalGrid={setM1}
            setGlobalBoundaries={setM1Boundaries}
            boundaries={m1Boundaries}
            size={mSize}
            enabled={m1Enabled}
            setEnabled={setM1Enabled}
          />
          <Mask
            initialGrid={m2}
            setGlobalGrid={setM2}
            setGlobalBoundaries={setM2Boundaries}
            boundaries={m2Boundaries}
            size={mSize}
            enabled={m2Enabled}
            setEnabled={setM2Enabled}
          />
        </div>
        <div className="flex flex-row gap-5">
          <Mask
            initialGrid={m3}
            setGlobalGrid={setM3}
            setGlobalBoundaries={setM3Boundaries}
            boundaries={m3Boundaries}
            size={mSize}
            enabled={m3Enabled}
            setEnabled={setM3Enabled}
          />
          <Mask
            initialGrid={m4}
            setGlobalGrid={setM4}
            setGlobalBoundaries={setM4Boundaries}
            boundaries={m4Boundaries}
            size={mSize}
            enabled={m4Enabled}
            setEnabled={setM4Enabled}
          />
        </div>
      </div>
    </div>
  );
}