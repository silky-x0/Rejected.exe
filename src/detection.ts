/**
 * Phrases specific enough to be a rejection on their own.
 * Matched against normalized text (see `normalizeText`), so the entries below
 * are written in plain English — contractions get expanded automatically.
 */
export const REJECTION_KEYWORDS: string[] = [
  "we regret to inform",
  "regret to inform you",
  "not moving forward",
  "not be moving forward",
  "not to move forward",
  "not move forward with",
  "we cannot move forward",
  "unable to move forward",
  "we have decided to move forward with other candidates",
  "we have decided to pursue other candidates",
  "we are unable to offer you",
  "position has been filled",
  "this role has been filled",
  "the role has been filled",
  "we will not be proceeding",
  "will not be proceeding with your candidacy",
  "not selected",
  "not been selected",
  "your application was not successful",
  "we do not have a suitable opening",
  "we must pass at this time",
  "we have chosen another candidate",
  "no longer under consideration",
  "not to proceed with your application",
  "not an ideal fit",
  "not the right fit",
];

/**
 * Phrases that also show up in emails that are not rejections
 * ("after careful consideration, we'd love to offer you the role").
 * Two of these have to hit before the sound plays.
 */
export const WEAK_KEYWORDS: string[] = [
  "unfortunately, we",
  "our decision",
  "after careful consideration",
  "after further review",
  "we appreciate the time you took",
  "we appreciate your interest but",
  "thank you for your interest, however",
  "thank you for applying, but",
  "not a match",
  "ideal fit at this time",
];

/** Number of weak phrases needed to count as a rejection on their own. */
export const WEAK_THRESHOLD = 2;

const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bwon't\b/g, "will not"],
  [/\bcan't\b/g, "cannot"],
  [/\bshan't\b/g, "shall not"],
  [/\bisn't\b/g, "is not"],
  [/\baren't\b/g, "are not"],
  [/\bwasn't\b/g, "was not"],
  [/\bweren't\b/g, "were not"],
  [/\bdon't\b/g, "do not"],
  [/\bdoesn't\b/g, "does not"],
  [/\bdidn't\b/g, "did not"],
  [/\bhaven't\b/g, "have not"],
  [/\bhasn't\b/g, "has not"],
  [/\bhadn't\b/g, "had not"],
  [/\bwouldn't\b/g, "would not"],
  [/\bshouldn't\b/g, "should not"],
  [/\bcouldn't\b/g, "could not"],
  [/\bwe've\b/g, "we have"],
  [/\bwe're\b/g, "we are"],
  [/\bwe'll\b/g, "we will"],
  [/\bwe'd\b/g, "we would"],
  [/\byou've\b/g, "you have"],
  [/\byou're\b/g, "you are"],
  [/\byou'll\b/g, "you will"],
  [/\byou'd\b/g, "you would"],
  [/\bthey've\b/g, "they have"],
  [/\bthey're\b/g, "they are"],
  [/\bthey'll\b/g, "they will"],
  [/\bthey'd\b/g, "they would"],
  [/\bi've\b/g, "i have"],
  [/\bi'm\b/g, "i am"],
  [/\bi'll\b/g, "i will"],
  [/\bi'd\b/g, "i would"],
  [/\bit's\b/g, "it is"],
  [/\bthat's\b/g, "that is"],
  [/\bthere's\b/g, "there is"],
  [/\bhere's\b/g, "here is"],
  [/\bwhat's\b/g, "what is"],
];

/**
 * Gmail hands back typographic characters (curly apostrophes, en/em dashes,
 * non-breaking spaces) that never equal the plain ASCII used in the keyword
 * list, and it wraps lines mid-phrase. Normalize all of that away — and expand
 * contractions so one keyword covers every spelling of it.
 */
export function normalizeText(text: string): string {
  let normalized = text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u02BC\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u00A0\u2009\u202F]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");

  for (const [pattern, expansion] of CONTRACTIONS) {
    normalized = normalized.replace(pattern, expansion);
  }

  return normalized.replace(/\s+/g, " ").trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary match so "not selected" doesn't fire inside "cannot selected". */
function toKeywordRegExp(keyword: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`);
}

interface PhraseMatcher {
  phrase: string;
  regex: RegExp;
}

function buildMatchers(keywords: string[]): PhraseMatcher[] {
  const seen = new Set<string>();
  const matchers: PhraseMatcher[] = [];

  for (const keyword of keywords) {
    const phrase = normalizeText(keyword);
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    matchers.push({ phrase, regex: toKeywordRegExp(phrase) });
  }

  return matchers;
}

const STRONG_MATCHERS: PhraseMatcher[] = buildMatchers(REJECTION_KEYWORDS);
const WEAK_MATCHERS: PhraseMatcher[] = buildMatchers(WEAK_KEYWORDS);

export interface RejectionMatch {
  strong: string[];
  weak: string[];
}

export function findRejection(text: string): RejectionMatch {
  const normalized = normalizeText(text);
  return {
    strong: STRONG_MATCHERS.filter((matcher) => matcher.regex.test(normalized)).map(
      (matcher) => matcher.phrase,
    ),
    weak: WEAK_MATCHERS.filter((matcher) => matcher.regex.test(normalized)).map(
      (matcher) => matcher.phrase,
    ),
  };
}

export function isRejection(text: string): boolean {
  const match = findRejection(text);
  return match.strong.length > 0 || match.weak.length >= WEAK_THRESHOLD;
}
