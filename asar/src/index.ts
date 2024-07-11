const { Example } = require('bindings')('asar');

const example = new Example(11);
console.log(example.GetValue());
// It prints 11
example.SetValue(19);
console.log(example.GetValue());
// It prints 19