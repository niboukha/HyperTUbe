'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Star } from 'lucide-react'
import type { Review } from '@/types'

interface FeedbackFormProps {
  onSubmit: (review: Omit<Review, 'id' | 'likes' | 'isLiked' | 'date'>) => void
}

export default function FeedbackForm({ onSubmit }: FeedbackFormProps) {
  const [author, setAuthor] = useState('')
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!author.trim() || !comment.trim() || rating === 0) {
      alert('Please fill in all fields and select a rating')
      return
    }

    setIsSubmitting(true)

    // Simulate submission delay
    setTimeout(() => {
      onSubmit({
        author,
        comment,
        rating,
      })

      // Reset form
      setAuthor('')
      setComment('')
      setRating(0)
      setIsSubmitting(false)
    }, 300)
  }

  return (
    <Card className="!rounded-sm !p-6 shadow-lg !bg-[#1A1A1D] !border-[#FFFFFF]/10 border max-w-2xl  md:w-2xl  h-100">
      <h2 className="!text-md md:text-xl  text-white !mb-3">Share your thoughts</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        

        {/* Rating Section */}
        <div className="space-y-3">
         
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={`transition-all ${
                    star <= (hoveredRating || rating)
                      ? 'fill-accent text-accent'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-primary font-medium">
              {rating} out of 5 stars
            </p>
          )}
        </div>

        {/* Comment Section */}
        <div className="">
          <label htmlFor="comment" className="block text-sm font-medium text-foreground">
            Your Comment
          </label>
          <Textarea
            id="comment"
            placeholder="Write your review here..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={6}
            className=" !h-30  !p-3 resize-none !bg-[#000000]/40 border-[#FFFFFF]/10 border  text-white placeholder:text-[#6B7280] placeholder:text-sm"
          />
        </div>

        {/* Submit Button */}
        <div className='!mt-6'>
            <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-md md:text-xl !font-bold bg-[#BD0404] text-primary-foreground font-medium !py-6"
            >
            {isSubmitting ? 'Submitting...' : 'Post Review'}
            </Button>
            
        </div>
      </form>
    </Card>
  )
}
