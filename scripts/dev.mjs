import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const backendDir = path.join(rootDir, 'backend');
const mobileDir = path.join(rootDir, 'mobile');
const isWindows = process.platform === 'win32';
const rootPython = isWindows
  ? path.join(rootDir, '.venv', 'Scripts', 'python.exe')
  : path.join(rootDir, '.venv', 'bin', 'python');
let isShuttingDown = false;
const mode = process.argv[2] ?? 'both';

function shouldSuppressLogLine(line) {
  return /\/api\//.test(line) || /127\.0\.0\.1:0 -/.test(line) || /Updated market prices|Generated sentiment data/.test(line);
}

function wireFilteredOutput(child, name) {
  let stdoutBuffer = '';
  let stderrBuffer = '';

  const writeLine = (stream, line) => {
    if (!line) {
      return;
    }

    if (shouldSuppressLogLine(line)) {
      return;
    }

    stream.write(line + '\n');
  };

  child.stdout?.on('data', (chunk) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? '';

    for (const line of lines) {
      writeLine(process.stdout, line);
    }
  });

  child.stderr?.on('data', (chunk) => {
    stderrBuffer += chunk.toString();
    const lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop() ?? '';

    for (const line of lines) {
      writeLine(process.stderr, line);
    }
  });

  child.on('close', () => {
    writeLine(process.stdout, stdoutBuffer);
    writeLine(process.stderr, stderrBuffer);
    stdoutBuffer = '';
    stderrBuffer = '';
  });
}

function getBackendCommand() {
  const localVenvCommand = isWindows
    ? path.join(backendDir, 'venv', 'Scripts', 'uvicorn.exe')
    : path.join(backendDir, 'venv', 'bin', 'uvicorn');

  if (existsSync(localVenvCommand)) {
    return { command: localVenvCommand, args: ['main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'] };
  }

  const pythonExecutable = existsSync(rootPython) ? rootPython : 'python';
  return { command: pythonExecutable, args: ['-m', 'uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'] };
}

function getFrontendCommand() {
  const localNextCommand = isWindows
    ? path.join(rootDir, 'node_modules', '.bin', 'next.cmd')
    : path.join(rootDir, 'node_modules', '.bin', 'next');

  if (existsSync(localNextCommand)) {
    if (isWindows) {
      return {
        command: 'cmd',
        args: ['/d', '/s', '/c', localNextCommand, 'dev', '--hostname', '0.0.0.0'],
        options: { cwd: rootDir },
      };
    }

    return {
      command: localNextCommand,
      args: ['dev', '--hostname', '0.0.0.0'],
      options: { cwd: rootDir },
    };
  }

  return {
    command: 'next',
    args: ['dev', '--hostname', '0.0.0.0'],
    options: { cwd: rootDir },
  };
}

function getMobileCommand() {
  if (isWindows) {
    return {
      command: 'cmd',
      args: ['/d', '/s', '/c', 'npm', 'run', 'start'],
      options: { cwd: mobileDir },
    };
  }

  return {
    command: 'npm',
    args: ['run', 'start'],
    options: { cwd: mobileDir },
  };
}

function startProcess(name, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  wireFilteredOutput(child, name);

  child.on('exit', (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    if (signal || (typeof code === 'number' && code !== 0)) {
      shutdown(code ?? 1);
    } else {
      shutdown(0);
    }
  });

  child.on('error', (error) => {
    console.error(`[${name}] failed to start:`, error.message);
    shutdown(1);
  });

  return child;
}

const processes = [];

if (mode === 'both' || mode === 'frontend') {
  const frontendCommand = getFrontendCommand();
  processes.push(startProcess('frontend', frontendCommand.command, frontendCommand.args, frontendCommand.options));
}

if (mode === 'both' || mode === 'backend') {
  const backendCommand = getBackendCommand();
  processes.push(startProcess('backend', backendCommand.command, backendCommand.args, { cwd: backendDir }));
}

if (mode === 'mobile' || mode === 'backend-mobile') {
  const mobileCommand = getMobileCommand();
  processes.push(startProcess('mobile', mobileCommand.command, mobileCommand.args, mobileCommand.options));
}

if (mode === 'backend-mobile') {
  const backendCommand = getBackendCommand();
  processes.push(startProcess('backend', backendCommand.command, backendCommand.args, { cwd: backendDir }));
}

if (processes.length === 0) {
  console.error(`Unknown mode: ${mode}`);
  process.exitCode = 1;
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  process.exitCode = exitCode;

  for (const child of processes) {
    if (child.pid && !child.killed) {
      child.kill();
    }
  }
}

process.on('SIGINT', () => {
  shutdown(0);
});

process.on('SIGTERM', () => {
  shutdown(0);
});