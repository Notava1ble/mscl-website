import { motion } from "framer-motion"
import {
  CustomCard,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui-custom/Card"

const POINTS = [
  {
    title: "Competitive Spirit",
    description:
      "Join a community of the fastest players in the world. Compete in weekly leagues and climb the leaderboard.",
    image: "/images/minecraft_speedrun_action_1773345645912.png",
    side: "left",
  },
  {
    title: "Vibrant Community",
    description:
      "Connect with fellow runners, share strategies, and participate in events that go beyond just racing.",
    image: "/images/minecraft_communities_1773345665091.png",
    side: "right",
  },
  {
    title: "Epic Rewards",
    description:
      "Earn your place in MSCL history. Exclusive trophies, discord roles, and the ultimate bragging rights.",
    image: "/images/minecraft_trophy_v2_1773345711754.png",
    side: "left",
  },
]

export function WhyJoin() {
  return (
    <section className="container mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-16 text-center"
      >
        <h2 className="mb-4 font-minecraft text-4xl uppercase md:text-6xl">
          Why Join MSCL?
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          The ultimate platform for Minecraft speedrunners and enthusiasts.
        </p>
      </motion.div>

      <div className="space-y-24">
        {POINTS.map((point, index) => (
          <div
            key={point.title}
            className={`flex flex-col ${point.side === "left" ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-12`}
          >
            <div className="flex-1">
              <CustomCard className="border-none bg-accent/50 p-6">
                <CardHeader>
                  <CardTitle className="font-minecraft text-2xl text-primary">
                    {point.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg leading-relaxed">{point.description}</p>
                </CardContent>
              </CustomCard>
            </div>
            <div className="w-full max-w-xl flex-1">
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.95,
                  x: point.side === "left" ? 20 : -20,
                }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative aspect-video overflow-hidden rounded-lg border-2 border-primary/20 shadow-2xl"
              >
                <div className="absolute inset-0 z-10 bg-linear-to-t from-black/40 to-transparent" />
                <img
                  src={point.image}
                  alt={point.title}
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
