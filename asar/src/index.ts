import bindings from 'bindings';

const { Asar } = bindings('asar');

console.log(Asar.version); // returns number
console.log(Asar.apiVersion); // returns number
console.log(Asar.reset()); // returns true
