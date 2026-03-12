import { motion } from "framer-motion"
import { CustomCard, CardHeader, CardTitle, CardContent } from "@/components/ui-custom/Card"

const POINTS = [
  {
    title: "Competitive Spirit",
    description: "Join a community of the fastest players in the world. Compete in weekly leagues and climb the leaderboard.",
    image: "/images/minecraft_speedrun_action_1773345645912.png",
    side: "left"
  },
  {
    title: "Vibrant Community",
    description: "Connect with fellow runners, share strategies, and participate in events that go beyond just racing.",
    image: "/images/minecraft_communities_1773345665091.png",
    side: "right"
  },
  {
    title: "Epic Rewards",
    description: "Earn your place in MSCL history. Exclusive trophies, discord roles, and the ultimate bragging rights.",
    image: "/images/minecraft_trophy_v2_1773345711754.png",
    side: "left"
  }
]

export function WhyJoin() {
  return (
    <section className="py-24 container px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl md:text-6xl mb-4 font-minecraft uppercase">Why Join MSCL?</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          The ultimate platform for Minecraft speedrunners and enthusiasts.
        </p>
      </motion.div>

      <div className="space-y-24">
        {POINTS.map((point, index) => (
          <div 
            key={point.title}
            className={`flex flex-col ${point.side === 'left' ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12`}
          >
            <div className="flex-1">
              <CustomCard className="border-none bg-accent/50 p-6">
                <CardHeader>
                  <CardTitle className="text-2xl font-minecraft text-primary">{point.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg leading-relaxed">{point.description}</p>
                </CardContent>
              </CustomCard>
            </div>
            <div className="flex-1 w-full max-w-xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: point.side === 'left' ? 20 : -20 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative aspect-video rounded-lg overflow-hidden border-2 border-primary/20 shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                <img 
                  src={point.image} 
                  alt={point.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
