import { motion, useScroll, useTransform } from "framer-motion"
import { CustomButton } from "@/components/ui-custom/Button"
import { ChevronDown } from "lucide-react"

export function Hero() {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, 100], [1, 0])
  const indicatorY = useTransform(scrollY, [0, 100], [0, 20])
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-20">
      {/* Dynamic Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-primary/20 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full bg-primary/10 blur-[120px]"
        />
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
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none"
      >
        <span className="text-xs font-minecraft uppercase tracking-widest text-muted-foreground/60">
          Learn More
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <ChevronDown className="h-6 w-6 text-primary" />
        </motion.div>
      </motion.div>

      {/* Decorative Minecraft-like pixel dots */}
      <div className="absolute bottom-10 left-10 h-2 w-2 bg-primary/20" />
      <div className="absolute bottom-20 left-15 h-2 w-2 bg-primary/10" />
      <div className="absolute top-1/4 right-10 h-2 w-2 bg-primary/20" />
      <div className="absolute right-20 bottom-1/4 h-2 w-2 bg-primary/15" />
    </section>
  )
}
