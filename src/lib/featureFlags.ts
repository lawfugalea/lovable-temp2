// Feature flags for Notes V2 rollout
export const FEATURE_FLAGS = {
  NOTES_V2_ENABLED: process.env.NEXT_PUBLIC_NOTES_V2_ENABLED === 'true' || process.env.NODE_ENV === 'development',
  COLLABORATION_ENABLED: process.env.NEXT_PUBLIC_COLLABORATION_ENABLED !== 'false',
  OFFLINE_MODE_ENABLED: process.env.NEXT_PUBLIC_OFFLINE_MODE_ENABLED !== 'false',
  OCR_ENABLED: process.env.NEXT_PUBLIC_OCR_ENABLED !== 'false',
  PUSH_NOTIFICATIONS_ENABLED: process.env.NEXT_PUBLIC_PUSH_NOTIFICATIONS_ENABLED !== 'false',
  REALTIME_SYNC_ENABLED: process.env.NEXT_PUBLIC_REALTIME_SYNC_ENABLED !== 'false'
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag]
}

export function getFeatureFlagValue(flag: FeatureFlag): string | boolean {
  return FEATURE_FLAGS[flag]
}

// Helper to check if Notes V2 is enabled
export function isNotesV2Enabled(): boolean {
  return isFeatureEnabled('NOTES_V2_ENABLED')
}

// Helper to check if collaboration features are enabled
export function isCollaborationEnabled(): boolean {
  return isNotesV2Enabled() && isFeatureEnabled('COLLABORATION_ENABLED')
}

// Helper to check if offline features are enabled
export function isOfflineModeEnabled(): boolean {
  return isNotesV2Enabled() && isFeatureEnabled('OFFLINE_MODE_ENABLED')
}

// Helper to check if OCR is enabled
export function isOCREnabled(): boolean {
  return isNotesV2Enabled() && isFeatureEnabled('OCR_ENABLED')
}

// Helper to check if push notifications are enabled
export function isPushNotificationsEnabled(): boolean {
  return isNotesV2Enabled() && isFeatureEnabled('PUSH_NOTIFICATIONS_ENABLED')
}

// Helper to check if real-time sync is enabled
export function isRealtimeSyncEnabled(): boolean {
  return isNotesV2Enabled() && isFeatureEnabled('REALTIME_SYNC_ENABLED')
}

// Environment-specific feature flags
export const ENV_FEATURES = {
  DEVELOPMENT: {
    NOTES_V2_ENABLED: true,
    COLLABORATION_ENABLED: true,
    OFFLINE_MODE_ENABLED: true,
    OCR_ENABLED: true,
    PUSH_NOTIFICATIONS_ENABLED: true,
    REALTIME_SYNC_ENABLED: true
  },
  STAGING: {
    NOTES_V2_ENABLED: true,
    COLLABORATION_ENABLED: true,
    OFFLINE_MODE_ENABLED: true,
    OCR_ENABLED: true,
    PUSH_NOTIFICATIONS_ENABLED: false,
    REALTIME_SYNC_ENABLED: true
  },
  PRODUCTION: {
    NOTES_V2_ENABLED: false, // Start disabled in production
    COLLABORATION_ENABLED: false,
    OFFLINE_MODE_ENABLED: false,
    OCR_ENABLED: false,
    PUSH_NOTIFICATIONS_ENABLED: false,
    REALTIME_SYNC_ENABLED: false
  }
} as const

// Get environment-specific features
export function getEnvFeatures() {
  const env = process.env.NODE_ENV as keyof typeof ENV_FEATURES
  return ENV_FEATURES[env] || ENV_FEATURES.PRODUCTION
}

// Check if we should show the "Notes updated" toast
export function shouldShowNotesUpdateToast(): boolean {
  // Show toast if Notes V2 is enabled and user hasn't seen it before
  if (!isNotesV2Enabled()) return false
  
  const hasSeenToast = localStorage.getItem('notes-v2-toast-seen')
  return !hasSeenToast
}

// Mark that user has seen the Notes V2 toast
export function markNotesUpdateToastSeen(): void {
  localStorage.setItem('notes-v2-toast-seen', 'true')
}

// Reset feature flag visibility (for testing)
export function resetFeatureFlagVisibility(): void {
  localStorage.removeItem('notes-v2-toast-seen')
}
