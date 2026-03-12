import { motion, useScroll, useTransform } from "framer-motion"
import { CustomButton } from "@/components/ui-custom/Button"

export function Hero() {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, 100], [1, 0])
  const indicatorY = useTransform(scrollY, [0, 100], [0, 20])
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-20">
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat opacity-80 blur-[25px] brightness-110 contrast-125"
          style={{ backgroundImage: 'url("/images/minecraft_theend.png")' }}
        />
        {/* Overlay for depth and transition */}
        <div className="absolute inset-0 bg-radial-[at_50%_40%] from-transparent via-background/40 to-background/90" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/20 to-background" />
      </div>

      <div className="relative z-10 container px-6 text-center">
        <motion.h1
          className="mb-4 font-minecraft text-5xl leading-none tracking-tight md:text-8xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          MINECRAFT
          <span className="relative mt-2 block text-primary">SPEEDRUNNING</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-12"
        >
          <span className="font-minecraft text-3xl tracking-widest text-muted-foreground/80 uppercase md:text-5xl">
            Community Leagues
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <CustomButton size="lg" className="h-14 px-12 text-lg">
            Join Now
          </CustomButton>
          <CustomButton variant="outline" size="lg" className="h-14 px-6">
            Learn More
          </CustomButton>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        style={{ opacity, y: indicatorY }}
        className="pointer-events-none absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="font-minecraft text-xs tracking-widest text-muted-foreground/60 uppercase">
          Learn More
        </span>
        <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-primary/20 p-1.5 backdrop-blur-sm">
          <motion.div
            animate={{ 
              y: [0, 12, 0],
              opacity: [1, 0.5, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-2 w-1 rounded-full bg-primary"
          />
        </div>
      </motion.div>

      {/* Decorative Minecraft-like pixel dots */}
      <div className="absolute bottom-10 left-10 h-2 w-2 bg-primary/20" />
      <div className="absolute bottom-20 left-15 h-2 w-2 bg-primary/10" />
      <div className="absolute top-1/4 right-10 h-2 w-2 bg-primary/20" />
      <div className="absolute right-20 bottom-1/4 h-2 w-2 bg-primary/15" />
    </section>
  )
}
