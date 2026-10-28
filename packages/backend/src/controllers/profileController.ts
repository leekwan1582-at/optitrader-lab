import type { Request, Response } from 'express';
import { currentUser } from '../utils/authContext.js';
import Profile from '../models/Profile.js';
import type { ProfileData } from '../types/domain.js';
import { NotFoundError } from '../utils/errors.js';
import { createId } from '../utils/ids.js';

export async function index(request: Request, response: Response): Promise<void> {
  const profiles = await Profile.find({ owner: currentUser(request).id }).sort({ createdAt: -1 });
  response.json(profiles);
}

export async function create(request: Request, response: Response): Promise<void> {
  const profile = await Profile.create({
    _id: createId('profile'),
    owner: currentUser(request).id,
    ...(request.body as Omit<ProfileData, '_id' | 'owner'>),
  });
  response.status(201).json(profile);
}

export async function update(request: Request, response: Response): Promise<void> {
  const profile = await Profile.findOneAndUpdate(
    { _id: request.params.id, owner: currentUser(request).id },
    request.body as Partial<ProfileData>,
    { new: true, runValidators: true }
  );
  if (!profile) throw new NotFoundError('Profile not found.');
  response.json(profile);
}

export async function remove(request: Request, response: Response): Promise<void> {
  const profile = await Profile.findOneAndDelete({
    _id: request.params.id,
    owner: currentUser(request).id,
  });
  if (!profile) throw new NotFoundError('Profile not found.');
  response.status(204).end();
}
