import { motion } from "framer-motion"
import { CustomButton } from "@/components/ui-custom/Button"

export function FooterCTA() {
  return (
    <>
      <section className="container mx-auto border-t border-primary/10 px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl"
        >
          <h2 className="mb-6 font-minecraft text-4xl tracking-tighter uppercase md:text-7xl">
            Ready to <span className="text-primary italic">Speedrun?</span>
          </h2>

          <p className="mx-auto mb-12 max-w-2xl text-xl text-muted-foreground">
            The next season is about to start. Secure your spot in the league
            and show the world what you're capable of.
          </p>

          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
            <CustomButton size="lg" className="h-16 px-16 text-xl">
              Join the League
            </CustomButton>
            <CustomButton
              variant="outline"
              size="lg"
              className="h-16 px-16 text-xl"
              minecraft={false}
            >
              View Weekly Stats
            </CustomButton>
          </div>

          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-16 text-primary/40"
          >
            <div className="font-minecraft text-sm tracking-[0.3em] uppercase">
              Minecraft Community Leagues © 2026
            </div>
          </motion.div>
        </motion.div>
      </section>
      <div className="mb-4 text-center text-sm text-muted">
        This is not an official Minecraft product. Not approved by or associated
        with Mojang or Microsoft.
      </div>
    </>
  )
}
