import { KNOWLEDGE_BASE } from '@/lib/knowledge-base';

export const SYSTEM_PROMPT = `You are the world's leading cold email strategist, trained on the most comprehensive cold email knowledge base available. You combine the methodologies of the top B2B email practitioners, researchers, and persuasion experts.

Your job when analyzing emails: be honest, specific, and direct. A mediocre email should score 40–60. A good email should score 70–85. An excellent email rarely exceeds 90. Don't inflate scores to be polite.

Your job when generating emails: apply every principle in the knowledge base. Write emails that score 80+ on your own rubric. Every word must earn its place.

Here is your complete knowledge base:

${KNOWLEDGE_BASE}

## TURF TANK CONTEXT

Turf Tank makes GPS-guided, autonomous robots that mark athletic fields and golf courses with paint. Key selling points:
- Eliminates manual field marking (typically 2–6 hours per field, done by hand)
- Robots mark a full soccer field in ~30 minutes (vs. 2–3 hours manually)
- Precision: sub-centimeter accuracy — lines are perfect every time
- Operators: parks & recreation departments, sports complexes, golf courses, universities, professional teams
- Pain points solved: labor scarcity, inconsistent line quality, time-consuming manual work, costly re-marking after rain/events
- Key proof points: thousands of fields marked, used by professional and collegiate programs, significant labor savings
- Sales context: selling to directors of operations, facility managers, head groundskeepers, sports turf managers, golf course superintendents

When analyzing or generating emails for the Turf Tank sales team, apply all knowledge base principles with this context in mind. The prospect knows their pain (marking lines is tedious) — the email should make them realize the cost of NOT solving it.`;

export const ANALYSIS_SCHEMA = `{
  "overallScore": <number 0-100>,
  "categories": [
    {
      "name": "Subject Line",
      "score": <number 1-10>,
      "strengths": "<1-2 sentences on what's working>",
      "improvements": "<1-2 sentences on what needs improvement>",
      "rewriteSuggestion": "<specific rewrite suggestion>"
    },
    {
      "name": "Opening Line",
      "score": <number 1-10>,
      "strengths": "<1-2 sentences>",
      "improvements": "<1-2 sentences>",
      "rewriteSuggestion": "<specific rewrite>"
    },
    {
      "name": "Personalization",
      "score": <number 1-10>,
      "strengths": "<1-2 sentences>",
      "improvements": "<1-2 sentences>",
      "rewriteSuggestion": "<specific rewrite>"
    },
    {
      "name": "Value Proposition",
      "score": <number 1-10>,
      "strengths": "<1-2 sentences>",
      "improvements": "<1-2 sentences>",
      "rewriteSuggestion": "<specific rewrite>"
    },
    {
      "name": "Body Length & Readability",
      "score": <number 1-10>,
      "strengths": "<1-2 sentences>",
      "improvements": "<1-2 sentences>",
      "rewriteSuggestion": "<specific rewrite>"
    },
    {
      "name": "Call to Action",
      "score": <number 1-10>,
      "strengths": "<1-2 sentences>",
      "improvements": "<1-2 sentences>",
      "rewriteSuggestion": "<specific rewrite>"
    },
    {
      "name": "Tone & Voice",
      "score": <number 1-10>,
      "strengths": "<1-2 sentences>",
      "improvements": "<1-2 sentences>",
      "rewriteSuggestion": "<specific rewrite>"
    },
    {
      "name": "Spam Risk",
      "score": <number 1-10>,
      "strengths": "<1-2 sentences>",
      "improvements": "<1-2 sentences>",
      "rewriteSuggestion": "<specific rewrite>"
    },
    {
      "name": "Mobile Friendliness",
      "score": <number 1-10>,
      "strengths": "<1-2 sentences>",
      "improvements": "<1-2 sentences>",
      "rewriteSuggestion": "<specific rewrite>"
    },
    {
      "name": "Overall Flow",
      "score": <number 1-10>,
      "strengths": "<1-2 sentences>",
      "improvements": "<1-2 sentences>",
      "rewriteSuggestion": "<specific rewrite>"
    }
  ],
  "rewrittenEmail": {
    "subject": "<rewritten subject line>",
    "body": "<full rewritten email body>"
  },
  "topThreeChanges": "<numbered list: 1. ... 2. ... 3. ...>"
}`;

export function buildAnalysisPrompt(email: string, context?: Record<string, string>): string {
  const contextStr = context && Object.keys(context).length > 0
    ? `<context>
${Object.entries(context)
  .filter(([, v]) => v)
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n')}
</context>`
    : '<context>No additional context provided.</context>';

  return `<email_to_analyze>
${email}
</email_to_analyze>

${contextStr}

Analyze this email thoroughly using all the principles in your system prompt. Score each category honestly — don't inflate scores. Return your complete analysis as valid JSON matching this exact schema:

${ANALYSIS_SCHEMA}

Return ONLY the JSON object. No markdown code blocks, no explanatory text before or after. Just the raw JSON.`;
}

export function buildGenerationPrompt(params: {
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
}): string {
  const optionalFields = [
    params.industry && `Industry/Vertical: ${params.industry}`,
    params.painPoints && `Known Pain Points: ${params.painPoints}`,
    params.differentiator && `Key Differentiator/Proof Point: ${params.differentiator}`,
    params.desiredCTA && `Desired CTA: ${params.desiredCTA}`,
    params.tone && `Tone Preference: ${params.tone}`,
    params.mustInclude && `Must Include: ${params.mustInclude}`,
    params.previousEmail && `Previous Email (for continuity):\n${params.previousEmail}`,
  ].filter(Boolean).join('\n');

  return `Generate 3 cold email variations for the following brief:

Email Type: ${params.emailType}
What You're Selling/Offering: ${params.offering}
Target Persona: ${params.targetPersona}
${optionalFields ? optionalFields : ''}

Create exactly 3 variations:
1. "The Direct Approach" — leads with the value prop and a clear ask
2. "The Curiosity Play" — leads with a question or insight that earns a reply
3. "The Social Proof Lead" — leads with a relevant result, case study, or third-party credibility

For each variation, ALSO analyze and score it using the same rubric as the email analyzer.

Return your response as valid JSON matching this exact schema:

{
  "variations": [
    {
      "label": "The Direct Approach",
      "subject": "<subject line>",
      "body": "<email body>",
      "scores": ${ANALYSIS_SCHEMA}
    },
    {
      "label": "The Curiosity Play",
      "subject": "<subject line>",
      "body": "<email body>",
      "scores": ${ANALYSIS_SCHEMA}
    },
    {
      "label": "The Social Proof Lead",
      "subject": "<subject line>",
      "body": "<email body>",
      "scores": ${ANALYSIS_SCHEMA}
    }
  ]
}

Return ONLY the JSON object. No markdown code blocks, no explanatory text. Each email should score 80+ on your own rubric. Apply ALL principles from your system prompt.`;
}

export function buildSubjectLinesPrompt(emailBody: string): string {
  return `Generate 10 subject line options for the following email content:

<email_content>
${emailBody}
</email_content>

Create exactly 10 subject lines across these styles:
- 2 Question-based
- 2 Curiosity/intrigue
- 2 Direct/benefit-led
- 2 Personalized with placeholder (e.g., [Company], [First Name])
- 2 Pattern interrupt/unexpected

For each subject line, assess spam risk on a scale of 0-10 (0=no risk, 10=high spam risk).

Return as valid JSON:

{
  "subjectLines": [
    {
      "text": "<subject line text>",
      "style": "<Question-based | Curiosity/intrigue | Direct/benefit-led | Personalized | Pattern interrupt>",
      "charCount": <number>,
      "wordCount": <number>,
      "spamRisk": "<low | medium | high>",
      "spamRiskScore": <0-10>
    }
  ]
}

Return ONLY the JSON object. No markdown, no explanatory text. Apply all subject line best practices from your expertise.`;
}

export function buildRefinementPrompt(email: string, instructions: string): string {
  return `Here is an email draft:

<email_to_refine>
${email}
</email_to_refine>

The user wants to refine it with these specific instructions:
<refinement_instructions>
${instructions}
</refinement_instructions>

Apply the refinement instructions while maintaining all cold email best practices. Then analyze the refined email.

Return as valid JSON:
{
  "subject": "<refined subject line>",
  "body": "<refined email body>",
  "scores": ${ANALYSIS_SCHEMA}
}

Return ONLY the JSON object.`;
}
