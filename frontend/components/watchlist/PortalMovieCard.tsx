import { motion, AnimatePresence } from "framer-motion";
import { MovieCard } from "./watchlist-card";

export type Movie = {
  id: string;
  title: string;
  poster: string;     
  backdrop: string;    
  rating: number;         
  year: number; 
  duration: string;
  genres: string[]; 
  overview: string;
  isSaved: boolean;
  availability: "free" | "premium";
};

interface CardProps {
  movie: Movie;
  onToggleSave: (id: string) => void;
  portalStyle?: React.CSSProperties;
  motionProps?: React.ComponentProps<typeof motion.div>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

interface PortalCardProps extends Omit<CardProps, "motionProps"> {
  hover: { index: number; rect: DOMRect; origin: "left" | "right" | "center" };
  getPortalStyle: (rect: DOMRect, origin: "left" | "right" | "center") => React.CSSProperties;
}

export default function PortalMovieCard({
  hover,
  getPortalStyle,
  ...cardProps
}: PortalCardProps) {
  return (
    <AnimatePresence>
      <MovieCard
        {...cardProps}
        portalStyle={getPortalStyle(hover.rect, hover.origin)}
        motionProps={{
          key: hover.index,
          initial: { scale: 1, opacity: 0 },
          animate: { scale: 1.08, opacity: 1 },
          exit:    { scale: 1, opacity: 0 },
          transition: { type: "spring", stiffness: 140, damping: 20, mass: 1.2 },
        }}
      />
    </AnimatePresence>
  );
}

