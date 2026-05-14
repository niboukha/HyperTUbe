import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export default function CardsHeader({  }: {  }) {
  return (
    <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-[#0b0b07]" />
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Continue Watching
          </h2>
          <Badge
            variant="secondary"
            className="bg-white/10 text-gray-300 text-xs"
          >
            {continueWatchingMovies.length} items
          </Badge>
        </div>

        {/* Navigation Arrows */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/15 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/15 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
    </div>
  )
}