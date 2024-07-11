import bindings from 'bindings';

const { Asar } = bindings('asar');

console.log(Asar.version); // returns number
console.log(Asar.apiVersion); // returns number
console.log(Asar.reset()); // returns true
console.log(Asar.maxRomSize);
console.log(Asar.patch({
    assemblyPath: '/Users/jlopez/IdeaProjects/personal/SMWDisX/smw.asm',
    defines: {
        _VER: '1',
    },
}));
const errors = Asar.errors;
errors.forEach((error) => {
    console.log(error.fullError);
    console.log(error.rawError);
    console.log(error.block);
    console.log(error.filename);
    console.log(error.line);
    error.stackEntries.forEach((stackEntry) => {
        console.log(stackEntry.fullPath);
        console.log(stackEntry.prettyPath);
        console.log(stackEntry.lineNumber);
        console.log(stackEntry.details);
    });
    console.log(error.errorName);
});