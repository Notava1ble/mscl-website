import { ChevronLeft, ChevronRight } from "lucide-react"
import { CustomButton } from "@/components/ui-custom/Button"
import type { Id } from "../../../convex/_generated/dataModel"

interface Week {
  _id: Id<"weeks">
  weekNumber: number
  isCurrent: boolean
}

interface WeekSelectorProps {
  weeks: Week[] | undefined
  selectedWeekId: string | null
  onSelect: (weekId: string) => void
}

export function WeekSelector({
  weeks,
  selectedWeekId,
  onSelect,
}: WeekSelectorProps) {
  if (!weeks || weeks.length === 0 || !selectedWeekId) {
    return <div className="h-10 w-48 animate-pulse rounded bg-muted"></div>
  }

  const currentIndex = weeks.findIndex((w) => w._id === selectedWeekId)
  const currentWeek = weeks[currentIndex]

  // weeks are sorted descending, so index 0 is latest
  const hasNext = currentIndex > 0 // next is index - 1 (newer)
  const hasPrev = currentIndex < weeks.length - 1 // prev is index + 1 (older)

  const handlePrev = () => {
    if (hasPrev) onSelect(weeks[currentIndex + 1]._id)
  }

  const handleNext = () => {
    if (hasNext) onSelect(weeks[currentIndex - 1]._id)
  }

  return (
    <div className="flex items-center gap-4">
      <CustomButton
        variant="ghost"
        size="icon"
        onClick={handlePrev}
        disabled={!hasPrev}
        className="text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-5 w-5" />
      </CustomButton>

      <div className="min-w-[120px] text-center">
        <h3 className="text-lg font-medium tracking-tight text-foreground">
          Week {currentWeek.weekNumber}
        </h3>
      </div>

      <CustomButton
        variant="ghost"
        size="icon"
        onClick={handleNext}
        disabled={!hasNext}
        className="text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="h-5 w-5" />
      </CustomButton>
    </div>
  )
}
