import { useState, useEffect } from 'react';

/**
 * Animates a number from 0 to target when triggered.
 * @param {number} target - Final count value.
 * @param {number} duration - Animation duration in ms.
 * @param {boolean} start - Whether animation should run.
 * @returns {number} Current animated count.
 */
const useCountUp = (target, duration = 2000, start = false) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;

    let startTime = null;
    let animationFrame;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration, start]);

  return count;
};

export default useCountUp;
