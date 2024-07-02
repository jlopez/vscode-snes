import { Library, types } from "ffi-napi";

interface AsarLib {
    asar_version: () => number;
    asar_apiversion: () => number;
    asar_reset: () => boolean;
}

export class Asar {
    private lib?: AsarLib;

    public init(libPath: string) {
        // Define the function signatures from your .dylib
        // For example, if you have a function `int add(int, int)` in your .dylib
        this.lib = new Library(libPath, {
            'asar_version': [ types.int, [ ] ],
            'asar_apiversion': [ types.int, [ ] ],
            'asar_reset': [ types.bool, [ ] ],
        });
    }

    public getVersion() {
        return this.lib?.asar_version();
    }

    public getApiVersion() {
        return this.lib?.asar_apiversion();
    }

    public reset() {
        return this.lib?.asar_reset();
    }
}