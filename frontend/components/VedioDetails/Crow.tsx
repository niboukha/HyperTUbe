import { motion } from "framer-motion";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  AvatarGroupCount
} from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { CastMember, CrewMember } from "@/types/movie";


export default function Crow({ cast, crew }: { cast: CastMember[], crew: any }) {
  const [open, setOpen] = useState(false);
  const MAX_VISIBLE = 5

  if (cast.length === 0 && crew.length === 0) return null
  if (!cast?.length) return null
  
  const visibleCast = cast.slice(0, MAX_VISIBLE)
  
  console.log("Cast component:", cast)
  
  console.log("Crew component:", crew)
  const directors =  crew.directors
  const producers = crew.producers

  return (
    <>
      <AvatarGroup className="border-none !-space-x-4">
        {visibleCast.map((person, index) => (
          <motion.div
            key={index}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            whileHover={{ y: -6, scale: 1.1 }}
          >
            <Avatar className="h-10 w-10 md:h-13 md:w-13 border border-white/10 ring-0 shadow-none">
              <AvatarImage src={person.profile_path || undefined} alt={person.name} />
              <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </motion.div>
        ))}

        {/* Plus count */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.4,
            delay: (cast.length < MAX_VISIBLE)?  cast.length*0.1 : MAX_VISIBLE*0.1,
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          whileHover={{ y: -6, scale: 1.1 }}
        >
          <AvatarGroupCount  onClick={() => setOpen(true)}
            className="h-10 w-10 md:h-13 md:w-13 bg-tertiary backdrop-blur-lg !ring-0 !shadow-none">
            <PlusIcon className="!h-5 !w-5 md:!h-7 md:!w-7 font-bold" color="#ffffff" />
          </AvatarGroupCount>
        </motion.div>

      </AvatarGroup>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className=" !p-4 bg-[#FFFFFF]/14 backdrop-blur-lg  border border-white/10 rounded-2xl text-white !max-w-sm  w-70 md:w-sm overflow-hidden">
          <DialogHeader className="px-2! pt-1!">
            <DialogTitle className="text-white text-base font-semibold font-[bebasNeue]!">
              Cast & Crew
            </DialogTitle>    
          </DialogHeader>

          <Separator className="bg-white/10" />

          <ScrollArea className=" h-80 md:h-100  ">
            <ul className="py-2 px-2 flex flex-col gap-4">

              {/* directors */}
              <section className="">
              <p className="!mb-2 text-white/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
                Directors
              </p>
              <div className="flex flex-col gap-1">
                  {
                    directors?.length >0 ?
                      directors.map((person:CrewMember, index:number) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center !gap-3 px-3 py-2.5 rounded-xl hover:rounded-[100px] hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Avatar className=" h-10 w-10 md:h-15 md:w-15 border border-white/20 shrink-0">
                            <AvatarImage src={`https://image.tmdb.org/t/p/w185/${person.profile_path}` || undefined} alt={person.name} />
                            <AvatarFallback className="text-xs bg-white/10 text-white">
                              {person.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-white text-sm font-medium truncate font-[poppins]">
                              {person.name}
                            </span>
                            <span className="text-white/40 text-xs truncate">
                              @{person.name.toLowerCase()}
                            </span>
                          </div>
                          
                        </motion.li>
                      )
                    )
                    :
                    (
                      <div className="flex !px-8">
                        <p className="text-white/20 text-xs mt-1!">
                          No person find
                        </p>
                      </div>
                    )
                    
                  }

              </div>
              </section>
              {/* producers */}
              <section className="">
                <p className="!mb-2 text-white/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
                  producers
                </p>
                <div className="flex flex-col gap-1">
                    {
                      producers?.length > 0 ?
                        producers.map((person:CrewMember, index:number) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center !gap-3 px-3 py-2.5 rounded-xl hover:rounded-[100px] hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <Avatar className=" h-10 w-10 md:h-15 md:w-15 border border-white/20 shrink-0">
                              <AvatarImage src={`https://image.tmdb.org/t/p/w185/${person.profile_path}` || undefined} alt={person.name} />
                              <AvatarFallback className="text-xs bg-white/10 text-white">
                                {person.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-white text-sm font-medium truncate font-[poppins]">
                                {person.name}
                              </span>
                              <span className="text-white/40 text-xs truncate">
                                @{person.name.toLowerCase()}
                              </span>
                            </div>
                            
                          </motion.li>
                        )
                      )
                      :
                      (
                        <div className="flex !px-8">
                          <p className="text-white/20 text-xs mt-1!">
                            No person find
                          </p>
                        </div>
                      )
                      
                    }

                </div>
              </section>
              
              {/* actors */}
              
              <section>
                <p className=" !mb-2 text-white/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
                    Actors
                </p>
                <div className="flex flex-col gap-1">
                  {
                    cast?.length > 0 ?
                      cast.map((person, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:rounded-[100px] hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Avatar className=" h-10 w-10 md:h-15 md:w-15 border border-white/20 shrink-0">
                            <AvatarImage src={person.profile_path || undefined} alt={person.name} />
                            <AvatarFallback className="text-xs bg-white/10 text-white">
                              {person.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-white text-sm font-medium truncate font-[poppins]">
                              {person.name}
                            </span>
                            <span className="text-white/40 text-xs truncate">
                              @{person.name.toLowerCase()}
                            </span>
                          </div>
                          
                        </motion.li>
                      ))
                      :
                      (
                        <div className="flex !px-8">
                          <p className="text-white/20 text-xs mt-1!">
                            No person find
                          </p>
                        </div>
                      )

                  }
                  
                </div>
              </section>
              
            </ul>

          </ScrollArea>

          <div className="pb-3" />
        </DialogContent>
      </Dialog>
    </>
  );
}