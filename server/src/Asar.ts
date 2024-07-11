import { Library, LibraryObject, LibraryObjectDefinitionBase, LibraryObjectDefinitionInferenceMarker, LibraryObjectDefinitionToLibraryDefinition, types } from "ffi-napi";
import ref, { UnderlyingType } from 'ref-napi';
import struct from 'ref-struct-di';
import array from 'ref-array-di';

const StructType = struct(ref);
const ArrayType = array(ref);

function libraryDefinition<T extends LibraryObjectDefinitionBase | LibraryObjectDefinitionInferenceMarker>(
    libraryDefinition: T,
): T {
    return libraryDefinition;
}

const MemoryBuffer = ArrayType(ref.types.uint8);

const NativeDefineData = StructType({
    name: types.CString,
    contents: types.CString,
});

const NativeDefineDataArray = ArrayType(NativeDefineData);

const NativePatchParams = StructType({
    // The size of this struct. Set to (int)sizeof(patchparams).
    structsize: types.int32,

    // Same parameters as asar_patch()
    patchloc: types.CString,
    romdata: MemoryBuffer,
    buflen: types.int32,
    romlen: ref.refType(ref.types.uint64),

    // Include paths to use when searching files.
    includepaths: ref.refType(ref.types.void),
    numincludepaths: types.int32,

    // A list of additional defines to make available to the patch.
    additional_defines: NativeDefineDataArray,
    additional_define_count: types.int32,

    // Path to a text file to parse standard include search paths from.
    // Set to NULL to not use any standard includes search paths.
    stdincludesfile: types.CString,

    // Path to a text file to parse standard include search paths from.
    // Set to NULL to not use any standard includes search paths.
    stddefinesfile: types.CString,

    // A list of warnings to enable or disable.
    // Specify warnings in the format "WXXXX" where XXXX = warning ID.
    warning_settings: ref.refType(ref.types.void),
    warning_setting_count: types.int32,

    // List of memory files to create on the virtual filesystem.
    memory_files: ref.refType(ref.types.void),
    memory_file_count: types.int32,

    // Set override_checksum_gen to true and generate_checksum to true/false
    // to force generating/not generating a checksum.
    override_checksum_gen: types.bool,
    generate_checksum: types.bool,

    // Set this to true for generated error and warning texts to always
    // contain their full call stack
    full_call_stack: types.bool,
});

type PatchParams = UnderlyingType<typeof NativePatchParams>;

const NativeStackEntry = StructType({
    fullpath: types.CString,
    prettypath: types.CString,
    lineno: types.int32,
    details: types.CString,
});

const NativeStackEntryArray = ArrayType(NativeStackEntry);

const manual = true;

const NativeErrorData = StructType({
    fullerrdata: types.int64,
    rawerrdata: types.int64,
    block: types.int64,
    filename: types.int64,
    line: types.int32,
    callstack: types.int64,
    callstacksize: types.int32,
    errname: types.int64,
});

interface CallStack {
    fullPath?: string;
    prettyPath?: string;
    lineNo: number;
    details?: string;
};

interface ErrorData {
    fullErrorData?: string;
    rawErrorData?: string;
    block?: string;
    filename?: string;
    line: number;
    callStack: CallStack[];
    errorName?: string;
}

const NativeErrorDataArray = ArrayType(NativeErrorData);

const asarLibraryDefinition = libraryDefinition({
    'asar_version': [ types.int, [ ] ],
    'asar_apiversion': [ types.int, [ ] ],
    'asar_reset': [ types.bool, [ ] ],
    'asar_patch': [ types.bool, [ ref.refType(NativePatchParams) ] ],
    /* Returns the maximum possible size of the output ROM from asar_patch().
     * Giving this size to buflen guarantees you will not get any buffer too small
     * errors; however, it is safe to give smaller buffers if you don't expect any
     * ROMs larger than 4MB or something.
     */
    'asar_maxromsize': [ types.int, [ ] ],
    /* Get a list of all errors.
     * All pointers from these functions are valid only until the same function is
     * called again, or until asar_patch, asar_reset or asar_close is called,
     * whichever comes first. Copy the contents if you need it for a longer time.
     */
    'asar_geterrors': [ ref.refType(NativeErrorData), [ ref.refType(ref.types.uint32) ] ],
});

type AsarLibrary = LibraryObject<LibraryObjectDefinitionToLibraryDefinition<typeof asarLibraryDefinition>>;

export interface PatchOptions {
    assemblyPath: string;
    romSizeHint?: number;
    defines?: Record<string, string>;
}

export class Asar {
    private lib?: AsarLibrary;

    public init(libPath: string) {
        // Define the function signatures from your .dylib
        // For example, if you have a function `int add(int, int)` in your .dylib
        this.lib = new Library(libPath, asarLibraryDefinition);
    }

    /* Returns the version, in the format major*10000+minor*100+bugfix*1. This
     * means that 1.2.34 would be returned as 10234.
     */
    public getVersion() {
        return this.lib?.asar_version();
    }

    /* Returns the API version, format major*100+minor. Minor is incremented on
     * backwards compatible changes; major is incremented on incompatible changes.
     * Does not have any correlation with the Asar version.
     *
     * It's not very useful directly, since asar_init() verifies this automatically.
     * Calling this one also sets a flag that makes asar_init not instantly return
     * false; this is so programs expecting an older API won't do anything unexpected.
     */
    public getApiVersion() {
        return this.lib?.asar_apiversion();
    }

    /* Clears out all errors, warnings and printed statements, and clears the file
     * cache. Not really useful, since asar_patch() already does this.
     */
    public reset() {
        return this.lib?.asar_reset();
    }

    /* Applies a patch. The first argument is a filename (so Asar knows where to
     * look for incsrc'd stuff); however, the ROM is in memory.
     * This function assumes there are no headers anywhere, neither in romdata nor
     * the sizes. romlen may be altered by this function; if this is undesirable,
     * set romlen equal to buflen.
     * The return value is whether any errors appeared (false=errors, call
     * asar_geterrors for details). If there is an error, romdata and romlen will
     * be left unchanged.
     * See the documentation of struct patchparams for more information.
     */
    public patch(options: PatchOptions) {
        const romdata = new MemoryBuffer(options.romSizeHint ?? 1_048_576);
        const romlen = ref.alloc(ref.types.uint32, romdata.length);
        const patchParams: Partial<PatchParams> = {
            structsize: 120,
            patchloc: options.assemblyPath,
            romdata,
            buflen: romdata.length,
            romlen,
        };
        if (options.defines) {
            const entries = Object.entries(options.defines);
            const additionalDefines = new NativeDefineDataArray(entries.length);
            entries.forEach(([name, contents], i) => {
                additionalDefines[i] = new NativeDefineData({ name, contents });
            });
            patchParams.additional_defines = additionalDefines;
            patchParams.additional_define_count = additionalDefines.length;
        }
        const nativePatchParams = new NativePatchParams(patchParams);
        return this.lib?.asar_patch(nativePatchParams.ref());
    }

    /* Returns the maximum possible size of the output ROM from asar_patch().
     * Giving this size to buflen guarantees you will not get any buffer too small
     * errors; however, it is safe to give smaller buffers if you don't expect any
     * ROMs larger than 4MB or something.
     */
    public getMaxRomSize() {
        return this.lib?.asar_maxromsize();
    }

    /* Get a list of all errors.
     * All pointers from these functions are valid only until the same function is
     * called again, or until asar_patch, asar_reset or asar_close is called,
     * whichever comes first. Copy the contents if you need it for a longer time.
     */
    public getErrors() {
        const errorCountPtr = ref.alloc(ref.types.uint32, 0);
        const ptr = this.lib?.asar_geterrors(errorCountPtr);
        const ts0 = Date.now();
        const errorCount = errorCountPtr.deref();
        const memory = ptr?.reinterpret(NativeErrorData.size * errorCount) as Buffer;
        console.log("%s: memory for %d errors", Date.now() - ts0, errorCount);
        const nativeErrors = new NativeErrorDataArray(memory, errorCount);
        let arr = [0, 0, 0, 0];
        for (let i = 0; i < errorCount; i++) {
            const nativeError = nativeErrors[i];
            if (manual) {
                let ts1 = Date.now();
                const buf: Buffer = (nativeError as any)['ref.buffer'];
                arr[0] += Date.now() - ts1, ts1 = Date.now();
                const _buf = ref.readPointer(buf, 0);
                arr[1] += Date.now() - ts1, ts1 = Date.now();
                const flag = ref.isNull(_buf);
                arr[2] += Date.now() - ts1, ts1 = Date.now();
                const str = flag ? undefined : ref.readCString(_buf, 0);
                arr[3] += Date.now() - ts1, ts1 = Date.now();
            } else {
                nativeError.toObject();
            }
        }
        console.log("%s: iterate errors", Date.now() - ts0);
        console.log(arr);
        // const nativeErrors = new NativeErrorDataArray(memory, errorCount);
        // const errors: ErrorData[] = [];
        // const callStackField = NativeErrorData.fields['callstack'];
        // for (let i = 0; i < errorCount; i++) {
        //     const ts0 = Date.now();
        //     console.log("Processing error %d/%d", i + 1, errorCount);
        //     const nativeError = nativeErrors[i];
        //     const nativeErrorBuffer: Buffer = (nativeError as any)['ref.buffer'];
        //     const arraySize = nativeError.callstacksize * NativeStackEntry.size;
        //     const nativeCallStack = new NativeStackEntryArray(nativeErrorBuffer.readPointer(callStackField.offset, arraySize), nativeError.callstacksize);
        //     console.log("  %s:   nativeCallStack", Date.now() - ts0);
        //     const callStack: CallStack[] = nativeCallStack.toArray().map((entry) => entry.toObject());
        //     console.log("  %s:   nativeCallStack conversion", Date.now() - ts0);
        //     const error = {
        //         fullErrorData: nativeError.fullerrdata ?? undefined,
        //         rawErrorData: nativeError.rawerrdata ?? undefined,
        //         block: nativeError.block ?? undefined,
        //         filename: nativeError.filename ?? undefined,
        //         line: nativeError.line,
        //         callStack,
        //         errorName: nativeError.errname ?? undefined,
        //     };
        //     console.log("  %s:   nativeError conversion", Date.now() - ts0);
        //     errors.push(error);
        //     console.log("  %s:   error push", Date.now() - ts0);
        // }
        // return errors;
    }
}