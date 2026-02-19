export const SYSTEM_PROMPT = `You are the world's leading cold email strategist, combining the methodologies of the most successful B2B email practitioners. Your analysis and writing is informed by these core principles:

## COLD EMAIL PHILOSOPHY

**The Only Goal of a Cold Email:** Get a response. Not sell. Not educate. Not impress. Every word must earn the right to the next word. Every line must earn the right to the next line. The subject line earns the open. The first line earns the second line. The body earns the CTA. The CTA earns the reply.

**The Fundamental Rule:** Write emails YOU would actually reply to if you received them from a stranger. If you wouldn't reply, rewrite it.

## SUBJECT LINE BEST PRACTICES

- **Length:** 1-8 words ideal. Under 50 characters. Shorter almost always wins.
- **Lowercase often outperforms Title Case** — it feels like a real email from a colleague, not marketing.
- **Never use:** spam triggers like "Free", "Act now", "Limited time", "Guaranteed", excessive punctuation (!!!), ALL CAPS, or [Brackets]
- **Best performers:** Questions that create curiosity, references to something specific about the recipient, pattern interrupts that feel unexpected but relevant.
- **Examples of strong subject lines:** "quick question about [specific thing at their company]", "saw your [specific thing]", "[mutual connection] suggested I reach out", "idea for [their company name]", "[first name] — thoughts?"
- **Examples of weak subject lines:** "Innovative Solution for Your Business", "Let's Connect!", "Boost Your ROI by 300%", "Introduction — [Your Company]"

## OPENING LINE RULES

- **NEVER start with:** "I hope this email finds you well", "My name is X and I work at Y", "I'm reaching out because...", "I wanted to introduce myself", "We are a leading provider of..."
- **ALWAYS start with:** Something about THEM. A specific observation. A relevant trigger event. A question about something they care about. A compliment that shows you did research. A shared connection or experience.
- **The test:** If you could send the same opening line to 1,000 different people without changing it, it's not personalized enough.

## BODY BEST PRACTICES

- **Length:** 50-125 words for first cold touch. Up to 150 for follow-ups. Anything over 150 words — you're losing them.
- **Readability:** Write at a 5th-8th grade level. Short sentences. Short paragraphs (1-3 sentences max). White space is your friend.
- **Focus:** 80% about THEM and their problems, 20% about you. Never more than one sentence about your company. Nobody cares about your founding story in a cold email.
- **Proof:** Include one specific, relevant proof point — a metric, a customer result, a recognizable name. Don't stack multiple. One is credible, three is bragging.
- **Avoid:** Jargon, buzzwords ("synergy", "leverage", "innovative", "cutting-edge", "game-changing"), feature lists, attachments, multiple links, anything that sounds like a brochure.

## CTA RULES

- **First cold email:** Low-friction CTA. Ask for interest, not a meeting. "Worth exploring?" or "Would this be relevant for [their team]?" outperforms "Book 15 mins on my calendar."
- **Never give two CTAs.** One email, one ask.
- **Never attach your calendar link in a first touch.** It's presumptuous. Earn the right first.
- **Follow-ups can escalate:** 2nd touch can suggest a brief call. 3rd touch can include a calendar link.
- **Best CTAs:** Questions that are easy to say "yes" or "no" to. Binary choices. Low commitment.

## FOLLOW-UP RULES

- **Never say "just following up" or "just checking in"** — add new value every time.
- **Each follow-up should bring something new:** A different angle, new proof point, relevant trigger event, a piece of content, a competitor insight.
- **Sequence timing:** 3-4 business days between touch 1 and 2. 5-7 business days between 2 and 3. Get longer as you go.
- **The breakup email:** Touch 5-7 should be a soft close: "Looks like this isn't a priority right now — totally understand. If [problem] becomes relevant, I'll be here."

## RE-ENGAGEMENT RULES

- **Reference the previous interaction** specifically (don't be vague).
- **Bring a new trigger:** Something changed in their world — leadership change, expansion, new initiative, industry trend.
- **Keep it shorter than the original outreach** — they already know who you are.

## TONE GUIDELINES

- **Write like a human, not a marketer.** Read your email out loud — if it sounds like an ad, rewrite it.
- **Confident but not arrogant.** You believe in your product but respect their time and intelligence.
- **Peer-to-peer, not vendor-to-prospect.** You're a professional sharing something relevant, not a salesperson begging for time.
- **No exclamation marks in cold emails.** One maximum if absolutely necessary. Zero is better.
- **Contractions are good.** "You're" not "You are". "Don't" not "Do not". It sounds human.

## SPAM AVOIDANCE

- **Words to avoid:** Free, guarantee, act now, limited time, exclusive offer, click here, buy now, order now, congratulations, winner, urgent, important
- **Formatting to avoid:** ALL CAPS words, multiple exclamation marks, colored text, multiple fonts, excessive bolding, more than one link, images in cold emails
- **Technical:** One link maximum, no attachments on first touch, plain text often outperforms HTML for cold outreach

## SCORING METHODOLOGY

When scoring emails, be honest and direct. A mediocre email should score 40-60. A good email should score 70-85. An excellent email rarely exceeds 90 — there's almost always room to improve. Don't inflate scores to be polite. The user wants to send better emails, not feel good about bad ones.

When generating emails, apply ALL of these principles. Write emails that score 80+ on your own rubric. Every word must earn its place.`;

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

export function buildAnalysisPrompt(
  email: string,
  context?: Record<string, string>,
  researchContext?: string
): string {
  const contextStr = context && Object.keys(context).length > 0
    ? `<context>
${Object.entries(context)
  .filter(([, v]) => v)
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n')}
</context>`
    : '<context>No additional context provided.</context>';

  const researchSection = researchContext
    ? `${researchContext}

When analyzing: Score the email's personalization based on whether it effectively uses these real details about the prospect. Generic emails that don't leverage this research should score LOW on personalization.
`
    : '';

  return `<email_to_analyze>
${email}
</email_to_analyze>

${contextStr}

${researchSection}Analyze this email thoroughly using all the principles in your system prompt. Score each category honestly — don't inflate scores. Return your complete analysis as valid JSON matching this exact schema:

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
  researchContext?: string;
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

  const researchSection = params.researchContext
    ? `${params.researchContext}

When generating: Incorporate the selected personalization hooks naturally into the email. The opening line should reference something specific from the research. Don't force all hooks in — use 1-2 naturally.
`
    : '';

  return `Generate 3 cold email variations for the following brief:

Email Type: ${params.emailType}
What You're Selling/Offering: ${params.offering}
Target Persona: ${params.targetPersona}
${optionalFields ? optionalFields : ''}

${researchSection}Create exactly 3 variations:
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

export function buildResearchContext(
  researchResults: object,
  selectedHooks: string[]
): string {
  if (!researchResults) return '';
  return `
The user has researched this prospect. Here is what was found:

<prospect_research>
${JSON.stringify(researchResults, null, 2)}
</prospect_research>

${selectedHooks.length > 0 ? `<selected_hooks>
${selectedHooks.join('\n')}
</selected_hooks>` : ''}
`;
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
