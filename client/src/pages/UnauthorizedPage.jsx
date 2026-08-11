import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getDashboardRedirect } from '../utils/roleRedirect';

const UnauthorizedPage = () => {
  const { user } = useAuth();

  return (
    <div className="flex-grow flex items-center justify-center py-20 px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl mb-4">🚫</p>
        <h1 className="text-2xl font-extrabold text-slate-800">Access Denied</h1>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          You do not have permission to view this page. Please log in with the correct role.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link
            to="/"
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-6 py-3 rounded-xl transition text-sm"
          >
            Go Home
          </Link>
          {user ? (
            <Link
              to={getDashboardRedirect(user.role)}
              className="bg-primary hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-md shadow-blue-200 text-sm"
            >
              Go to My Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="bg-primary hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-md shadow-blue-200 text-sm"
            >
              Log In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
