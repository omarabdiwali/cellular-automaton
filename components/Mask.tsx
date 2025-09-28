import { Boundaries, Props } from "@/utils/types";
import { useState, useMemo, useCallback, useEffect } from "react";

export default function Mask({ 
  initialGrid, 
  setGlobalGrid, 
  setGlobalBoundaries, 
  boundaries, 
  size, 
  enabled, 
  setEnabled 
}: Props) {

  const [grid, setGrid] = useState<Uint8Array>(initialGrid);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawType, setDrawType] = useState(1); // 1 for "Add", 0 for "Delete"

  // Syncs local state if the initialGrid prop from the parent changes
  useEffect(() => {
    setGrid(initialGrid);
  }, [initialGrid]);

  // Memoize the 2D grid to prevent recalculating it on every render
  const grid2D = useMemo(() => {
    const newGrid2D: number[][] = [];
    for (let i = 0; i < size * size; i += size) {
      newGrid2D.push(Array.from(grid.slice(i, i + size)));
    }
    return newGrid2D;
  }, [grid, size]);

  // A single, reusable handler for all four boundary inputs
  const handleBoundaryChange = useCallback((key: keyof Boundaries, value: string) => {
    if (!enabled) return;
    const numValue = parseInt(value, 10);
    const properVal = isNaN(numValue) ? 0 : Math.min(Math.max(0, numValue), size * size);
    setGlobalBoundaries(prev => ({
      ...prev,
      [key]: properVal,
    }));
  }, [enabled, setGlobalBoundaries, size]);

  // Updates a single cell in the grid
  const updateCell = useCallback((pos: number) => {
    const centerPos = Math.floor(size * size / 2);
    if (pos === centerPos || grid[pos] === drawType) return;
    
    const newGrid = new Uint8Array(grid);
    newGrid[pos] = drawType;
    setGrid(newGrid);
    setGlobalGrid(newGrid);
  }, [grid, size, drawType, setGlobalGrid]);

  // Clears the grid
  const clearGrid = useCallback(() => {
    if (!enabled) return;
    const newGrid = new Uint8Array(size * size);
    setGrid(newGrid);
    setGlobalGrid(newGrid);
  }, [enabled, size, setGlobalGrid]);

  // Wrapper for cell interaction
  const handleCellInteraction = (pos: number) => {
    if (enabled) {
      updateCell(pos);
    }
  };

  const buttonClasses = enabled 
    ? "bg-red-500 hover:bg-red-600" 
    : "bg-green-500 hover:bg-green-600";

  const inputClasses = "block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:outline-none cursor-text select-none";
  
  return (
    <div className="flex flex-col">
      <div className="w-full max-w-sm mx-auto mb-4">
        <button
          onClick={() => setEnabled(!enabled)}
          className={`w-full flex items-center justify-center px-6 py-3 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none select-none ${buttonClasses}`}
        >
          {enabled ? 'Disable Neighbour' : 'Enable Neighbour'}
        </button>
      </div>

      <div
        className={`w-max ${!enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onMouseDown={() => enabled && setIsDrawing(true)}
        onMouseUp={() => setIsDrawing(false)}
        onMouseLeave={() => setIsDrawing(false)}
      >
        {grid2D.map((row, y) => (
          <div className="h-5 flex" key={y}>
            {row.map((cellValue, x) => {
              const pos = y * size + x;
              const middle = y * size + x === Math.floor(size * size / 2);
              return (
                <div
                  className={`w-5 h-5 text-black inline-block border border-gray-400 ${middle
                    ? "bg-red-500"
                    : grid[pos] === 1
                    ? "bg-blue-300"
                    : "bg-gray-300"
                  } ${!enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  id={`${pos}`} // ID is not used by logic, but kept for consistency
                  key={pos}
                  onMouseDown={() => handleCellInteraction(pos)}
                  onMouseEnter={() => isDrawing && handleCellInteraction(pos)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 w-full pt-4">
        <div className="flex flex-row gap-2">
          <button
            className={`flex-1 ${drawType === 1 ? 'bg-gray-400' : 'bg-gray-100'} text-black rounded-md border border-gray-300 py-2 px-4 focus:outline-none select-none ${
              !enabled ? 'bg-gray-300 cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
            onClick={!enabled ? undefined : () => setDrawType(1)}
            disabled={!enabled}
          >
            Add
          </button>
          <button
            className={`flex-1 ${drawType === 0 ? 'bg-gray-400' : 'bg-gray-100'} text-black rounded-md border border-gray-300 py-2 px-4 focus:outline-none select-none ${
              !enabled ? 'bg-gray-300 cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
            onClick={!enabled ? undefined : () => setDrawType(0)}
            disabled={!enabled}
          >
            Delete
          </button>
        </div>
        <button
          onClick={clearGrid}
          className={`w-full bg-gray-200 text-black rounded-md border border-gray-300 py-2 px-4 focus:outline-none select-none hover:bg-gray-300 ${
            !enabled ? 'bg-gray-300 cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          disabled={!enabled}
        >
          Clear Grid
        </button>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lower Born</label>
            <input 
              min={0} 
              max={size * size} 
              readOnly={!enabled}
              className={inputClasses} 
              type="number" 
              value={boundaries.lowerBorn == 0 ? '' : boundaries.lowerBorn} 
              onChange={(e) => handleBoundaryChange('lowerBorn', e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upper Born</label>
            <input 
              min={0} 
              max={size * size} 
              readOnly={!enabled}
              className={inputClasses} 
              type="number" 
              value={boundaries.upperBorn == 0 ? '' : boundaries.upperBorn} 
              onChange={(e) => handleBoundaryChange('upperBorn', e.target.value)} 
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lower Stable</label>
            <input 
              min={0} 
              max={size * size} 
              readOnly={!enabled}
              className={inputClasses} 
              type="number" 
              value={boundaries.lowerStable == 0 ? '' : boundaries.lowerStable} 
              onChange={(e) => handleBoundaryChange('lowerStable', e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upper Stable</label>
            <input 
              min={0} 
              max={size * size} 
              readOnly={!enabled}
              className={inputClasses} 
              type="number" 
              value={boundaries.upperStable == 0 ? '' : boundaries.upperStable} 
              onChange={(e) => handleBoundaryChange('upperStable', e.target.value)} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
