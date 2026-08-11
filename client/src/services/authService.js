import api from './api';

/**
 * Log in a user.
 * @param {string} email - User email.
 * @param {string} password - User password.
 * @returns {Promise<object>} Response containing token and user.
 */
const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

/**
 * Register a new user.
 * @param {object} userData - Details of the registering user.
 * @returns {Promise<object>} Response containing message and userId.
 */
const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

/**
 * Request password reset email.
 * @param {string} email - User email.
 * @returns {Promise<object>} Response from server.
 */
const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

/**
 * Get current user profile details using active token.
 * @returns {Promise<object>} The user object.
 */
const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

const authService = {
  login,
  register,
  forgotPassword,
  getMe,
};

export default authService;
