import { Star } from "lucide-react";

export default function StarRating({ rating }: { rating: number }) {

    return (
        <>
            <Star className="h-3 w-3 text-[#eab308] fill-[#eab308]" />
            <span className="text-[#eab308] text-xs font-semibold">{rating?.toFixed(1)}</span>
        </>
    )
}
