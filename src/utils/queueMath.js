export const DEFAULT_DURATION = 10

export function urgencyWeight(urgency) { return urgency === 'Urgent' ? 2 : 1 }

export function activeQueue(patients) {
  return patients.filter(p => p.status === 'Waiting' || p.status === 'Called')
    .sort((a, b) => urgencyWeight(b.urgency) - urgencyWeight(a.urgency) || new Date(a.arrivedAt) - new Date(b.arrivedAt))
}

export function averageDuration(patients) {
  const recent = patients.filter(p => p.status === 'Completed' && p.duration).slice(-3)
  return recent.length ? Math.round(recent.reduce((sum, p) => sum + p.duration, 0) / recent.length) : DEFAULT_DURATION
}

export function queueDetails(patients, id) {
  const queue = activeQueue(patients)
  const index = queue.findIndex(p => p.id === id)
  const patient = patients.find(p => p.id === id)
  const avg = averageDuration(patients)
  return { patient, position: index < 0 ? null : index + 1, ahead: Math.max(0, index), eta: Math.max(0, index) * avg, average: avg, queue }
}
