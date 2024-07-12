declare module 'bindings' {
    export default function bindings(name: 'asar'): { Asar: Asar };

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

    export interface Asar {
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

    export const Asar: Asar;
}

