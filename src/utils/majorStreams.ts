import type { Major } from '../types'

export function getInitialStreamIndex(major: Major): number {
  const streams = major.streams ?? []
  const preferredIndex = major.defaultStreamCode
    ? streams.findIndex(stream => stream.code === major.defaultStreamCode)
    : -1

  if (preferredIndex >= 0) return preferredIndex
  return major.requireStreamSelection && streams.length > 0 ? 0 : -1
}

export function canUseMajorLevelPlan(major: Major): boolean {
  return !major.requireStreamSelection
}
