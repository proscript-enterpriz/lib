import { defineConfig } from 'tsup';

export default defineConfig({
	format: ['cjs', 'esm'],
	entry: ['./src/index.ts'],
	dts: true,
	shims: true,
	skipNodeModulesBundle: true,
	clean: true,
	minify: true,
	minifyWhitespace: true,
	minifyIdentifiers: true,
	minifySyntax: true,
	treeshake: true,
});