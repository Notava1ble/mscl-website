import { motion, AnimatePresence } from "framer-motion"
import { CustomButton } from "@/components/ui-custom/Button"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Join", href: "/join" },
  { name: "Week", href: "/week" },
  { name: "Leaderboard", href: "/leaderboard" },
  { name: "Info", href: "/info" },
  { name: "Discord", href: "https://discord.gg/zzptZsec42", external: true },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Lock scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
  }, [isMenuOpen])

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 right-0 left-0 z-50 px-6 py-4 transition-all duration-300",
          isScrolled || isMenuOpen
            ? "border-b bg-background/80 backdrop-blur-md"
            : "bg-transparent"
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="group flex items-center gap-2">
            <span className="font-minecraft text-2xl tracking-tighter text-primary transition-transform group-hover:scale-110">
              MSCL
            </span>
          </a>

          {/* Desktop Links */}
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="group relative flex flex-col items-center justify-center text-sm font-medium transition-colors hover:text-primary"
              >
                <span className="transition-all group-hover:font-minecraft">
                  {link.name}
                </span>
                {/* Reserve space for the Minecraft font to prevent layout shift */}
                <span
                  className="invisible h-0 font-minecraft select-none"
                  aria-hidden="true"
                >
                  {link.name}
                </span>
              </a>
            ))}
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-md p-2 text-foreground transition-colors hover:bg-muted"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 flex flex-col bg-background px-6 pt-24 md:hidden"
          >
            <div className="flex flex-col gap-6">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  onClick={() => setIsMenuOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="font-minecraft text-3xl transition-colors hover:text-primary"
                >
                  {link.name}
                </motion.a>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: NAV_LINKS.length * 0.05 }}
                className="mt-8 border-t pt-8"
              >
                <CustomButton className="w-full py-6 text-center text-xl">
                  Join The League
                </CustomButton>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
