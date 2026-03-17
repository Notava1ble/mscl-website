import { Button as BaseButton } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
    <BaseButton
      className={cn(
        "relative overflow-hidden transition-all duration-200 active:scale-95",
        minecraft && "font-minecraft tracking-wider uppercase",
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
  )
}
