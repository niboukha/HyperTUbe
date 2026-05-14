export interface Review {
  id: string
  author: string
  rating: number
  comment: string
  likes: number
  isLiked: boolean
  date: Date
  avatar?: string  // ← add this

}
