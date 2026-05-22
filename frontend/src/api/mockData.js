export const MOCK_CLUSTERS = [
  { id: 1, system: 'Edify', topic: 'Data Access & Pipeline Errors', count: 15, threshold_hit: true, agent2_triggered: true },
  { id: 2, system: 'Banner', topic: 'Authentication & Login Issues', count: 12, threshold_hit: true, agent2_triggered: false },
  { id: 3, system: 'Canvas', topic: 'LMS Grade Sync Failures', count: 9, threshold_hit: false, agent2_triggered: false },
  { id: 4, system: 'OneDrive', topic: 'Cloud Storage Sync Errors', count: 8, threshold_hit: false, agent2_triggered: false },
  { id: 5, system: 'Workday', topic: 'Payroll Data Visibility', count: 6, threshold_hit: false, agent2_triggered: false },
]

export const MOCK_STATS = {
  tickets_today: 47,
  auto_resolution_rate: 68.0,
  dict_jobs_this_week: 3,
  students_flagged_this_week: 4,
  top_clusters: MOCK_CLUSTERS,
}

export const MOCK_FLAGS = [
  {
    id: 1, student_id: 'STU-0042', risk_score: 87, risk_level: 'critical',
    risk_factors: ['No Canvas logins in 11 days', '3 missing assignments', 'Grade dropped to 61%'],
    recommended_action: 'Immediate outreach. Schedule check-in within 24 hours.',
    status: 'pending', created_at: new Date().toISOString(),
  },
]
