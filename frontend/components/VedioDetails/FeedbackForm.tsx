'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'
import { useParams } from 'next/navigation'

type FeedbackFormProps = {
  onSubmit: (comment: string, rating: number) => void
}

export default function FeedbackForm({ onSubmit }: FeedbackFormProps) {

  const params   = useParams()
  const movieId  = params.id as string 
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)


  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim() || rating === 0) {
      alert('Please fill in all fields and select a rating')
      return
    }
    
      onSubmit(comment,rating)
      setComment('')
      setRating(0)
  }

  return (
    <Card className="rounded-sm! p-6! shadow-lg bg-[#1A1A1D]! border-[#FFFFFF]/10! border max-h-100">
      <h2 className="text-md! md:text-xl font-[bebasNeue] font-bold text-white mb-3!">Share your thoughts</h2>

      <form onSubmit={handleSubmit} className="">
        
        {/* Rating Section */}
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
            className="h-30! p-3! resize-none bg-[#000000]/40!  border border-white/10!  text-white placeholder:text-[#6B7280] placeholder:text-sm rounded-md focus:ring-0! focus:ring-offset-0 focus:ring-opacity-50 transition-all duration-150"
          />
        </div>

        {/* Submit Button */}
        <div className='mt-6!'>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full text-md md:text-xl font-semibold! bg-[#BD0404] text-primary-foreground font py-6! rounded-md hover:bg-[#BD0404]/90 transition-all duration-200 hover:scale-102"
            >
              {isSubmitting ? 'Submitting...' : 'Post Review'}
              {/* to change the button text when submitting */}
            </Button>   
        </div>
      </form>
    </Card>
  )
}
