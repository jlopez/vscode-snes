import { Asar } from './Asar';

const asar = new Asar();

// Define the path to your .dylib file
const dylibPath = '/Users/jlopez/IdeaProjects/personal/asar/asar/lib/libasar.dylib';
asar.init(dylibPath);
console.log('Asar Version: %d', asar.getVersion());
const rv = asar.patch({
	assemblyPath: '/Users/jlopez/IdeaProjects/personal/SMWDisX/smw.asm',
	romSizeHint: 524_288,
	defines: {
		'_VER': '1',
	}
});
console.log('patch result: %o', rv);
