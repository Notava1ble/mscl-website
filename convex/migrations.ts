import { paginationOptsValidator } from "convex/server"
import { internal } from "./_generated/api"
import { internalMutation } from "./_generated/server"
import { calculateRegistrationAverageTimeMs } from "./lib/registrationAverage"

/**
 * Populates averageTimeMs for registrations that existed before that field was
 * introduced. Start it once with
 * { paginationOpts: { cursor: null, numItems: 64 } }; subsequent batches
 * schedule themselves until every registration has been processed.
 */
export const backfillRegistrationAverageTimes = internalMutation({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("registrations")
      .paginate(args.paginationOpts)

    for (const registration of page.page) {
      const competition = await ctx.db.get(registration.competitionId)
      if (!competition) {
        console.warn(
          `Skipping registration ${registration._id}: competition ${registration.competitionId} was not found.`
        )
        continue
      }

      const results = await ctx.db
        .query("matchResults")
        .withIndex("by_player_and_competition", (q) =>
          q
            .eq("playerId", registration.playerId)
            .eq("competitionId", registration.competitionId)
        )
        .take(128)

      await ctx.db.patch(registration._id, {
        averageTimeMs: calculateRegistrationAverageTimeMs(
          results,
          competition.maxTimeLimitMs
        ),
      })
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillRegistrationAverageTimes,
        {
          paginationOpts: {
            ...args.paginationOpts,
            cursor: page.continueCursor,
          },
        }
      )
    }

    return {
      processed: page.page.length,
      isDone: page.isDone,
    }
  },
})
