import Asar, { type Problem } from "./index";

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
dumpProblems(Asar.errors);
dumpProblems(Asar.warnings);
Asar.output.forEach((line, i) => {
    console.log("%s. %s", i + 1, line);
});
// Asar.labels.forEach((label, i) => {
//     console.log("%s. %s: %s", i + 1, label.name, label.location);
// });
Asar.defines.forEach((define, i) => {
    console.log("%s. %s: %s", i + 1, define.name, define.value);
});

function dumpProblems(errors: Problem[]) {
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
}