// Composable for managing user notifications/toasts
// Shows feedback for game actions, errors, and state changes
import { ref, type Ref } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  timestamp: number
  duration?: number // ms, undefined = persistent
}

const notifications: Ref<Notification[]> = ref([])

/**
 * Show a notification toast.
 * Auto-dismisses after duration (default 3s).
 */
export function useNotification() {
  /**
   * Add notification to display
   */
  function notify(
    message: string,
    type: NotificationType = 'info',
    duration: number = 3000
  ): void {
    const id = `${Date.now()}-${Math.random()}`
    const notification: Notification = {
      id,
      type,
      message,
      timestamp: Date.now(),
      duration,
    }

    notifications.value.push(notification)

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, duration)
    }
  }

  /**
   * Remove notification by id
   */
  function dismiss(id: string): void {
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  /**
   * Clear all notifications
   */
  function clearAll(): void {
    notifications.value = []
  }

  /**
   * Convenience methods
   */
  function success(message: string, duration?: number): void {
    notify(message, 'success', duration)
  }

  function error(message: string, duration?: number): void {
    notify(message, 'error', duration ?? 5000) // Errors stay longer
  }

  function warning(message: string, duration?: number): void {
    notify(message, 'warning', duration ?? 4000)
  }

  function info(message: string, duration?: number): void {
    notify(message, 'info', duration)
  }

  return {
    notifications,
    notify,
    dismiss,
    clearAll,
    success,
    error,
    warning,
    info,
  }
}
