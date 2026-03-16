import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  COVERAGE_THRESHOLD_STATEMENTS: '100',
  COVERAGE_THRESHOLD_BRANCHES: '100',
  COVERAGE_THRESHOLD_FUNCTIONS: '100',
  COVERAGE_THRESHOLD_LINES: '100',
};

const child = spawn('pnpm', ['test:coverage'], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

child.on('close', (code, signal) => {
  if (signal) {
    console.error(`Coverage negative check interrupted by signal: ${signal}`);
    process.exit(1);
  }

  if (code === 0) {
    console.error('Expected coverage gate failure, but test:coverage passed.');
    process.exit(1);
  }

  console.warn(`Coverage gate failed as expected with exit code ${code}.`);
  process.exit(0);
});
