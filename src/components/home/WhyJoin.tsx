import { motion } from "framer-motion"
const POINTS = [
  {
    title: "Play at your level",
    description:
      "Whether you're just starting out or you're a seasoned pro, we have a league for you. Compete with players of your skill level.",
    image: "/images/minecraft_speedrun_action_1773345645912.png",
    side: "left",
  },
  {
    title: "Weekly Races",
    description:
      "Each league has a weekly race where players compete for points. Secure the most points to get promoted to the next league.",
    image: "/images/minecraft_trophy_v2_1773345711754.png",
    side: "right",
  },
  {
    title: "Vibrant Community",
    description:
      "Join a community of passionate Minecraft speedrunners who love the game as much as you do. Compete, collaborate, and grow together.",
    image: "/images/minecraft_communities_1773345665091.png",
    side: "left",
  },
]

export function WhyJoin() {
  return (
    <section className="container mx-auto px-6 py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-16 text-center"
      >
        <h2 className="mb-4 font-minecraft text-4xl uppercase md:text-6xl">
          Why Join MSCL?
        </h2>
        <p className="mx-auto max-w-2xl font-minecraft text-lg tracking-wide text-muted-foreground">
          A competitive minecraft speedrunning league for everyone, no matter
          your skill level.
        </p>
      </motion.div>

      <div className="space-y-24">
        {POINTS.map((point) => (
          <div
            key={point.title}
            className={`flex flex-col ${point.side === "left" ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-12`}
          >
            <motion.div
              initial={{
                opacity: 0,
                x: point.side === "left" ? -20 : 20,
              }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex-1 space-y-4"
            >
              <h3 className="font-minecraft text-3xl text-primary">
                {point.title}
              </h3>
              <p className="text-xl leading-relaxed text-muted-foreground">
                {point.description}
              </p>
            </motion.div>
            <div className="w-full max-w-xl flex-1">
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.95,
                  x: point.side === "left" ? 20 : -20,
                }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative aspect-video overflow-hidden rounded-lg border-2 border-primary/20 shadow-2xl"
              >
                <div className="absolute inset-0 z-10 bg-linear-to-t from-black/40 to-transparent" />
                <img
                  src={point.image}
                  alt={point.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
