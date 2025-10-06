import { ChangeEventHandler, Dispatch, SetStateAction } from "react";

export interface WebGPURefs {
  device: GPUDevice | null;
  pipeline: GPUComputePipeline | null;
  gridBufferA: GPUBuffer | null;
  gridBufferB: GPUBuffer | null;
  rulesBuffer1: GPUBuffer | null;
  rulesBuffer2: GPUBuffer | null;
  rulesBuffer3: GPUBuffer | null;
  rulesBuffer4: GPUBuffer | null;
  paramsBuffer: GPUBuffer | null;
  stagingBuffer: GPUBuffer | null;
  bindGroupA: GPUBindGroup | null;
  bindGroupB: GPUBindGroup | null;
  isDestroying: boolean;
}

export interface Boundaries {
  lowerStable: number;
  upperStable: number;
  lowerBorn: number;
  upperBorn: number;
}

export interface MaskProps {
  initialGrid: Uint8Array;
  setGlobalGrid: Dispatch<SetStateAction<Uint8Array<ArrayBufferLike>>>;
  setGlobalBoundaries: Dispatch<SetStateAction<Boundaries>>;
  boundaries: Boundaries;
  size: number;
  enabled: boolean;
  setEnabled: Dispatch<SetStateAction<boolean>>;
}

export interface RulesData {
  n1: Uint8Array; 
  n2: Uint8Array; 
  n3: Uint8Array; 
  n4: Uint8Array;
  b1: Boundaries;
  b2: Boundaries;
  b3: Boundaries;
  b4: Boundaries;
  e1: number; 
  e2: number; 
  e3: number; 
  e4: number;
}

export interface BoundaryInputProps {
  value: number;
  onChange: ChangeEventHandler<HTMLInputElement> | undefined
}

export interface DrawGridDataProps {
  canvas: HTMLCanvasElement | null;
  imageData: ImageData | null | undefined;
}

export interface DrawSimulationProps {
  canvas: HTMLCanvasElement | null;
  imageData: ImageData | null | undefined;
  grid: Uint8Array;
}

export interface ResetSimulationProps {
  canvas: HTMLCanvasElement | null;
  imageData: ImageData | null | undefined;
  grid: Uint8Array;
}

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSection: HelpSectionValues;
  onSectionChange: (section: HelpSectionValues) => void;
}

export type HelpSectionValues = "overview" | "simulation" | "masks" | "rules" | "examples" | "performance";