import * as React from "react"
import { Card as BaseCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface CustomCardProps extends React.ComponentProps<typeof BaseCard> {
  animate?: boolean
}

export function CustomCard({ className, animate = true, children, ...props }: CustomCardProps) {
  const CardComponent = (
    <BaseCard
      className={cn(
        "border-2 transition-colors duration-200 hover:border-primary/50",
        "relative overflow-hidden group/card",
        className
      )}
      {...props}
    >
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform duration-500 group-hover/card:scale-150 pointer-events-none" />
      {children}
    </BaseCard>
  )

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {CardComponent}
      </motion.div>
    )
  }

  return CardComponent
}

export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
