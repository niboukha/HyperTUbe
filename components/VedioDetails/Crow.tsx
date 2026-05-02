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
export default function Crow({ crow }) {
    const [open, setOpen] = useState(false);

  return (
    <>


      <AvatarGroup className="border-none !-space-x-4">
        {crow.map((user, index) => (
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
            <Avatar className="h-10 w-10 md:h-16 md:w-16 border border-white/30 ring-0 shadow-none">
              <AvatarImage src={user.src} alt={user.name} />
              <AvatarFallback>{user.username}</AvatarFallback>
            </Avatar>
            <p className="text-white/70 text-sm mt-1 font-[poppins]">
              {user.name}
            </p>
          </motion.div>
        ))}

        {/* Plus count */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.4,
            delay: crow.length * 0.1,
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          whileHover={{ y: -6, scale: 1.1 }}
        >
          <AvatarGroupCount           onClick={() => setOpen(true)}
            className="h-10 w-10 md:h-16 md:w-16 bg-[#FFFFFF]/14 backdrop-blur-lg !ring-0 !shadow-none">
            <PlusIcon className="!h-5 !w-5 md:!h-7 md:!w-7 font-bold" color="#ffffff" />
          </AvatarGroupCount>
        </motion.div>

      </AvatarGroup>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!p-4  bg-[#FFFFFF]/14 backdrop-blur-lg  border border-white/10 rounded-2xl text-white !max-w-sm  w-70 md:w-sm p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-white text-base font-semibold font-[poppins]">
              Cast & Crew
            </DialogTitle>
          </DialogHeader>

          <Separator className="bg-white/10" />

          <ScrollArea className=" max-h-sm h-sm md:h-100 ">
            <ul className="py-2 px-2 flex flex-col gap-2">
              {crow.map((user, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Avatar className=" h-10 w-10 md:h-15 md:w-15 border border-white/20 shrink-0">
                    <AvatarImage src={user.src} alt={user.name} />
                    <AvatarFallback className="text-xs bg-white/10 text-white">
                      {user.username}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-white text-sm font-medium truncate font-[poppins]">
                      {user.name}
                    </span>
                    <span className="text-white/40 text-xs truncate">
                      @{user.username.toLowerCase()}
                    </span>
                  </div>
                  
                </motion.li>
              ))}
            </ul>
          </ScrollArea>

          <div className="pb-3" />
        </DialogContent>
      </Dialog>
    </>
  );
}