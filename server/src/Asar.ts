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

const asarLibraryDefinition = libraryDefinition({
    'asar_version': [ types.int, [ ] ],
    'asar_apiversion': [ types.int, [ ] ],
    'asar_reset': [ types.bool, [ ] ],
    'asar_patch': [ types.bool, [ ref.refType(NativePatchParams) ] ],
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
}