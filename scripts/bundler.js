import { build } from 'esbuild';
import { globSync } from 'glob';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';

const entryPoints = globSync('src/client/*.{ts,tsx}');

await build({
  entryPoints,
  bundle: true,
  outdir: 'public',
  outbase: 'src/client',
  platform: 'browser',
  format: 'esm',
  target: ['es2022'],
  sourcemap: !isProd,
  minify: isProd,
  absWorkingDir: path.resolve('.'), // クライアント外のimportを防ぐ補助
});

console.log(`✅ Client build complete (${isProd ? 'production' : 'development'} mode)`);
