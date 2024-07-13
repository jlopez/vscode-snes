import bindings from 'bindings';

export interface PatchOptions {
    assemblyPath: string;
    romSizeHint?: number;
    includePaths?: string[];
    defines?: Record<string, string>;
    stdIncludesPath?: string;
    stdDefinesPath?: string;
    generateChecksum?: boolean;
    fullCallStack?: boolean;
}

export interface StackEntry {
    fullPath: string;
    prettyPath: string;
    lineNumber: number;
    details: string;
}

export interface Problem {
    fullError: string;
    rawError: string;
    block: string;
    filename: string;
    line: number;
    stackEntries: StackEntry[];
    errorName: string;
}

export interface Label {
    name: string;
    location: number;
}

export interface Define {
    name: string;
    value: string;
}

export interface AsarAPI {
    version: number;
    apiVersion: number;
    reset: () => boolean;
    patch: (options: PatchOptions) => boolean;
    maxRomSize: number;
    errors: Problem[];
    warnings: Problem[];
    output: string[];
    labels: Label[];
    defines: Define[];
}

const bindingObject = bindings('asar');

const Asar: AsarAPI = bindingObject.Asar;

export default Asar;