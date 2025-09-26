import { RulesData, WebGPURefs } from '@/utils/types';
import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * WGSL shader code for the cellular automaton simulation.
 * This compute shader processes a grid using multiple rule sets (up to 4 enabled rules).
 * It counts valid neighbors based on rule masks for birth/survival conditions and applies them.
 * Supports toroidal wrapping (periodic boundary conditions) for the grid.
 * Neighborhood size is configurable via nSize (odd number, e.g., 3 for Moore neighborhood).
 */
const shaderCode = `
struct Params {
    mSize: u32,
    nSize: u32,
    
    lowerStable1: u32, upperStable1: u32, lowerBorn1: u32, upperBorn1: u32, enabled1: u32,
    lowerStable2: u32, upperStable2: u32, lowerBorn2: u32, upperBorn2: u32, enabled2: u32,
    lowerStable3: u32, upperStable3: u32, lowerBorn3: u32, upperBorn3: u32, enabled3: u32,
    lowerStable4: u32, upperStable4: u32, lowerBorn4: u32, upperBorn4: u32, enabled4: u32,
};

@group(0) @binding(0) var<storage, read> gridIn: array<u32>;
@group(0) @binding(1) var<storage, read_write> gridOut: array<u32>;
@group(0) @binding(2) var<storage, read> rules1: array<u32>;
@group(0) @binding(3) var<storage, read> rules2: array<u32>;
@group(0) @binding(4) var<storage, read> rules3: array<u32>;
@group(0) @binding(5) var<storage, read> rules4: array<u32>;
@group(0) @binding(6) var<uniform> params: Params;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let mSize = params.mSize;
    if (global_id.x >= mSize || global_id.y >= mSize) {
        return;
    }

    let nSize = params.nSize;
    let radius = nSize / 2u;
    let flat_index = global_id.y * mSize + global_id.x;
    let currentState = gridIn[flat_index];

    if (params.enabled1 == 0u && params.enabled2 == 0u && params.enabled3 == 0u && params.enabled4 == 0u) {
        gridOut[flat_index] = currentState;
        return;
    }

    var validNeighbors1: u32 = 0;
    var validNeighbors2: u32 = 0;
    var validNeighbors3: u32 = 0;
    var validNeighbors4: u32 = 0;

    for (var dy: i32 = -i32(radius); dy <= i32(radius); dy = dy + 1) {
        for (var dx: i32 = -i32(radius); dx <= i32(radius); dx = dx + 1) {
            if (dx == 0 && dy == 0) { continue; }

            let neighborY = (i32(global_id.y) + dy + i32(mSize)) % i32(mSize);
            let neighborX = (i32(global_id.x) + dx + i32(mSize)) % i32(mSize);
            let neighbor_flat_index = u32(neighborY) * mSize + u32(neighborX);

            if (gridIn[neighbor_flat_index] == 1u) {
                let ruleY = u32(dy + i32(radius));
                let ruleX = u32(dx + i32(radius));
                let rule_flat_index = ruleY * nSize + ruleX;
                
                if (params.enabled1 == 1u && rules1[rule_flat_index] == 1u) { validNeighbors1 = validNeighbors1 + 1u; }
                if (params.enabled2 == 1u && rules2[rule_flat_index] == 1u) { validNeighbors2 = validNeighbors2 + 1u; }
                if (params.enabled3 == 1u && rules3[rule_flat_index] == 1u) { validNeighbors3 = validNeighbors3 + 1u; }
                if (params.enabled4 == 1u && rules4[rule_flat_index] == 1u) { validNeighbors4 = validNeighbors4 + 1u; }
            }
        }
    }

    var shouldSurvive: u32 = 0u;
    var shouldBeBorn: u32 = 0u;

    if (params.enabled1 == 1u) {
      if (currentState == 1u) {
        if (validNeighbors1 >= params.lowerStable1 && validNeighbors1 <= params.upperStable1) { shouldSurvive = 1u; }
      } else {
        if (validNeighbors1 >= params.lowerBorn1 && validNeighbors1 <= params.upperBorn1) { shouldBeBorn = 1u; }
      }
    }
    if (params.enabled2 == 1u) {
      if (currentState == 1u) {
        if (validNeighbors2 >= params.lowerStable2 && validNeighbors2 <= params.upperStable2) { shouldSurvive = 1u; }
      } else {
        if (validNeighbors2 >= params.lowerBorn2 && validNeighbors2 <= params.upperBorn2) { shouldBeBorn = 1u; }
      }
    }
    if (params.enabled3 == 1u) {
      if (currentState == 1u) {
        if (validNeighbors3 >= params.lowerStable3 && validNeighbors3 <= params.upperStable3) { shouldSurvive = 1u; }
      } else {
        if (validNeighbors3 >= params.lowerBorn3 && validNeighbors3 <= params.upperBorn3) { shouldBeBorn = 1u; }
      }
    }
    if (params.enabled4 == 1u) {
      if (currentState == 1u) {
        if (validNeighbors4 >= params.lowerStable4 && validNeighbors4 <= params.upperStable4) { shouldSurvive = 1u; }
      } else {
        if (validNeighbors4 >= params.lowerBorn4 && validNeighbors4 <= params.upperBorn4) { shouldBeBorn = 1u; }
      }
    }

    if (currentState == 1u) {
        gridOut[flat_index] = shouldSurvive;
    } else {
        gridOut[flat_index] = shouldBeBorn;
    }
}
`;

/**
 * Custom React hook for managing WebGPU-based cellular automaton simulation.
 * Initializes WebGPU resources, runs simulation steps with multiple rule sets,
 * reads the resulting grid, and handles reset. Supports square grids of size mSize x mSize
 * with configurable neighborhood size nSize (must be odd).
 *
 * @param mSize - Size of the square grid (e.g., 256 for 256x256).
 * @param nSize - Size of the neighborhood rule grid (e.g., 3 for Moore neighborhood).
 * @returns Object with methods: runSimulationStep, readGridData, resetSimulation, and isReady flag.
 */
export function useWebGPUSimulation(mSize: number, nSize: number) {
    // Refs to hold WebGPU objects and state, persisting across renders
    const refs = useRef<WebGPURefs>({
        device: null, pipeline: null, gridBufferA: null, gridBufferB: null,
        rulesBuffer1: null, rulesBuffer2: null, rulesBuffer3: null, rulesBuffer4: null,
        paramsBuffer: null, stagingBuffer: null, bindGroupA: null, bindGroupB: null,
        isDestroying: false,
    });
    
    // State to indicate if WebGPU resources are fully initialized
    const [isReady, setIsReady] = useState(false);
    // Tracks the number of simulation frames for ping-ponging between buffers
    const frameNum = useRef(0);

    /**
     * Initializes WebGPU resources: adapter, device, buffers, pipeline, and bind groups.
     * Called once on mount or when mSize/nSize changes.
     * Handles unsupported browser cases and sets isReady accordingly.
     */
    const init = useCallback(async () => {
        if (refs.current.device || refs.current.isDestroying) return; // Already initialized or destroying
        setIsReady(false);
        if (!navigator.gpu) {
            console.error("WebGPU not supported on this browser.");
            return;
        }
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            console.error("No appropriate GPUAdapter found.");
            return;
        }
        const device = await adapter.requestDevice();
        refs.current.device = device;
        
        // Calculate buffer sizes based on grid dimensions
        const gridSize = mSize * mSize;
        const ruleGridSize = nSize * nSize;
        
        // Create shader module from the WGSL code
        const shaderModule = device.createShaderModule({ code: shaderCode });
        // Create compute pipeline with automatic layout
        refs.current.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' },
        });

        // Buffer usage flags for grid (storage for compute, copy for transfer)
        const bufferUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
        // Two grid buffers for ping-pong (double buffering)
        refs.current.gridBufferA = device.createBuffer({ size: gridSize * Uint32Array.BYTES_PER_ELEMENT, usage: bufferUsage });
        refs.current.gridBufferB = device.createBuffer({ size: gridSize * Uint32Array.BYTES_PER_ELEMENT, usage: bufferUsage });

        // Rule buffers (read-only storage, copy destination for updates)
        const ruleBufferUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
        refs.current.rulesBuffer1 = device.createBuffer({ size: ruleGridSize * Uint32Array.BYTES_PER_ELEMENT, usage: ruleBufferUsage });
        refs.current.rulesBuffer2 = device.createBuffer({ size: ruleGridSize * Uint32Array.BYTES_PER_ELEMENT, usage: ruleBufferUsage });
        refs.current.rulesBuffer3 = device.createBuffer({ size: ruleGridSize * Uint32Array.BYTES_PER_ELEMENT, usage: ruleBufferUsage });
        refs.current.rulesBuffer4 = device.createBuffer({ size: ruleGridSize * Uint32Array.BYTES_PER_ELEMENT, usage: ruleBufferUsage });
        
        // Uniform buffer for parameters (grid sizes, rule thresholds, enable flags)
        refs.current.paramsBuffer = device.createBuffer({ size: 22 * Uint32Array.BYTES_PER_ELEMENT, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        // Staging buffer for reading back results to CPU (map-readable)
        refs.current.stagingBuffer = device.createBuffer({ size: gridSize * Uint32Array.BYTES_PER_ELEMENT, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });

        // Get bind group layout from pipeline
        const bindGroupLayout = refs.current.pipeline.getBindGroupLayout(0);
        
        // Helper to create common bind group entries (swaps input/output buffers)
        const commonEntries = (bufferA: GPUBuffer, bufferB: GPUBuffer) => [
            { binding: 0, resource: { buffer: bufferA } }, // Input grid
            { binding: 1, resource: { buffer: bufferB } }, // Output grid
            { binding: 2, resource: { buffer: refs.current.rulesBuffer1! } },
            { binding: 3, resource: { buffer: refs.current.rulesBuffer2! } },
            { binding: 4, resource: { buffer: refs.current.rulesBuffer3! } },
            { binding: 5, resource: { buffer: refs.current.rulesBuffer4! } },
            { binding: 6, resource: { buffer: refs.current.paramsBuffer! } }, // Uniform params
        ];
        // Two bind groups for ping-pong (A: gridA in, gridB out; B: gridB in, gridA out)
        refs.current.bindGroupA = device.createBindGroup({ layout: bindGroupLayout, entries: commonEntries(refs.current.gridBufferA!, refs.current.gridBufferB!) });
        refs.current.bindGroupB = device.createBindGroup({ layout: bindGroupLayout, entries: commonEntries(refs.current.gridBufferB!, refs.current.gridBufferA!) });
        
        setIsReady(true);
    }, [mSize, nSize]);

    // Effect to initialize on mount or dependency change, and clean up on unmount
    useEffect(() => {
        init();

        return () => {
            // Cleanup: Destroy resources if initialized
            if (refs.current.device) {
                refs.current.isDestroying = true;

                // Destroy buffers and pipeline
                Object.values(refs.current).forEach(item => {
                    if (item instanceof GPUBuffer || item instanceof GPUComputePipeline) {
                        try { (item as any).destroy(); } catch (e) { /* ignore */ }
                    }
                });
                // Destroy device last
                try { refs.current.device.destroy(); } catch(e) { /* ignore */ }

                // Reset refs
                refs.current = {
                    device: null, pipeline: null, gridBufferA: null, gridBufferB: null,
                    rulesBuffer1: null, rulesBuffer2: null, rulesBuffer3: null, rulesBuffer4: null,
                    paramsBuffer: null, stagingBuffer: null, bindGroupA: null, bindGroupB: null,
                    isDestroying: false,
                };
            }
        };
    }, [init]);
    
    /**
     * Runs one simulation step.  
     * Updates rule buffers and params, dispatches compute pass.
     * Uses ping-pong buffers based on frameNum.
     *
     * @param rulesData - Object containing rule grids and birth/survival parameters.
     */
    const runSimulationStep = useCallback(async (rulesData: RulesData): Promise<void> => {
        const { device, pipeline, rulesBuffer1, rulesBuffer2, rulesBuffer3, rulesBuffer4, paramsBuffer, bindGroupA, bindGroupB, isDestroying } = refs.current;
        if (!isReady || isDestroying || !device || !pipeline || !paramsBuffer || !bindGroupA || !bindGroupB) return;

        try {
            // Write rule grids to GPU buffers (flattened Uint32Arrays)
            device.queue.writeBuffer(rulesBuffer1!, 0, new Uint32Array(rulesData.n1));
            device.queue.writeBuffer(rulesBuffer2!, 0, new Uint32Array(rulesData.n2));
            device.queue.writeBuffer(rulesBuffer3!, 0, new Uint32Array(rulesData.n3));
            device.queue.writeBuffer(rulesBuffer4!, 0, new Uint32Array(rulesData.n4));

            // Pack parameters into uniform buffer: sizes + 4 rule sets (lower/upper stable/born + enable)
            const paramsArray = new Uint32Array([
                mSize, nSize,
                rulesData.b1.lowerStable, rulesData.b1.upperStable, rulesData.b1.lowerBorn, rulesData.b1.upperBorn, rulesData.e1,
                rulesData.b2.lowerStable, rulesData.b2.upperStable, rulesData.b2.lowerBorn, rulesData.b2.upperBorn, rulesData.e2,
                rulesData.b3.lowerStable, rulesData.b3.upperStable, rulesData.b3.lowerBorn, rulesData.b3.upperBorn, rulesData.e3,
                rulesData.b4.lowerStable, rulesData.b4.upperStable, rulesData.b4.lowerBorn, rulesData.b4.upperBorn, rulesData.e4,
            ]);
            device.queue.writeBuffer(paramsBuffer, 0, paramsArray);

            // Create and submit compute command
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(pipeline);
            // Select bind group based on frame parity (ping-pong)
            passEncoder.setBindGroup(0, (frameNum.current % 2 === 0) ? bindGroupA : bindGroupB);
            
            // Dispatch workgroups: ceil(mSize / workgroup_size=8) in x and y
            const workgroupCount = Math.ceil(mSize / 8);
            passEncoder.dispatchWorkgroups(workgroupCount, workgroupCount);
            passEncoder.end();
            device.queue.submit([commandEncoder.finish()]);

            frameNum.current++;
        } catch (e) { console.error("Error during simulation step:", e); }
    }, [mSize, nSize, isReady]);

    /**
     * Reads the current grid state back to CPU as Uint8Array (0/1 per cell, flattened).
     * Copies from the output buffer (based on frameNum parity) to staging buffer and maps it.
     * Unmaps staging buffer after reading.
     *
     * @returns Promise<Uint8Array | null> - Flattened grid data or null on error.
     */
    const readGridData = useCallback(async (): Promise<Uint8Array | null> => {
        const { device, stagingBuffer, gridBufferA, gridBufferB, isDestroying } = refs.current;
        if (!isReady || isDestroying || !device || !stagingBuffer || !gridBufferA || !gridBufferB) return null;

        try {
            const gridSizeInBytes = mSize * mSize * Uint32Array.BYTES_PER_ELEMENT;
            // Select the output buffer based on frame parity
            const currentResultBuffer = (frameNum.current % 2 === 0) ? gridBufferA : gridBufferB;

            // Copy buffer to staging
            const commandEncoder = device.createCommandEncoder();
            commandEncoder.copyBufferToBuffer(currentResultBuffer, 0, stagingBuffer, 0, gridSizeInBytes);
            device.queue.submit([commandEncoder.finish()]);

            // Map staging buffer for reading and copy to Uint32Array
            await stagingBuffer.mapAsync(GPUMapMode.READ, 0, gridSizeInBytes);
            const copyArrayBuffer = stagingBuffer.getMappedRange(0, gridSizeInBytes);
            const data = new Uint32Array(copyArrayBuffer.slice(0));
            stagingBuffer.unmap();

            // Convert to Uint8Array (assuming 0/1 values fit)
            return new Uint8Array(data);
        } catch (e) {
            console.error("Error reading grid data:", e);
            return null;
        }
    }, [mSize, isReady]);

    /**
     * Resets both grid buffers to the provided initial state (Uint8Array, flattened 0/1).
     * Converts to Uint32Array for buffer write and resets frame counter.
     *
     * @param newGrid - Initial grid state as flattened Uint8Array (mSize * mSize elements).
     */
    const resetSimulation = useCallback(async (newGrid: Uint8Array) => {
        const { device, gridBufferA, gridBufferB, isDestroying } = refs.current;
        if (!isReady || isDestroying || !device || !gridBufferA || !gridBufferB) return;
        
        // Convert input to Uint32 for buffer compatibility
        const gridData = new Uint32Array(newGrid);
        device.queue.writeBuffer(gridBufferA, 0, gridData);
        device.queue.writeBuffer(gridBufferB, 0, gridData);
        frameNum.current = 0; // Reset frame counter
    }, [isReady]);

    return { runSimulationStep, readGridData, resetSimulation, isReady };
}