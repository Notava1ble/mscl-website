import { motion } from "framer-motion"
import { CustomButton } from "@/components/ui-custom/Button"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Join", href: "/join" },
  { name: "Week", href: "/week" },
  { name: "Leaderboard", href: "/leaderboard" },
  { name: "Info", href: "/info" },
  { name: "Discord", href: "https://discord.gg/mscl", external: true },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
        isScrolled ? "bg-background/80 backdrop-blur-md border-b" : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <span className="font-minecraft text-2xl tracking-tighter text-primary group-hover:scale-110 transition-transform">
            MSCL
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-sm font-medium hover:text-primary transition-colors hover:font-minecraft"
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="md:hidden">
          {/* Mobile menu could go here, keeping it minimalist for now */}
          <CustomButton variant="outline" size="sm">Menu</CustomButton>
        </div>
      </div>
    </motion.nav>
  )
}
