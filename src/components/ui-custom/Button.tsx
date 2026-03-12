import { Button as BaseButton } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface CustomButtonProps extends React.ComponentProps<typeof BaseButton> {
  minecraft?: boolean
}

export function CustomButton({ className, minecraft = true, ...props }: CustomButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="inline-block"
    >
      <BaseButton
        className={cn(
          "relative transition-all duration-200 overflow-hidden",
          minecraft && "font-minecraft tracking-wider uppercase",
          // Add a subtle "pixel" border look for a modern minecraft feel
          "after:absolute after:inset-0 after:border-b-4 after:border-black/20 hover:after:border-black/10 active:after:border-transparent",
          className
        )}
        {...props}
      />
    </motion.div>
  )
}
