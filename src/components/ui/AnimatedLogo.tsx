import { motion } from 'framer-motion';

export default function AnimatedLogo({ size = 'md', className = '' }) {
  // Logo styling based on size
  const sizeStyles = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  return (
    <motion.div 
      className={`${sizeStyles[size]} ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M25 75V25h30v15H40v35h-15zm45 0l-10-15h-5v15h-15V25h30c8.284 0 15 6.716 15 15v15c0 8.284-6.716 15-15 15h-5l10 15h-20zm0-45v-15h-15v15h15z"
          fill="currentColor"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
}