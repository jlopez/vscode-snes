declare module 'bindings' {
    export default function bindings(name: 'asar'): { Asar: Asar };

    export interface Asar {
        version: number;
        apiVersion: number;
        reset: () => boolean;
    }

    export const Asar: Asar;
}

