import { query } from "./_generated/server"

export const getCurrentWeek = query({
  handler: async (ctx) => {
    const currentWeek = await ctx.db
      .query("weeks")
      .withIndex("by_current", (q) => q.eq("isCurrent", true))
      .first()
    return currentWeek
  },
})
