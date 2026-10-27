import { getCurrentUser, loginUser, registerUser } from '../services/authService.js';

export async function register(request, response) {
  const result = await registerUser(request.body, request.app.locals.config);
  response.status(201).json(result);
}

export async function login(request, response) {
  const result = await loginUser(request.body, request.app.locals.config);
  response.json(result);
}

export async function me(request, response) {
  const user = await getCurrentUser(request.user.id);
  response.json({ user });
}
