import type { Request, Response } from 'express';
import ErrorLog from '../models/ErrorLog.js';
import Workspace from '../models/Workspace.js';

export async function workspace(request: Request, response: Response): Promise<void> {
  const workspace = await Workspace.findOne({ user: request.user!.id })
    || { name: request.user!.workspaceName, owner: request.user!.name };
  response.json(workspace);
}

export async function errorLogs(request: Request, response: Response): Promise<void> {
  const logs = await ErrorLog.find({ owner: request.user!.id }).sort({ timestamp: -1 }).limit(50);
  response.json(logs);
}

export async function health(_request: Request, response: Response): Promise<void> {
  response.json({ status: 'ok', uptime: process.uptime() });
}
