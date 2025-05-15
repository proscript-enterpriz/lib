import { defineConfig } from 'tsup';

export default defineConfig({
  format: ['cjs', 'esm'],
  entry: ['./src/index.ts', './src/utils.ts', './src/services/index.ts'],
  dts: true,
  shims: true,
  skipNodeModulesBundle: true,
  clean: true,
  minify: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  treeshake: true,
  outExtension: (ctx) => {
    if (ctx.format === 'esm') {
      return { js: '.mjs' }; // explicitly set .mjs extension for ESM
    }
    return { js: '.cjs' }; // keep .cjs extension for CommonJS
  },
});
