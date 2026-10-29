import type { Request, Response } from 'express';
import { currentUser } from '../utils/authContext.js';
import type { CreateProfileInput, UpdateProfileInput } from '@optitrader/shared';
import {
  cloneProfile,
  createProfile,
  deleteProfile,
  getProfile,
  listProfiles,
  updateProfile,
} from '../services/profileService.js';
import { toProfileDTO } from '../serializers/index.js';

export async function index(request: Request, response: Response): Promise<void> {
  const profiles = await listProfiles(currentUser(request).id);
  response.json(profiles.map(toProfileDTO));
}

export async function show(request: Request, response: Response): Promise<void> {
  const profile = await getProfile(currentUser(request).id, request.params.id as string);
  response.json(toProfileDTO(profile));
}

export async function create(request: Request, response: Response): Promise<void> {
  const profile = await createProfile(currentUser(request).id, request.body as CreateProfileInput);
  response.status(201).json(toProfileDTO(profile));
}

export async function update(request: Request, response: Response): Promise<void> {
  const profile = await updateProfile(
    currentUser(request).id,
    request.params.id as string,
    request.body as UpdateProfileInput
  );
  response.json(toProfileDTO(profile));
}

export async function clone(request: Request, response: Response): Promise<void> {
  const profile = await cloneProfile(currentUser(request).id, request.params.id as string);
  response.status(201).json(toProfileDTO(profile));
}

export async function remove(request: Request, response: Response): Promise<void> {
  await deleteProfile(currentUser(request).id, request.params.id as string);
  response.status(204).end();
}


