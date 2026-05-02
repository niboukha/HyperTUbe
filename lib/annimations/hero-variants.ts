import { Variants } from "framer-motion"

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
}

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    filter: "blur(4px)",
    transition: {
      duration: 0.35,
      ease: "easeInOut",
    },
  },
}

export const backgroundVariants: Variants = {
  initial: { opacity: 0, scale: 1.08 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      opacity: { duration: 1.2, ease: "easeInOut" },  // ← no black flash
      scale: { duration: 8, ease: "easeInOut" },
    },
  },
  paused: {
    scale: 1,     // freeze at current visual state (no jump)
    opacity: 1,
    transition: {
      duration: 0, // instantly stop
    },
  },
  exit: {
    opacity: 0,
    scale: 1.04,
    transition: {
      opacity: { duration: 0.8, ease: "easeInOut" },
      scale: { duration: 0.8, ease: "easeInOut" },
    },
  },
}