// ── Shared constants ─────────────────────────────────
// Single source of truth for display config used across pages.

export const POLICY_TYPE_CONFIG: Record<string, { icon: string; label: string; group: 'personal' | 'business' | 'both' }> = {
  // Personal — vehicles
  auto: { icon: '🚗', label: 'Auto', group: 'personal' },
  motorcycle: { icon: '🏍️', label: 'Motorcycle', group: 'personal' },
  boat: { icon: '⛵', label: 'Boat / Watercraft', group: 'personal' },
  rv: { icon: '🚐', label: 'RV / Motor Home', group: 'personal' },
  // Personal — property
  home: { icon: '🏠', label: 'Home', group: 'personal' },
  renters: { icon: '🏢', label: 'Renters', group: 'personal' },
  flood: { icon: '🌊', label: 'Flood', group: 'personal' },
  earthquake: { icon: '🌋', label: 'Earthquake', group: 'personal' },
  // Personal — health & life
  health: { icon: '🏥', label: 'Health', group: 'personal' },
  dental: { icon: '🦷', label: 'Dental', group: 'personal' },
  vision: { icon: '👓', label: 'Vision', group: 'personal' },
  life: { icon: '❤️', label: 'Life', group: 'personal' },
  disability: { icon: '🩼', label: 'Disability', group: 'personal' },
  pet: { icon: '🐾', label: 'Pet', group: 'personal' },
  // Both
  liability: { icon: '🛡️', label: 'Liability', group: 'both' },
  umbrella: { icon: '☂️', label: 'Umbrella', group: 'both' },
  // Business
  general_liability: { icon: '🛡️', label: 'General Liability', group: 'business' },
  professional_liability: { icon: '💼', label: 'Professional (E&O)', group: 'business' },
  commercial_property: { icon: '🏭', label: 'Commercial Property', group: 'business' },
  commercial_auto: { icon: '🚚', label: 'Commercial Auto', group: 'business' },
  cyber: { icon: '💻', label: 'Cyber Liability', group: 'business' },
  bop: { icon: '📦', label: "Business Owner's", group: 'business' },
  workers_comp: { icon: '👷', label: 'Workers Comp', group: 'business' },
  directors_officers: { icon: '👔', label: 'Directors & Officers', group: 'business' },
  epli: { icon: '👥', label: 'Employment Practices', group: 'business' },
  inland_marine: { icon: '📦', label: 'Inland Marine', group: 'business' },
  other: { icon: '📋', label: 'Other', group: 'both' },
};

export const POLICY_TYPES = Object.keys(POLICY_TYPE_CONFIG);

/** Get display config for a policy type, with fallback */
export function getPolicyTypeDisplay(type: string): { icon: string; label: string } {
  const config = POLICY_TYPE_CONFIG[type.toLowerCase()];
  if (config) return config;
  return { icon: '📋', label: type.charAt(0).toUpperCase() + type.slice(1) };
}

/** Status badge colors */
export const STATUS_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  active: { bg: 'var(--color-success-light)', fg: 'var(--color-success-dark)', border: 'var(--color-success-border)' },
  expired: { bg: 'var(--color-danger-light)', fg: 'var(--color-danger-dark)', border: 'var(--color-danger-border)' },
  archived: { bg: '#f3f4f6', fg: '#6b7280', border: '#e5e7eb' },
};

/** Gap severity colors */
export const SEVERITY_COLORS: Record<string, { bg: string; fg: string; icon: string }> = {
  high: { bg: 'var(--color-danger-light)', fg: 'var(--color-danger-dark)', icon: '🚨' },
  medium: { bg: 'var(--color-warning-light)', fg: 'var(--color-warning-dark)', icon: '⚠️' },
  low: { bg: 'var(--color-info-light)', fg: 'var(--color-info-dark)', icon: 'ℹ️' },
  info: { bg: '#f3f4f6', fg: '#6b7280', icon: '💡' },
};

/** Certificate status colors */
export const CERT_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: 'var(--color-success-light)', fg: 'var(--color-success-dark)' },
  expiring: { bg: 'var(--color-warning-light)', fg: 'var(--color-warning-dark)' },
  expired: { bg: 'var(--color-danger-light)', fg: 'var(--color-danger-dark)' },
  pending: { bg: '#f3f4f6', fg: '#374151' },
};

/** Alert severity config (used by audit page) */
export const ALERT_SEVERITY_CONFIG: Record<string, { bg: string; fg: string; label: string; icon: string }> = {
  critical: { bg: 'var(--color-danger-light)', fg: 'var(--color-danger-dark)', label: 'Critical', icon: '🚨' },
  warning: { bg: 'var(--color-warning-light)', fg: 'var(--color-warning-dark)', label: 'Warning', icon: '⚠️' },
  info: { bg: 'var(--color-info-light)', fg: 'var(--color-info-dark)', label: 'Info', icon: 'ℹ️' },
};

/** Document types */
export const DOC_TYPES: Record<string, string> = {
  policy: 'Full Policy',
  dec_page: 'Declarations',
  insurance_card: 'ID Card',
  endorsement: 'Endorsement',
  certificate: 'Certificate',
  other: 'Other',
};

/** Emergency-priority order for grouping policies */
export const EMERGENCY_TYPE_ORDER = ['auto', 'motorcycle', 'home', 'health', 'dental', 'vision', 'renters', 'life', 'disability', 'pet', 'boat', 'rv', 'liability', 'umbrella', 'workers_comp', 'other'];
