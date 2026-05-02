"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

export default function MovieHoverCard({ item }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
        id={item.id}
      className="w-fit h-[400px]"
      initial={{ width: 290, height: 400 }}
      whileHover={{ width: 600, height: 400 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <Card className="relative w-full h-full overflow-hidden p-0  " >

        {/* IMAGE */}
        <img
          src={
            hovered
              ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
              : `https://image.tmdb.org/t/p/w500${item.poster_path}`
          }
          className="w-full h-full object-cover"
        />

        {/* GRADIENT OVERLAY */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: `
              linear-gradient(to top, rgba(0,0,0,0.85) 10%, rgba(0,0,0,0.3) 40%, transparent 60%),
              linear-gradient(to right, rgba(0,0,0,0.5) 10%, transparent 60%),
              linear-gradient(to left, rgba(0,0,0,0.5) 10%, transparent 60%)
            `,
          }}
        />

        {/* CONTENT */}
        <div className="absolute  top-2 right-3 flex flex-row justify-center items-center gap-1">
            <span className="text-md text-[#FC982F] font-black">
              {Number(item?.vote_average || 0).toFixed(1)}
            </span>
            <Star
                size={12}
                className="text-yellow-400"
                fill="currentColor"
            />
          </div>
        
        <motion.div
          className="absolute inset-0 top-1/2 left-4 max-w-[250px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: hovered ? 1 : 0,
            y: hovered ? 0 : 10,
          }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <p className="text-white font-medium text-lg leading-tight font-[anton]">
            {item.original_title}
          </p>

         

          <Button className="!mt-2 rounded-sm !py-4 !px-2 text-md font-bold bg-white/30 backdrop-blur-lg">
            More informations
          </Button>
        </motion.div>

      </Card>
    </motion.div>
  );
}