'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Star, Pencil, Check, X, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Review } from '@/types/Review'
import { Button } from '../ui/button'

interface ReviewsListProps {
  reviews: Review[]
  currentUserId?: Number  | null     // add this to your props
  onLike: (review_id: string) => void
  onDelete: (review_id: string) => void
  onEdit: (review_id: string, updated: { username: string; content: string; stars: number }) => void
}

export default function ReviewsList({ reviews, currentUserId, onLike, onDelete, onEdit }: ReviewsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ username: '', content: '', stars: 0 })

  const startEdit = (review: Review) => {
    setEditingId(review.id)
    setDraft({ username: review.username, content: review.content, stars: review.stars })
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = (id: string) => {
    onEdit(id, draft)
    setEditingId(null)
  }

  return (
    <ScrollArea className="h-125">
      <div className="space-y-2! md:space-y-4!">
        <AnimatePresence initial={false}>
          {reviews.map((review, index) => {
            const isOwner = currentUserId === review.userId
            const isEditing = editingId === review.id
            return (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#1A1A1D] border border-white/10 rounded-sm! p-4! space-y-3!"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={review.avatar} alt={review.username} />
                      <AvatarFallback className="bg-[#BD0404]/20 text-[#BD0404] text-sm font-semibold">
                        {(isEditing ? draft.username : review.username)
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col gap-1">
                      <span className="text-white text-sm font-semibold leading-tight">
                        {review.username}
                      </span>
                      <span className="text-white/30 text-xs">
                        {review.created_at
                          ? new Date(review.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>
                  </div>

                  {/* Stars — clickable when editing */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={13}
                        onClick={() => isEditing && setDraft((d) => ({ ...d, stars: star }))}
                        className={`transition-colors ${isEditing ? 'cursor-pointer' : ''} ${
                          star <= (isEditing ? draft.stars : review.stars)
                            ? 'fill-[#eab308] text-[#eab308]'
                            : 'text-white/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Content */}
                {isEditing ? (
                  <textarea
                    value={draft.content}
                    onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white/80 text-sm leading-relaxed resize-none focus:outline-none focus:border-white/30"
                  />
                ) : (
                  <p className="text-white/70 text-sm leading-relaxed">{review.content}</p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  {/* Like */}
                  <Button
                    onClick={() => onLike(review.id)}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors group bg-transparent"
                  >
                    <Heart
                      size={14}
                      className={`transition-all ${
                        review.isLiked ? 'fill-[#BD0404] text-[#BD0404]' : 'group-hover:text-white/60'
                        }`}
                    />
                    <span>{review.likes}</span>
                  </Button>

                  {/* Edit / Save / Cancel */}
                  {isOwner && (
                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <Button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 bg-transparent px-2 py-1 h-auto"
                          >
                            <X size={13} /> Cancel
                          </Button>
                          <Button
                            onClick={() => saveEdit(review.id)}
                            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 bg-transparent px-2 py-1 h-auto"
                          >
                            <Check size={13} /> Save
                          </Button>
                        </>
                      ) : (
                        <div className='flex md:flex-row gap-6'>
                          <Button
                            onClick={() => onDelete(review.id)}
                            className="flex items-center gap-1 text-xs text-white/30 hover:text-white/70 bg-transparent px-2 py-1 h-auto"
                          >
                            <Trash2 size={13} /> Delete
                          </Button>
                          <Button
                            onClick={() => startEdit(review)}
                            className="flex items-center gap-1 text-xs text-white/30 hover:text-white/70 bg-transparent px-2 py-1 h-auto"
                          >
                            <Pencil size={13} /> Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ScrollArea>
  )
}