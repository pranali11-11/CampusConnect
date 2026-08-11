/**
 * Resolves the dashboard route depending on user role.
 * @param {string} role - The role of the user.
 * @returns {string} Route path.
 */
export const getDashboardRedirect = (role) => {
  switch (role) {
    case 'student':
      return '/student/dashboard';
    case 'teacher':
      return '/teacher/dashboard';
    case 'hod':
      return '/hod/dashboard';
    default:
      return '/';
  }
};
