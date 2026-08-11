import React from 'react';

/**
 * Standard visual spinner for loading states.
 * @param {boolean} fullPage - If true, centers spinner in full viewport screen.
 */
const Loader = ({ fullPage = false }) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading CampusConnect...</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-slate-50 z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return <div className="py-10 flex items-center justify-center">{spinner}</div>;
};

export default Loader;
