import type { Request, Response } from 'express';
import { currentUser } from '../utils/authContext.js';
import ErrorLog from '../models/ErrorLog.js';
import Workspace from '../models/Workspace.js';

export async function workspace(request: Request, response: Response): Promise<void> {
  const workspace = await Workspace.findOne({ user: currentUser(request).id })
    || { name: currentUser(request).workspaceName, owner: currentUser(request).name };
  response.json(workspace);
}

export async function errorLogs(request: Request, response: Response): Promise<void> {
  const logs = await ErrorLog.find({ owner: currentUser(request).id }).sort({ timestamp: -1 }).limit(50);
  response.json(logs);
}

export function health(_request: Request, response: Response): void {
  response.json({ status: 'ok', uptime: process.uptime() });
}
