import { motion } from "framer-motion"
import { CustomButton } from "@/components/ui-custom/Button"

export function FooterCTA() {
  return (
    <section className="py-24 container px-6 text-center border-t border-primary/10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto"
      >
        <h2 className="text-4xl md:text-7xl font-minecraft mb-6 uppercase tracking-tighter">
          Ready to <span className="text-primary italic">Speedrun?</span>
        </h2>
        
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          The next season is about to start. Secure your spot in the league and show the world what you're capable of.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <CustomButton size="lg" className="h-16 px-16 text-xl">
            Join the League
          </CustomButton>
          <CustomButton variant="outline" size="lg" className="h-16 px-16 text-xl" minecraft={false}>
            View Weekly Stats
          </CustomButton>
        </div>

        <motion.div 
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-16 text-primary/40"
        >
          <div className="font-minecraft text-sm tracking-[0.3em] uppercase">Minecraft Community Leagues © 2026</div>
        </motion.div>
      </motion.div>
    </section>
  )
}
