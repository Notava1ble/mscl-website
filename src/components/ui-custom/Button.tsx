import { Button as BaseButton } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface CustomButtonProps extends React.ComponentProps<typeof BaseButton> {
  href?: string
  target?: "_self" | "_blank"
  minecraft?: boolean
}

export function CustomButton({
  className,
  href,
  target = "_self",
  minecraft = true,
  onClick,
  ...props
}: CustomButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="inline-block"
    >
      <BaseButton
        className={cn(
          "relative overflow-hidden transition-all duration-200",
          minecraft && "font-minecraft tracking-wider uppercase",
          // Add a subtle border look
          "after:absolute after:inset-0 after:border-b-4 after:border-black/20 hover:after:border-black/10 active:after:border-transparent",
          className
        )}
        onClick={
          href
            ? (e) => {
                onClick?.(e)
                if (e.defaultPrevented) return
                if (props.disabled) return
                if (typeof window === "undefined") return
                window.open(href, target)
              }
            : onClick
        }
        {...props}
      />
    </motion.div>
  )
}
