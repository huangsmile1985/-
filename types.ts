
export interface CompoundInfo {
  name: string;
  pka: string;
  structureInfo: string; // Changed from logp to be more general
  column: string;
}

export interface NumericalVariable {
  id: number;
  name: string;
  low: string;
  high: string;
}

export interface CategoricalVariable {
  id: number;
  name: string;
  options: string; // Comma-separated
}

export interface Experiment {
  run: number;
  conditions: { [key: string]: string | number };
  tr1: number;
  w1: number;
  tr2: number;
  w2: number;
  asymmetry: number;
  rs: number;
}

export interface PlanGenerationParams {
  compoundInfo: CompoundInfo;
  numericalVariables: NumericalVariable[];
  categoricalVariables: CategoricalVariable[];
  experimentCount: number;
}


export interface AnalysisParams {
  compoundInfo: CompoundInfo;
  numericalVariables: NumericalVariable[];
  categoricalVariables: CategoricalVariable[];
  experiments: Experiment[];
}

// Analysis result is now a simple markdown string
export type AnalysisResult = string;
