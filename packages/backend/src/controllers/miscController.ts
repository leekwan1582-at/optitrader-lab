import type { Request, Response } from 'express';
import { currentUser } from '../utils/authContext.js';
import ErrorLog from '../models/ErrorLog.js';
import Workspace from '../models/Workspace.js';
import Dataset from '../models/Dataset.js';
import Profile from '../models/Profile.js';
import Setting from '../models/Setting.js';
import { listRuns } from '../services/runService.js';
import {
  toErrorLogDTO,
  toWorkspaceBootstrapDTO,
  toWorkspaceDTO,
} from '../serializers/index.js';
import type { ErrorLogQuery } from '@optitrader/shared';

export async function workspace(request: Request, response: Response): Promise<void> {
  const user = currentUser(request);
  const [workspaceDoc, datasets, profiles, runs, errorLogsList, settingDoc] = await Promise.all([
    Workspace.findOne({ user: user.id })
      || { name: user.workspaceName, owner: user.name, user: user.id },
    Dataset.find({ owner: user.id }).sort({ createdAt: -1 }),
    Profile.find({ owner: user.id }).sort({ createdAt: -1 }),
    listRuns(user.id),
    ErrorLog.find({ owner: user.id }).sort({ timestamp: -1 }).limit(50),
    Setting.findOne({ owner: user.id }),
  ]);

  const bootstrap = toWorkspaceBootstrapDTO({
    workspace: toWorkspaceDTO(workspaceDoc, user.name),
    datasets,
    profiles,
    runs,
    errorLogs: errorLogsList,
    settings: settingDoc || undefined,
  });

  response.json(bootstrap);
}

export async function errorLogs(request: Request, response: Response): Promise<void> {
  const query = (request.validatedQuery || request.query) as unknown as ErrorLogQuery;
  const owner = currentUser(request).id;

  const mongoQuery: Record<string, unknown> = { owner };
  if (query.severity) {
    mongoQuery.severity = query.severity;
  }
  if (query.experiment_id) {
    mongoQuery.experiment_id = query.experiment_id;
  }

  const page = query.page || 1;
  const limit = query.limit || 50;
  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    ErrorLog.countDocuments(mongoQuery),
    ErrorLog.find(mongoQuery).sort({ timestamp: -1 }).skip(skip).limit(limit),
  ]);

  response.json({
    items: logs.map(toErrorLogDTO),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export function health(_request: Request, response: Response): void {
  response.json({ status: 'ok', uptime: process.uptime() });
}
