/**
 * Re-exports from the FeatureFlagsContext for a clean import path.
 *
 * Usage:
 *   import { useFeatureFlag } from '@/hooks/use-feature-flag'
 *   const aiEnabled = useFeatureFlag('aiJobMatching')
 */
export { useFeatureFlag, useFeatureFlags } from '@/contexts/feature-flags-context'
