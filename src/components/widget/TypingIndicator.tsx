import React from 'react';
import { motion } from 'framer-motion';

export const TypingIndicator: React.FC = () => {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -4 },
  };

  const transition = {
    duration: 0.5,
    repeat: Infinity,
    repeatType: 'reverse' as const,
    ease: 'easeInOut' as const,
  };

  return (
    <div
      className="flex justify-start mb-6 items-center h-6 pl-2"
      aria-label="El asistente está escribiendo..."
    >
      <div className="flex gap-1.5">
        <motion.span
          className="w-1.5 h-1.5 bg-black rounded-full"
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...transition, delay: 0 }}
        />
        <motion.span
          className="w-1.5 h-1.5 bg-black rounded-full"
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...transition, delay: 0.15 }}
        />
        <motion.span
          className="w-1.5 h-1.5 bg-black rounded-full"
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...transition, delay: 0.3 }}
        />
      </div>
    </div>
  );
};
