declare module 'bindings' {
    export default function bindings(name: 'asar'): { Asar: Asar };

    export interface PatchOptions {
        assemblyPath: string;
        romSizeHint?: number;
        defines?: Record<string, string>;
    }

    export interface StackEntry {
        fullPath: string;
        prettyPath: string;
        lineNumber: number;
        details: string;
    }

    export interface Error {
        fullError: string;
        rawError: string;
        block: string;
        filename: string;
        line: number;
        stackEntries: StackEntry[];
        errorName: string;
    }

    export interface Asar {
        version: number;
        apiVersion: number;
        reset: () => boolean;
        patch: (options: PatchOptions) => boolean;
        maxRomSize: number;
        errors: Error[];
    }

    export const Asar: Asar;
}

