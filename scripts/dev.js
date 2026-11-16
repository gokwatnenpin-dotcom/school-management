import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [
  { name: 'api', args: ['--prefix', 'server', 'run', 'dev'] },
  { name: 'web', args: ['--prefix', 'client', 'run', 'dev'] },
].map(({ name, args }) => {
  const child = spawn(npm, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });
  return child;
});

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) child.kill('SIGINT');
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
