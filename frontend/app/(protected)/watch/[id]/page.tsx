'use client'
import { useParams } from "next/navigation";
import ReactPlayer from "react-player";


const movies = [
  {
    id: "1",
    title: "Interstellar",
    genre: "Sci-Fi · Adventure",
    year: 2014,
    rating: "8.6",
    duration: "2h 49m",
    thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&h=600&fit=crop",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    id: "4",
    title: "The Martian",
    genre: "Sci-Fi · Drama",
    year: 2015,
    rating: "8.0",
    duration: "2h 24m",
    thumbnail: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1200&h=600&fit=crop",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
]
export default function Watch()
{


  
  const params   = useParams()
  const movieId  = params.id as string

  const movie = movies.find((m) => m.id === movieId);

    return (
        <div className="min-h-screen h-full flex flex-col items-center  !px-4 lg:!px-16 !space-y-4 !mt-15 !mb-15">
            {/* <header className="flex items-center justify-between !mt-10 px-10 py-5 bg-[#080a10]/95 border-b border-white/5"> */}
                {/* <button
                // onClick={() => router.push("/")}
                className="bg-white/8 hover:bg-white/15 border border-white/15 text-white text-sm px-5 py-2 rounded transition"
                >
                ← Back
                </button> */}
                {/* <div className="font-[anton] text-white text-4xl md:text-5xl uppercase leading-none tracking-wide">
                {movie?.title}
                </div> */}
            {/* </header> */}
           
              <div className="w-full flex justify-center">
                <div className="
                      max-w-8xl 
                      
                      h-[99vh] 
                      max-h-[100vh]
                      sm:max-h-[75vh]
                      aspect-video
                      "
                >
                  <ReactPlayer
                    src={movie.videoUrl}
                    controls
                    width="100%"
                    height="full"
                    className="rounded-md "
                  />
                </div>
              </div>

        </div>
    )
}




// import ReactPlayer from "react-player";
// import { useRef, useState } from "react";

// export default function WatchPage({ movie }) {
//   const playerRef = useRef(null);

//   const [played, setPlayed] = useState(0);
//   const [duration, setDuration] = useState(0);
//   const [playing, setPlaying] = useState(true);

//   return (
//     <div className="w-full flex justify-center">
//       <div className="w-full max-w-6xl aspect-video">

//         <ReactPlayer
//           ref={playerRef}
//           src={movie.videoUrl}
//           playing={playing}
//           controls={false}
//           width="100%"
//           height="100%"

//           // current progress
//           onProgress={({ played }) => {
//             setPlayed(played);
//           }}

//           // total duration
//           onDuration={(duration) => {
//             setDuration(duration);
//           }}
//         />

//         {/* Controls */}
//         <div className="bg-black p-4 text-white flex flex-col gap-3">

//           {/* Progress */}
//           <input
//             type="range"
//             min={0}
//             max={1}
//             step="0.01"
//             value={played}
//             onChange={(e) => {
//               const seekTo = parseFloat(e.target.value);

//               setPlayed(seekTo);

//               playerRef.current?.seekTo(seekTo);
//             }}
//             className="w-full"
//           />

//           {/* Buttons */}
//           <div className="flex gap-4 items-center">

//             <button
//               onClick={() => setPlaying(!playing)}
//               className="bg-white text-black px-4 py-1 rounded"
//             >
//               {playing ? "Pause" : "Play"}
//             </button>

//             <p>
//               {Math.floor(duration)} sec
//             </p>

//           </div>

//         </div>

//       </div>
//     </div>
//   );
// }