'use client';
import { motion } from "framer-motion";
import { useState,useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Star } from 'lucide-react';
import Logo from "@/components/ui/logo";
import { ChevronLeft,X} from "lucide-react";
import LanguageMenu from "@/components/header/language-menu";
import { itemVariants } from "@/lib/annimations/hero-variants";
import { Clapperboard } from 'lucide-react';
import Link from "next/link";
import { MovieResult } from "@/types/search"
import { useIsMobile } from "@/hooks/useMobile";
import { TMDB_GENRE_LABELS } from "@/lib/tmdb-genres";


import { Badge } from "@/components/ui/badge";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";

export default function Landing() {

  const isMobile = useIsMobile();
  const [movies, setMovies] = useState<MovieResult[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);


  useEffect(() => {
    async function fetchMovieDetails() {
      try {
        const res = await fetch(
          `http://localhost:8000/movies/?type=trending`
        );
        const data = await res.json();
        setMovies(data.results)
        console.log('Movie details:', data);
      } catch (err) {
        console.error('Error fetching movie details:', err);
      }
    }
    fetchMovieDetails();
  },[]);
  


  const next = () => {
    setMovies(prev => {
      const first = prev[0];
      return [...prev.slice(1), first];
    });
  };

  const prev = () => {
    setMovies(prev => {
      const last = prev[prev.length - 1];
      return [last, ...prev.slice(0, -1)];
    });
  };
  

  // Auto-play
  useEffect(() => {
    if (movies.length === 0 || isPaused) return;

    intervalRef.current = setInterval(() => {
      next();
    },4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [movies, isPaused]);

  return (
    <main className="min-h-[100dvh]">
      <div className="   absolute top-0  left-0   w-full flex justify-between items-center !px-4 md:!px-12 !py-4 z-50   ">
        <Logo/>
        <div className="  md:flex items-center gap-3">
          <LanguageMenu />
          <Link href="/home">
            <Button className="hidden md:flex bg-white  !px-7 !py-4 !text-lg  bg-[#BD0404] text-[#ffffff] hover:bg-[#BD0404] hover:scale-105 font-meduim rounded-sm">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
      
      <ul className=" width:100%  h-screen  ">
        {
        movies.map((item,index) => 
        {
          const isFullscreen = index === 0 || index === 1;
          const thumbIndex = index - 2;
          const isHidden = index > 5;

          const positionStyle = isFullscreen
            ? { left: 0, top: 0, width: '100%', height: '100%', borderRadius: 0, boxShadow: 'none' }
            : isMobile
            ?{display:'none'}
            : { 
                left: `calc(52% + ${thumbIndex * 240}px)`, 
                opacity: isHidden ? 0 : 1 ,
                width: '220px', height: '340px'
              };
          return (
               <motion.li
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                  key={item?.id}
                  className={`absolute  flex md:top-[50%] overflow-hidden
                    ${!isFullscreen ? '[@media(max-height:500px)]:hidden rounded-md transition-all duration-300 cursor-pointer' : ''}`}
                  style={{ ...positionStyle }}
                  initial={{ opacity: 0, y: isFullscreen ?  0: -50}}
                  animate={{ opacity: 1, y: 0 }}

                    whileHover={
                    !isFullscreen
                      ? {
                          scale: 1.08,
                          y: -8,
                          boxShadow: '0 0 25px 6px rgba(75, 62, 4, 0.6)',
                          zIndex: 10,
                        }
                      : {}
                  }
                  transition={{ duration: 0.2 }}
                >
              {/* BG image — only this animates for Ken Burns */}

                {
                  item.backdrop_path ?
                  (
                    <motion.div
                      className="absolute inset-0 bg-center bg-cover bg-no-repeat"
                      style={{
                        backgroundImage: `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`,
                      }}
                      animate={
                        isFullscreen && !isMobile
                          ? { scale: [1, 1.05, 1] }
                          : { scale: 1 }
                      }
                      transition={
                        isFullscreen && !isMobile
                          ? {
                              scale: {
                                duration: 6,
                                ease: 'easeInOut',
                                repeat: Infinity,
                                repeatType: 'loop',
                              },
                            }
                          : {
                           
                          }
                      }
                    />

                  ):
                  (
                  <div className="w-full h-full flex items-center justify-center bg-background object-cover transition-transform duration-500 group-hover:scale-105">
                        <Clapperboard className={ `  ${isFullscreen? "md:!h-50 md:!w-50":"h-10 w-10 text-white/50" }`}    strokeWidth={1} />

                  </div>
                  )
                }

                  
                  <div
                    className={`absolute inset-0 h-full bg-gradient-to-r from-[#0E0E10]/70 via-[#000000]/50 to-transparent ${
                      isFullscreen ? "block" : "hidden"
                    }`}
                  />
    
             
                 {isFullscreen && 
                  <motion.div 
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className=" absolute top-[70%] md:top-[55%]  left-4 md:left-12 
                    w-[min(85vw,500px)]
                    [@media(max-height:500px)]:w-[min(70vw,500px)]
                    [@media(min-width:768px)_and_(min-height:500px)]:w-[min(60vw,500px)]
                    -translate-y-1/2 
                    text-white font-sans text-[0.85rem] font-normal
                    drop-shadow-[0_3px_8px_rgba(0,0,0,0.5)]  "
                  >
                    <h2 className="title  text-4xl md:text-5xl lg:text-6xl font-meduim text-white uppercase leading-none tracking-tight  max-w-[100%] !font-[anton]">
                      {item.title}
                    </h2>
                    
                    

                    <div className="flex items-center gap-2 lg:gap-4 !mb-1 flex-wrap ">
                        <div
                         
                          className="flex flex-wrap items-center gap-2! mt-2! mb-4!"
                        >
                          <AvailabilityBadge
                            type={item.availability}
                            className="text-[10px] font-bold px-1.5! py-0.5!"
                            badgeClassName="w-3 h-3"
                          />

                          {
                            item?.rating > 0 && (
                            <Badge variant="link" className="text-text-muted text-xs gap-1 rounded-md">
                              <Star className="h-3 w-3 fill-yellow-400/70 text-yellow-400/70" />
                              {item?.rating.toFixed(1)}
                              <span className="text-text-muted/60">/10</span>
                            </Badge>
                          )}

                          {item.year && (
                            <>
                              <span className="text-text-muted/50 hidden md:inline">|</span>
                              <Badge variant="link" className="text-text-muted text-xs rounded-md">
                                {item.year}
                              </Badge>
                            </>
                          )}

                        
                          {/* genres — use full genre objects if available */}
                          {item.genre_ids?.map((index) => (
                            <span key={index} className="flex items-center gap-2!">
                              <span className="text-text-muted/50 hidden md:inline">|</span>
                              <Badge variant="link" className="text-text-muted text-xs rounded-md">
                                {TMDB_GENRE_LABELS[index]}
                              </Badge>
                            </span>
                          ))}

                          
                        </div>
                    </div>   

                   
                    <div className="!mb-4">
                      <motion.p 
                        variants={itemVariants} className=" text-text-muted text-sm! md:text-base max-w-140 line-clamp-3  md:line-clamp-4 max-h-70 ">

                        {item.overview}
                        
                      </motion.p>

                    </div>

                    <div className="">
                      <Button className="!bg-[#FFFFFF]/5 border-[#FFFFFF]/20 !rounded-md !p-6 text-xl md:text-xl hover:scale-105" >Get Started <ChevronRight color="#F6C700"  strokeWidth={5}  /></Button>
                    </div>

                  </motion.div> 
              }
              </motion.li>
          )})}
      </ul>
      <nav className="nav flex flex-row gap-3 md:gap-5">
        <Button
          onClick={prev}
          className=" h-14 w-14 sm:h-14 sm:w-14 rounded-full
            bg-white/10 backdrop-blur-md border border-white/20
            hover:bg-white/20 flex items-center justify-center"
        >
          <ChevronLeft className="!w-6 !h-6 md:!w-8 md:!h-8 text-white" />
        </Button>

        <Button
          onClick={next}
          className="h-14 w-14 sm:h-14 sm:w-14 rounded-full
            bg-white/10 backdrop-blur-md border border-white/20
            hover:bg-white/20 flex items-center justify-center"
        >
          <ChevronRight className="!w-6 !h-6 md:!w-8 md:!h-8 text-white" />
        </Button>
      </nav>
      <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none z-10" style={{ background: 'linear-gradient(to top, #0E0E10, transparent)' }}/>
      {/* <Footer/> */}
    </main>
  );
}