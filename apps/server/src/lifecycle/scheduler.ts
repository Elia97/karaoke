import type {
  PendingActionDto,
  PendingActionsService,
} from "./pending-actions.service"

export type SchedulerConfig = {
  pendingActions: PendingActionsService
  onAction: (action: PendingActionDto) => Promise<void>
  intervalMs?: number
}

export type Scheduler = ReturnType<typeof createScheduler>

export function createScheduler(config: SchedulerConfig) {
  const intervalMs = config.intervalMs ?? 5000
  let timer: ReturnType<typeof setInterval> | null = null
  let running = false

  async function tick(): Promise<void> {
    if (running) return
    running = true
    try {
      const due = await config.pendingActions.claimDue(new Date())
      for (const action of due) {
        try {
          await config.onAction(action)
        } catch (e) {
          console.error("[scheduler] action failed", action.type, action.id, e)
        }
      }
    } catch (e) {
      console.error("[scheduler] tick error", e)
    } finally {
      running = false
    }
  }

  function start(): void {
    if (timer) return
    timer = setInterval(() => {
      void tick()
    }, intervalMs)
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return { start, stop, tick }
}
