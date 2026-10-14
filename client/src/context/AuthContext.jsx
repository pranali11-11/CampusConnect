import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

const normalizeUser = (data) => ({
  id: data._id || data.id,
  name: data.name,
  email: data.email,
  role: data.role,
  department: data.department,
  rollNumber: data.rollNumber,
  mobile: data.mobile,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Initialize and load user profile if token exists on application mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const profileResponse = await authService.getMe();
          if (profileResponse.success) {
            setUser(normalizeUser(profileResponse.data));
            setToken(storedToken);
          } else {
            // In case profile loading failed, clean local cache
            logout();
          }
        } catch (error) {
          console.error('Failed to load user profile on mount:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * Log in user and fetch details.
   * @param {string} email - User email address.
   * @param {string} password - User password.
   * @param {string} role - The role the user is logging in with (optional validation).
   */
  const login = async (email, password, role) => {
    setLoading(true);
    try {
      const result = await authService.login(email, password);

      if (result.token && result.user) {
        const userData = result.user;

        if (role && userData.role !== role) {
          throw new Error(`Access Denied: Account registered as a ${userData.role}, not a ${role}.`);
        }

        localStorage.setItem('token', result.token);
        setToken(result.token);
        setUser(normalizeUser(userData));

        return { success: true, user: userData };
      }

      throw new Error('Authentication returned an invalid response structure');
    } catch (error) {
      console.error('Login action error:', error);
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates user details in context and persists optional new token.
   * @param {object} userData - New user object.
   * @param {string} [newToken] - Refreshed JWT token if provided.
   */
  const updateUser = (userData, newToken) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
    }
    if (userData) {
      setUser(normalizeUser(userData));
    }
  };

  /**
   * Logs out the user by clearing localStorage tokens and context state.
   */
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const contextValue = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
