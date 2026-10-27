import Profile from '../models/Profile.js';
import { NotFoundError } from '../utils/errors.js';
import { createId } from '../utils/ids.js';

export async function index(request, response) {
  const profiles = await Profile.find({ owner: request.user.id }).sort({ createdAt: -1 });
  response.json(profiles);
}

export async function create(request, response) {
  const profile = await Profile.create({
    _id: createId('profile'),
    owner: request.user.id,
    ...request.body,
  });
  response.status(201).json(profile);
}

export async function update(request, response) {
  const profile = await Profile.findOneAndUpdate(
    { _id: request.params.id, owner: request.user.id },
    request.body,
    { new: true, runValidators: true }
  );
  if (!profile) throw new NotFoundError('Profile not found.');
  response.json(profile);
}

export async function remove(request, response) {
  const profile = await Profile.findOneAndDelete({
    _id: request.params.id,
    owner: request.user.id,
  });
  if (!profile) throw new NotFoundError('Profile not found.');
  response.status(204).end();
}
