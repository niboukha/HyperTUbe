'use client';
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion";
import { useState,useEffect, useRef } from "react";
import {formatRuntime } from "@/utils/formatRuntime";
import { Button } from "@/components/ui/button";
import { ChevronRight } from 'lucide-react';
import Logo from "@/components/ui/logo";
import { ChevronLeft,X} from "lucide-react";
import LanguageMenu from "@/components/header/language-menu";
import { itemVariants } from "@/lib/annimations/hero-variants";
import { Clapperboard } from 'lucide-react';
import Link from "next/link";

import { useIsMobile } from "@/hooks/useMobile";
const API_KEY = "c20857d1130f4dd9b51b60a3f91b7b1a"
const TMDB_BASE = 'https://api.themoviedb.org/3';

export default function Landing() {

  const isMobile = useIsMobile();

  const [movieDtails, setMovieDetails] = useState([]);
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    async function fetchTrendingMovies() {
      try {
        const res = await fetch(
          `${TMDB_BASE}/trending/movie/day?api_key=${API_KEY}`
        );
        const data = await res.json();
        console.log('Trending movies:', data.results);
        setMovies(data.results);
      } catch (err) {
        console.error('Error fetching trending movies:', err);
      }
    }

    fetchTrendingMovies();
  }, []);

  useEffect(() => {
    if (movies.length === 0) return;

    async function fetchMovieDetails(movieId:number) {
      try {
        const res = await fetch(
          `${TMDB_BASE}/movie/${movieId}?api_key=${API_KEY}`
        );
        const data = await res.json();
        setMovieDetails(data)
        console.log('Movie details:', data);
      } catch (err) {
        console.error('Error fetching movie details:', err);
      }
    }

    fetchMovieDetails(movies[0].id);
  }, [movies]);
  


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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
const [isPaused, setIsPaused] = useState(false);

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
    <main className="">
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
        {movies.map((item,index) => {
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
                  className={`absolute flex md:top-[50%] overflow-hidden
                    ${!isFullscreen ? 'rounded-md transition-all duration-300 cursor-pointer' : ''}`}
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
                    {/* <span className="text-white/15 text-6xl h-50 w-50">🎬</span>
                     */}
                    {/* <h1>heelo</h1> */}
                        <Clapperboard className={ `  ${isFullscreen? "md:!h-50 md:!w-50":"h-10 w-10 text-white/50" }`}    strokeWidth={1} />

                  </div>
                  )
                }

                  <div
                    className={`absolute inset-0 h-full bg-gradient-to-r from-[#0E0E10]/88 via-[#000000]/50 to-transparent ${
                      isFullscreen ? "block" : "hidden"
                    }`}
                  />
                  <div
                    className={`absolute inset-0 h-full bg-gradient-to-r from-[#0E0E10]/88 via-[#000000]/50 to-transparent ${
                      isFullscreen ? "block" : "hidden"
                    }`}
                  />
    
             
                 {isFullscreen && 
                  <motion.div 
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className=" absolute top-[70%] md:top-[55%]  left-4 md:left-12 
                    -translate-y-1/2  w-[min(85vw,500px)] md:w-[min(30vw,500px)]
                    text-white font-sans text-[0.85rem] font-normal
                    drop-shadow-[0_3px_8px_rgba(0,0,0,0.5)]  "
                  >
                    <h2 className="title text-4xl  md:text-5xl lg:text-6xl font-meduim text-white uppercase leading-none tracking-tight  max-w-[100%] !font-[anton]">{item.title}</h2>
                    
                    <div className="flex flex-wrap gap-1 lg:gap-3  " >
                      {
                        movieDtails?.genres?.map((info,index)=>
                        (
                            <div key={index} className="flex  items-center  gap-2 ">
                              <h3 className="font-light text-xs">{ info.name}</h3>
                              {index !== movieDtails.genres.length - 1 && (
                              <Separator orientation="vertical" className="h-4 bg-white/30"/>
                            )}
                            </div>
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-2 lg:gap-4 !mb-4 flex-wrap ">
                      <span className=" bg-[#F5C518] text-black font-black text-xs !px-1 py-4 rounded ">IMDb</span>
                      <div className="flex items-center gap-1 ">
                        <span className="text-[#F5C518] text-base">★</span>
                        <span className="text-white font-bold text-sm">{item.vote_average?.toFixed(1)}</span>
                        <span className="text-white/40 text-xs">/10</span>
                      </div>
                      <span className="text-white/30">•</span>
                      <span className="text-white/70 text-sm">{item.release_date?.split('-')[0]}</span>
                      <span className="text-white/30">•</span>       
                      <div className="flex items-center gap-1" >{formatRuntime(movieDtails.runtime)}</div>
                    </div>   

                   
                    <div className="mb-4! ">
                      <motion.p 
                         style={{
                            
                            lineHeight: "1.625",
                            maxHeight: isMobile ? "calc(1.625em * 3)" : "calc(1.625em * 4)",
                            overflow: "hidden",
                          }}

                        variants={itemVariants} className=" text-text-muted text-sm! leading-relaxed md:text-base max-w-140 ">
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
      <nav className="nav flex flex-row gap-3 md:gap-5  ">
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