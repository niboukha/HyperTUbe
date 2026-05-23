export interface Review {
  id: string
  username: string
  stars: number
  content: string
  likes: number
  isLiked: boolean
  created_at: Date
  avatar?: string  // ← add this
  userId:number

}
