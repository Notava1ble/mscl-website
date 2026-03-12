import { motion } from "framer-motion"
import { CustomButton } from "@/components/ui-custom/Button"

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/20 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            scale: [1.1, 1, 1.1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full" 
        />
      </div>

      <div className="container relative z-10 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-6 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-primary uppercase"
        >
          Minecraft Speedrunning
        </motion.div>

        <motion.h1 
          className="text-5xl md:text-8xl font-minecraft mb-4 tracking-tight leading-none"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          MINECRAFT <br />
          <span className="text-primary block mt-2 relative">
            SPEEDRUNNING
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1, delay: 1 }}
              className="absolute bottom-0 left-0 h-1 bg-primary/30"
            />
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-12"
        >
          <span className="text-3xl md:text-5xl font-minecraft text-muted-foreground/80 tracking-widest uppercase">
            Community Leagues
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <CustomButton size="lg" className="px-12 h-14 text-lg">
            Join Now
          </CustomButton>
          <CustomButton variant="outline" size="lg" className="h-14">
            Learn More
          </CustomButton>
        </motion.div>
      </div>

      {/* Decorative Minecraft-like pixel dots */}
      <div className="absolute bottom-10 left-10 w-2 h-2 bg-primary/20" />
      <div className="absolute bottom-20 left-15 w-2 h-2 bg-primary/10" />
      <div className="absolute top-1/4 right-10 w-2 h-2 bg-primary/20" />
      <div className="absolute bottom-1/4 right-20 w-2 h-2 bg-primary/15" />
    </section>
  )
}
