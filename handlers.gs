// === HANDLERS: Individual Email Parsing Logic ===

function extractMessageDetails(thread) {
  const firstMsg = thread.getMessages()[0];
  const from = firstMsg.getFrom();
  const subject = firstMsg.getSubject();
  const threadUrl = `https://mail.google.com/mail/u/0/#inbox/${thread.getId()}`;

  // Clean and truncate the email body
  const rawBody = firstMsg.getBody();
  const body = cleanEmailBody(rawBody);

  return {
    firstMsg,
    from,
    subject,
    body,
    threadUrl
  };
}

function cleanEmailBody(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "") // Strip all HTML tags
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000); // Truncate to 2000 chars
}



function handleLorienEmail(subject, body) {
  const match = snippet.match(/Thank you for applying to (.+?) through Lorien/i);
  if (match) {
    return {
      title: cleanExtractedText(match[1]),
      company: "Lorien"
    };
  }

  const altMatch = snippet.match(/interest in the (.+?) role.*? at (.+?)(\.|\n|$)/i);
  if (altMatch) {
    return {
      title: cleanExtractedText(altMatch[1]),
      company: cleanCompanyName(altMatch[2])
    };
  }

  return {
    title: extractJobTitle(subject, snippet),
    company: "Lorien"
  };
}

function handleLinkedInEmail(subject, body) {
  const lines = snippet.split("\n").map(l => l.trim()).filter(Boolean);
  const title = cleanExtractedText(lines[1]);
  const company = cleanCompanyName(lines[2]);
  return { title, company };
}

function handleZipRecruiterEmail(subject, body) {
  const match = snippet.match(/applied to (.+?) at (.+?)(\.|\s|$)/i);
  if (match) {
    return {
      title: cleanExtractedText(match[1]),
      company: cleanCompanyName(match[2])
    };
  }
  return {
    title: extractJobTitle(subject, snippet),
    company: "ZipRecruiter"
  };
}

function handleAshbyEmail(subject, body) {
  const match = snippet.match(/apply(?:ing)? to.*?[:\-]?\s*(.*?)\./i);
  const title = cleanExtractedText(match?.[1] || subject.split("|")[1]);
  const company = cleanCompanyName(subject.split("|")[0].trim());
  return { title, company };
}

function handleWorkdayEmail(subject, body) {
  const match = snippet.match(/interest in the (.+?) position at (.+?)(?:\.|\n|$)/i);
  if (match) {
    return {
      title: cleanExtractedText(match[1]),
      company: cleanCompanyName(match[2])
    };
  }
  const altMatch = snippet.match(/Thank you for applying to (.+?) at (.+?)(?:\.|\n|$)/i);
  if (altMatch) {
    return {
      title: cleanExtractedText(altMatch[1]),
      company: cleanCompanyName(altMatch[2])
    };
  }
  return {
    title: extractJobTitle(subject, snippet),
    company: extractCompanyName("workday", subject, snippet)
  };
}

function handleJobHireEmail(from, subject, body) {
  Logger.log("📩 Starting handleJobHireEmail");

  subject = subject.replace(/\[reply to email .*?\]\s*/i, '').trim();
  Logger.log("🔍 Cleaned subject: " + subject);

  const replyMatch = body.match(/\[reply to email (.+?)\]/i);
  const replyEmail = replyMatch ? replyMatch[1] : undefined;
  Logger.log("📧 replyEmail: " + replyEmail);

  let extractedCompany = replyEmail ? cleanCompanyName(replyEmail.split("@")[1]) : null;
  Logger.log("🏢 extractedCompany from replyEmail: " + extractedCompany);

  // Fallback to display name if replyEmail fails
  if (!extractedCompany && from.includes("<") && from.includes(">")) {
    const displayName = from.split("<")[0].trim();
    if (displayName && displayName.length > 2) {
      extractedCompany = cleanCompanyName(displayName);
      Logger.log("🏷️ extractedCompany from display name: " + extractedCompany);
    }
  }

  const patterns = [
    { pattern: /application update for (.+?) role with (.+?)(?:\.|\s|$)/i, label: '🔁 Matched: update for ___ role with ___' },
    { pattern: /applied to (.+?) with (.+?)(?:\.|\s|$)/i, label: '🔁 Matched: applied to ___ with ___' },
    { pattern: /apply for (.+?) position at (.+?)(?:\.|\s|$)/i, label: '🔁 Matched: apply for ___ position at ___' },
    { pattern: /interest in the (.+?) position with (.+?)(?:\.|\s|$)/i, label: '🔁 Matched: interest in ___ position with ___' },
    { pattern: /application to (.+?) position with (.+?)(?:\.|\s|$)/i, label: '🔁 Matched: application to ___ position with ___' },
    { pattern: /interest in the (.+?) position at (.+?)(?:\.|\s|$)/i, label: '🔁 Matched: interest in ___ position at ___' },
    { pattern: /for (?:the )?(.+?) (?:position|role) at (.+?)(?:\.|\s|$)/i, label: '🔁 Matched: ___ position|role at ___' },
    { pattern: /pursue other applicants for the (.+?) position/i, label: '🔁 Matched: pursue other applicants for ___ position' },
    { pattern: /apply for (.+?) at (.+?)(?:\.|\s|$)/i, label: '🔁 Matched: apply for ___ at ___' },
    { pattern: /thank you for applying for the (.+?) position.*[-–] (.+)/i, label: '🔁 Matched: thank you for applying for ___ position – ___' },
    { pattern: /thank you for applying for (.+?) position - (.+?)( Careers)?/i, label: '🔁 Matched: thank you for applying for ___ position - ___ Careers' }
  ];

  for (const { pattern, label } of patterns) {
    const match = body.match(pattern);
    Logger.log(`${label} => Match: ${!!match}`);
    if (match) {
      return {
        title: cleanExtractedText(match[1]),
        company: match[2] ? cleanCompanyName(match[2]) : extractedCompany,
        status: getStatusFromSnippet(body)
      };
    }
  }

  Logger.log("⚠️ No patterns matched. Falling back.");

  const fallbackMatch = subject.match(/Application Update for (.+?) role/i);
  if (fallbackMatch) {
    Logger.log("📍 Fallback subject title match: " + fallbackMatch[1]);
    return {
      title: cleanExtractedText(fallbackMatch[1]),
      company: extractedCompany || extractCompanyName("jobhire.tech", subject, body),
      status: getStatusFromSnippet(body)
    };
  }

  // To Do pattern detection (e.g., Self Identify, EEO)
  if (/self.?identification|eeo form|voluntary self-identification|create a profile|complete (your|the)? application|action needed|assigned to your file|log.?in to.*(candidate zone|account)|update your profile/i.test(subject + body)) {
    return {
      title: extractJobTitle(subject, body),
      company: extractedCompany || extractCompanyName("jobhire.tech", subject, body),
      status: "To Do"
    };
  }

  const emailBasedTitle = subject.match(/thank you for applying for (.+?) position/i)?.[1] || extractJobTitle(subject, body);

  return {
    title: cleanExtractedText(emailBasedTitle),
    company: extractedCompany || extractCompanyName("jobhire.tech", subject, body),
    status: getStatusFromSnippet(body)
  };
}

function isSpammySubject(subject) {
  const lower = subject.toLowerCase();
  return (
    lower.includes("check out new opportunities at") ||
    lower.includes("urgent hiring") ||
    lower.includes("hot openings") ||
    lower.includes("immediate openings") ||
    lower.includes("work from home job offer") ||
    lower.includes("find your next job") ||
    lower.includes("donotreply@jobspresso") ||
    lower.includes("newsletter") ||
    lower.includes("unlock new doors")
  );
}
