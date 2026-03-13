import { query } from "./_generated/server"

export const listLeagues = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("leagues")
      .withIndex("by_tier_level")
      .order("asc")
      .collect()
  },
})
