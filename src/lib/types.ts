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
  rewrittenEmail: RewrittenEmail;
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
  painPoints?: string;
  differentiator?: string;
  desiredCTA?: string;
  tone?: string;
  mustInclude?: string;
  previousEmail?: string;
  personalizationHooks?: string[];
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

export interface ResearchHook {
  text: string;
  useIt: string;
  strength: 'strong' | 'medium' | 'weak';
}

export interface CompanyProfile {
  name: string;
  stats: string;
  description: string;
  tags: string[];
  bullets: string[];
  recentNews: string[];
}

export interface PersonProfile {
  name: string;
  title: string;
  summary: string;
  tenure: string;
  recentActivity: string[];
}

export interface ResearchResult {
  hooks: ResearchHook[];
  company: CompanyProfile;
  person: PersonProfile;
  sources: string[];
}

export interface ResearchRequest {
  name: string;
  jobTitle: string;
  company: string;
  linkedinUrl?: string;
  websiteUrl?: string;
}
