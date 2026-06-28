/**
 * Known institutional email domains mapped to institution name keywords.
 * Each key is an email domain, each value is an array of lowercase keywords
 * that would appear in the institution name on a credential.
 *
 * This list is a seed — it can be extended at any time by adding entries.
 * For domains NOT in this list, the system falls back to generic .edu detection.
 */
export const INSTITUTION_DOMAINS: Record<string, string[]> = {
  // ── Philippines ──
  'phinmaed.com':       ['phinma'],

  // Add more as needed. Examples:
  // 'ust.edu.ph':      ['university of santo tomas', 'ust'],
  // 'dlsu.edu.ph':     ['de la salle', 'dlsu'],
  // 'mit.edu':         ['massachusetts institute of technology', 'mit'],
  // 'ox.ac.uk':        ['oxford'],
};

/**
 * Educational domain suffixes recognized worldwide.
 * Any email ending with one of these gets at least "partial" confidence,
 * even if the specific domain isn't in INSTITUTION_DOMAINS above.
 */
export const EDU_DOMAIN_SUFFIXES = [
  '.edu',        // US and international
  '.edu.ph',     // Philippines
  '.edu.au',     // Australia
  '.edu.br',     // Brazil
  '.edu.cn',     // China
  '.edu.co',     // Colombia
  '.edu.eg',     // Egypt
  '.edu.hk',     // Hong Kong
  '.edu.in',     // India
  '.edu.my',     // Malaysia
  '.edu.ng',     // Nigeria
  '.edu.pk',     // Pakistan
  '.edu.sg',     // Singapore
  '.edu.tr',     // Turkey
  '.edu.tw',     // Taiwan
  '.edu.uk',     // UK (some institutions)
  '.edu.vn',     // Vietnam
  '.ac.uk',      // UK academic
  '.ac.jp',      // Japan academic
  '.ac.kr',      // Korea academic
  '.ac.in',      // India academic
  '.ac.za',      // South Africa academic
  '.ac.nz',      // New Zealand academic
  '.ac.id',      // Indonesia academic
  '.ac.th',      // Thailand academic
];

export interface EmailDomainResult {
  matched: boolean;
  domain: string;
  confidence: 'high' | 'partial' | 'none';
  reason: string;
}

/**
 * Check if a student's email domain matches the institution claimed on a credential.
 *
 * Returns:
 * - confidence: 'high'    → domain is in INSTITUTION_DOMAINS and keyword matches the claimed institution
 * - confidence: 'partial' → domain ends with a known .edu suffix (institutional, but not explicitly mapped)
 * - confidence: 'none'    → generic consumer domain (gmail, yahoo, etc.)
 */
export function checkEmailDomainMatch(
  studentEmail: string,
  claimedInstitution: string
): EmailDomainResult {
  const domain = studentEmail.split('@')[1]?.toLowerCase() || '';
  const institutionLower = (claimedInstitution || '').toLowerCase();

  // 1. Exact domain match from registry
  const keywords = INSTITUTION_DOMAINS[domain];
  if (keywords) {
    const isMatch = keywords.some(kw => institutionLower.includes(kw));
    if (isMatch) {
      return {
        matched: true,
        domain,
        confidence: 'high',
        reason: `Student email @${domain} matches "${claimedInstitution}"`,
      };
    }
    // Domain is in registry but keywords don't match the claimed institution
    return {
      matched: false,
      domain,
      confidence: 'partial',
      reason: `Student email @${domain} is institutional but doesn't match "${claimedInstitution}"`,
    };
  }

  // 2. Generic .edu / .ac suffix detection (worldwide)
  const isEduDomain = EDU_DOMAIN_SUFFIXES.some(suffix => domain.endsWith(suffix));
  if (isEduDomain) {
    return {
      matched: false,
      domain,
      confidence: 'partial',
      reason: `Student email @${domain} is from an educational institution`,
    };
  }

  // 3. Consumer domain (gmail, yahoo, outlook, etc.)
  return {
    matched: false,
    domain,
    confidence: 'none',
    reason: `Student email @${domain} is not from an institutional domain`,
  };
}
