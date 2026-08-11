import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="flex-grow flex items-center justify-center py-20 px-4">
    <div className="text-center max-w-md">
      <p className="text-8xl font-black text-primary/20">404</p>
      <h1 className="text-2xl font-extrabold text-slate-800 mt-4">Page Not Found</h1>
      <p className="text-slate-500 text-sm mt-2 leading-relaxed">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-block mt-6 bg-primary hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-md shadow-blue-200"
      >
        Go Back Home
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
