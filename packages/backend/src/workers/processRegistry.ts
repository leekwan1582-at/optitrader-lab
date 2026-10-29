import type { ChildProcess } from 'node:child_process';
import { logger } from '../logger.js';

interface TrackedProcess {
  runId: string;
  child: ChildProcess;
  startedAt: Date;
  logs: Array<{ timestamp: Date; level: string; message: string }>;
}

export class ProcessRegistry {
  private activeProcesses = new Map<string, TrackedProcess>();
  private runLogs = new Map<string, Array<{ timestamp: Date; level: string; message: string }>>();

  /**
   * Registers an active child process for a run.
   */
  register(runId: string, child: ChildProcess): void {
    const logs = this.runLogs.get(runId) || [];
    this.runLogs.set(runId, logs);

    this.activeProcesses.set(runId, {
      runId,
      child,
      startedAt: new Date(),
      logs,
    });

    this.appendLog(runId, 'info', `Optimization process spawned (PID: ${child.pid ?? 'unknown'}).`);

    child.on('exit', (code, signal) => {
      this.activeProcesses.delete(runId);
      this.appendLog(
        runId,
        code === 0 ? 'info' : 'warning',
        `Process exited with code ${code ?? 'none'}${signal ? ` (signal: ${signal})` : ''}.`
      );
    });
  }

  /**
   * Appends an in-memory diagnostic log entry for a run.
   */
  appendLog(runId: string, level: string, message: string): void {
    let logs = this.runLogs.get(runId);
    if (!logs) {
      logs = [];
      this.runLogs.set(runId, logs);
    }
    // Cap memory logs at 200 lines per run
    if (logs.length >= 200) {
      logs.shift();
    }
    logs.push({
      timestamp: new Date(),
      level,
      message,
    });
  }

  /**
   * Retrieves diagnostic logs for a given run ID.
   */
  getLogs(runId: string): Array<{ timestamp: Date; level: string; message: string }> {
    return this.runLogs.get(runId) || [];
  }

  /**
   * Checks whether a run is currently active.
   */
  has(runId: string): boolean {
    return this.activeProcesses.has(runId);
  }

  /**
   * Gracefully terminates a process by runId: SIGTERM, then SIGKILL after 2s if still running.
   */
  async cancel(runId: string, reason = 'User requested cancellation'): Promise<boolean> {
    const tracked = this.activeProcesses.get(runId);
    if (!tracked) {
      return false;
    }

    const { child } = tracked;
    this.appendLog(runId, 'warning', `Cancelling process: ${reason}`);

    if (child.killed || child.exitCode !== null) {
      this.activeProcesses.delete(runId);
      return true;
    }

    child.kill('SIGTERM');

    return new Promise<boolean>((resolve) => {
      const killTimer = setTimeout(() => {
        if (!child.killed && child.exitCode === null) {
          logger.warn(`Process for run ${runId} did not exit after SIGTERM, sending SIGKILL.`);
          child.kill('SIGKILL');
        }
        this.activeProcesses.delete(runId);
        resolve(true);
      }, 2000);

      child.once('exit', () => {
        clearTimeout(killTimer);
        this.activeProcesses.delete(runId);
        resolve(true);
      });
    });
  }

  /**
   * Shuts down all active processes on server termination.
   */
  async shutdownAll(): Promise<void> {
    const promises = Array.from(this.activeProcesses.keys()).map((runId) =>
      this.cancel(runId, 'Server shutting down')
    );
    await Promise.all(promises);
  }
}

export const processRegistry = new ProcessRegistry();

