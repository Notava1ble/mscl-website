// src/components/ConvexClientProvider.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react"
import type { ReactNode } from "react"

const convex = new ConvexReactClient(process.env.PUBLIC_CONVEX_URL!)

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode
}) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
