'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Star, UserCircle2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Review } from '@/types'

interface ReviewsListProps {
  reviews: Review[]
  onLike: (id: string) => void
}

export default function ReviewsList({ reviews, onLike }: ReviewsListProps) {
  const [localReviews, setLocalReviews] = useState(reviews)

  const handleLike = (id: string) => {
    setLocalReviews((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, likes: r.isLiked ? r.likes - 1 : r.likes + 1, isLiked: !r.isLiked }
          : r
      )
    )
    onLike(id)
  }

  return (
    <ScrollArea className="h-[600px] !pr-3 ">
      <div className="!space-y-2 md:!space-y-4 ">
        <AnimatePresence initial={false}>
          {localReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#1A1A1D] border border-white/10 !rounded-sm  !p-4 !space-y-3"
            >
              {/* Header — avatar + name + date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-white/10">
                    {/* If you have user.src pass it here, otherwise fallback shows initials */}
                    <AvatarImage src={undefined} alt={review.author} />
                    <AvatarFallback className="bg-[#BD0404]/20 text-[#BD0404] text-sm font-semibold">
                      {review.author
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col">
                    <span className="text-white text-sm font-semibold leading-tight">
                      {review.author}
                    </span>
                    <span className="text-white/30 text-xs">
                      {review.date instanceof Date
                        ? review.date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : review.date}
                    </span>
                  </div>
                </div>

                {/* Star rating */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star    
                      key={star}
                      size={13}
                      className={
                        star <= review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-white/20'
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Comment */}
              <p className="text-white/70 text-sm leading-relaxed">
                {review.comment}
              </p>

              {/* Like button */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleLike(review.id)}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors group"
                >
                  <Heart mbsUp
                    size={14}
                    className={`transition-all ${
                      review.isLiked
                        ? 'fill-[#BD0404] text-[#BD0404]'
                        : 'group-hover:text-white/60'
                    }`}
                  />
                  <span className={review.isLiked ? 'text-[#BD0404]' : ''}>
                    {localReviews.find((r) => r.id === review.id)?.likes} helpful
                  </span>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  )
}