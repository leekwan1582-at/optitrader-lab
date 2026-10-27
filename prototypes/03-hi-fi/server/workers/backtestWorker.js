import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AppError } from '../utils/errors.js';

const ENGINE_SCRIPT = fileURLToPath(new URL('../../engine/backtest.py', import.meta.url));
const PYTHON_CANDIDATES = [
  fileURLToPath(new URL('../../engine/.venv/bin/python', import.meta.url)),
  fileURLToPath(new URL('../../../../.venv/bin/python', import.meta.url)),
  'python3.11',
  'python3',
];

let cachedPython = null;

function resolvePythonExecutable() {
  if (cachedPython) return cachedPython;

  const executable = PYTHON_CANDIDATES.find((candidate) => (
    candidate.includes('/') ? existsSync(candidate) : true
  ));

  if (!executable) {
    throw new AppError('No Python interpreter is available for the backtest engine.', 500, 'PYTHON_NOT_FOUND');
  }

  cachedPython = executable;
  return executable;
}

function parseEngineError(stderr) {
  const text = String(stderr || '').trim();
  if (!text) return 'The Python engine exited without an error message.';
  const lines = text.split('\n');
  const jsonLine = [...lines].reverse().find((line) => line.trim().startsWith('{'));
  if (jsonLine) {
    try {
      const parsed = JSON.parse(jsonLine);
      if (parsed.error) return parsed.error;
    } catch {
      // Fall through to the plain-text error below.
    }
  }
  return lines[lines.length - 1];
}

export function runBacktest({ csvPath, config, timeoutMs = 120000 }) {
  return new Promise((resolve, reject) => {
    if (!existsSync(ENGINE_SCRIPT)) {
      reject(new AppError('Backtest engine script not found.', 500, 'ENGINE_NOT_FOUND'));
      return;
    }

    let pythonExecutable;
    try {
      pythonExecutable = resolvePythonExecutable();
    } catch (error) {
      reject(error);
      return;
    }

    const child = spawn(pythonExecutable, [ENGINE_SCRIPT, csvPath, JSON.stringify(config)], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      const error = new AppError(`Optimization exceeded ${Math.round(timeoutMs / 1000)}s.`, 504, 'TIMEOUT');
      reject(error);
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new AppError(`Unable to start the Python engine: ${error.message}`, 500, 'ENGINE_START_FAILED'));
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        reject(new AppError(parseEngineError(stderr), 500, 'ENGINE_ERROR'));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) {
          reject(new AppError(result.error, 500, 'ENGINE_ERROR'));
          return;
        }
        resolve(result);
      } catch {
        reject(new AppError('The Python engine returned invalid JSON.', 500, 'ENGINE_INVALID_OUTPUT'));
      }
    });
  });
}
