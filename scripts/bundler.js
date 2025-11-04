import { build, context } from 'esbuild';
import { globSync } from 'glob';
import path from 'path';

const isWatch = process.argv.includes('--watch');
const isProd = process.env.NODE_ENV === 'production';

const entryPoints = globSync('src/client/*.{ts,tsx}');
const options = {
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
};

await build(options);
console.log('✅ Client build complete');

if (isWatch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('👀 Watching client bundle...');
}
