import React from 'react';

/**
 * Shimmering skeleton loader component representing an Event Card.
 */
const SkeletonCard = () => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-slate-200 dark:bg-slate-700"></div>
      <div className="p-5 flex flex-col gap-4">
        <div className="w-24 h-5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        <div className="w-full h-6 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
          <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
          <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
