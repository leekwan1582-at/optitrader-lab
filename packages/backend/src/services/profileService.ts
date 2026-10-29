import Profile, { type ProfileDocument } from '../models/Profile.js';
import type { ProfileData } from '../types/domain.js';
import type { CreateProfileInput, UpdateProfileInput } from '@optitrader/shared';
import { AppError, NotFoundError } from '../utils/errors.js';
import { createId } from '../utils/ids.js';

export async function listProfiles(owner: string): Promise<ProfileData[]> {
  return Profile.find({ owner }).sort({ createdAt: -1 }).lean<ProfileData[]>();
}

export async function getProfile(owner: string, profileId: string): Promise<ProfileData> {
  const profile = await Profile.findOne({ _id: profileId, owner }).lean<ProfileData>();
  if (!profile) throw new NotFoundError('Profile not found.');
  return profile;
}

export async function createProfile(owner: string, input: CreateProfileInput): Promise<ProfileDocument> {
  const existing = await Profile.findOne({ owner, name: input.name });
  if (existing) {
    throw new AppError(`A profile named "${input.name}" already exists.`, 409, 'DUPLICATE_KEY');
  }

  const profile = await Profile.create({
    _id: createId('profile'),
    owner,
    ...input,
  });
  return profile;
}

export async function updateProfile(
  owner: string,
  profileId: string,
  input: UpdateProfileInput
): Promise<ProfileData> {
  if (input.name) {
    const existing = await Profile.findOne({
      owner,
      name: input.name,
      _id: { $ne: profileId },
    });
    if (existing) {
      throw new AppError(`A profile named "${input.name}" already exists.`, 409, 'DUPLICATE_KEY');
    }
  }

  const profile = await Profile.findOneAndUpdate(
    { _id: profileId, owner },
    input,
    { new: true, runValidators: true }
  ).lean<ProfileData>();

  if (!profile) throw new NotFoundError('Profile not found.');
  return profile;
}

export async function cloneProfile(owner: string, profileId: string): Promise<ProfileDocument> {
  const original = await getProfile(owner, profileId);
  let cloneName = `Copy of ${original.name}`;
  let count = 1;

  while (await Profile.exists({ owner, name: cloneName })) {
    count += 1;
    cloneName = `Copy (${count}) of ${original.name}`;
  }

  const cloned = await Profile.create({
    _id: createId('profile'),
    owner,
    name: cloneName,
    strategy_type: original.strategy_type,
    objective: original.objective,
    max_drawdown_limit: original.max_drawdown_limit,
    params: original.params,
  });

  return cloned;
}

export async function deleteProfile(owner: string, profileId: string): Promise<void> {
  const profile = await Profile.findOneAndDelete({
    _id: profileId,
    owner,
  });
  if (!profile) throw new NotFoundError('Profile not found.');
}

