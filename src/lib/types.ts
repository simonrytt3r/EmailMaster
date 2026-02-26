export interface CategoryScore {
  name: string;
  score: number;
  strengths: string;
  improvements: string;
  rewriteSuggestion: string;
}

export interface RewrittenEmail {
  subject: string;
  body: string;
}

export interface AnalysisResult {
  overallScore: number;
  categories: CategoryScore[];
  rewrittenEmail?: RewrittenEmail;
  topThreeChanges: string;
}

export interface EmailContext {
  targetPersona?: string;
  industry?: string;
  companySize?: string;
  emailGoal?: string;
  emailType?: string;
  additionalContext?: string;
}

export interface AnalyzeRequest {
  email: string;
  context?: EmailContext;
}

export interface EmailVariation {
  label: string;
  subject: string;
  body: string;
  scores: AnalysisResult;
}

export interface GenerateRequest {
  emailType: string;
  offering: string;
  targetPersona: string;
  industry?: string;
  orgType?: string;
  prospectState?: string;
  painPoints?: string;
  differentiator?: string;
  desiredCTA?: string;
  tone?: string;
  mustInclude?: string;
  previousEmail?: string;
  prospectContext?: string;
}

export interface GenerateResult {
  variations: EmailVariation[];
}

export interface SubjectLine {
  text: string;
  style: string;
  charCount: number;
  wordCount: number;
  spamRisk: 'low' | 'medium' | 'high';
  spamRiskScore: number;
}

export interface SubjectLinesRequest {
  emailBody: string;
}

export interface SubjectLinesResult {
  subjectLines: SubjectLine[];
}

// ─── Prospect Research ────────────────────────────────────────────────────────

export interface ResearchInputs {
  personName: string;
  jobTitle: string;
  company: string;
  linkedinUrl: string;
  websiteUrl: string;
}

export interface PersonalizationHook {
  hook: string;
  emailAngle: string;
  strength: 'strong' | 'medium' | 'weak';
}

export interface ResearchResult {
  organization: {
    summary: string;
    size: string;
    /** US state (2-letter code e.g. "FL") or country name if outside US */
    location?: string;
    /** Facility / org type e.g. "high school", "golf course", "parks & rec" */
    orgType?: string;
    sports: string[];
    recentNews: string[];
    challenges: string[];
    keyFacts: string[];
  };
  person: {
    summary: string;
    role: string;
    tenure: string;
    recentActivity: string[];
    notableItems: string[];
  };
  personalizationHooks: PersonalizationHook[];
  personHooks: PersonalizationHook[];
  sources: string[];
}

export interface ResearchRequest {
  personName?: string;
  jobTitle?: string;
  company: string;
  linkedinUrl?: string;
  websiteUrl?: string;
}

export interface ResearchCacheEntry {
  key: string;
  personName?: string;
  company: string;
  result: ResearchResult;
  cachedAt: string;       // ISO date string
  expiresAt: string;      // ISO date string (cachedAt + cacheDays)
  previousResult?: ResearchResult;
  hasNewInfo: boolean;
  newInfoFields: string[]; // e.g. ['recentNews', 'recentActivity']
}

export interface ResearchCacheSettings {
  allowUserRefresh: boolean;
  cacheDays: number;
}

export interface ResearchCacheStore {
  settings: ResearchCacheSettings;
  entries: ResearchCacheEntry[];
}

// ─── Sequence Builder ──────────────────────────────────────────────────────────

export interface SequenceTouchEmail {
  touchNumber: number;
  label: string;
  sendDay: number;
  strategy: string;
  subject: string;
  body: string;
  overallScore: number;
  keyStrength: string;
  keyImprovement: string;
}

export interface SequenceRequest {
  offering: string;
  targetPersona: string;
  sequenceLength: 3 | 5;
  industry?: string;
  orgType?: string;
  prospectState?: string;
  painPoints?: string;
  differentiator?: string;
  tone?: string;
  mustInclude?: string;
  prospectContext?: string;
}

// ─── NPS Social Proof ──────────────────────────────────────────────────────────

export interface NpsEntry {
  id: number;
  date: string;
  orgName: string;
  orgType: string;
  /** 'Promoter', 'Passive', or 'Detractor' — Detractors are excluded at parse time */
  sentiment: string;
  /** 2-letter US state code (e.g. 'FL') — empty string for non-US entries */
  state: string;
  /** 'United States' for US entries; European country name (e.g. 'Germany') for EU entries */
  country: string;
  npsScore: number;
  /** May be empty — entries with no comment are stored but excluded from quote injection */
  comment: string;
  firstName?: string;
  lastName?: string;
}

export interface NpsStore {
  entries: NpsEntry[];
}

export interface NpsMatchResult {
  entries: NpsEntry[];
  matchType: 'exact' | 'orgType' | 'location' | 'none';
}

export interface SequenceResult {
  touches: SequenceTouchEmail[];
}
