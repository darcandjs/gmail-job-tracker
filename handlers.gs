/**
 * Specialized email handlers for different job platforms
 * @file Contains parsers for specific email formats from job platforms
 */

/**
 * Specialized handler for recruiter emails (Sparks Group, LaSalle, etc.)
 */
function handleRecruiterEmail(from, subject, body) {
  const cleanBody = body
    .replace(/&nbsp;|\u00A0/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Sparks Group pattern
  const sparksMatch = cleanBody.match(/applying to (.+?) with (.+?) via/i);
  if (sparksMatch) return {
    title: cleanExtractedText(sparksMatch[1]),
    company: cleanCompanyName(sparksMatch[2]),
    status: getStatusFromText(cleanBody)
  };

  // Happy Cog pattern
  if (from.includes('happycog')) return {
    title: extractJobTitle(subject, cleanBody),
    company: "Happy Cog",
    status: "Submitted"
  };

  // LaSalle Network pattern
  const laSalleMatch = cleanBody.match(/interest in the (.+?) role/i);
  if (from.includes('lasallenetwork')) return {
    title: laSalleMatch ? cleanExtractedText(laSalleMatch[1]) : extractJobTitle(subject, cleanBody),
    company: "LaSalle Network",
    status: "To Do"
  };

  // Generic recruiter fallback
  return {
    title: extractJobTitle(subject, cleanBody),
    company: extractCompanyName(from, subject, cleanBody),
    status: getStatusFromText(cleanBody)
  };
}



/**
 * Enhanced LinkedIn email handler
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @return {Object} Contains title and company
 */
function handleLinkedInEmail(subject, body) {
  // Clean body by removing hidden characters and HTML entities
  const cleanBody = body.replace(/&[a-z]+;|͏|\u200B/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Pattern 1: "Your application was sent to [Company] [Title]"
  const applicationPattern = /Your application was sent to (.+?) (.+?) Insight Global/i;
  let match = cleanBody.match(applicationPattern);
  
  if (match && match.length >= 3) {
    return {
      title: cleanExtractedText(match[2]),
      company: cleanCompanyName(match[1])
    };
  }
  
  // Pattern 2: Multi-line format (original approach)
  const lines = cleanBody.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length >= 3) {
    // Look for job title in common positions
    const titlePatterns = [
      /Scrum Master/i,
      /Product Owner/i,
      /Software Engineer/i,
      /Project Manager/i
    ];
    
    let foundTitle = lines.find(line => 
      titlePatterns.some(pattern => pattern.test(line))
    );
    
    return {
      title: foundTitle ? cleanExtractedText(foundTitle) : extractJobTitle(subject, cleanBody),
      company: cleanCompanyName(lines[1] || extractCompanyName("linkedin.com", subject, cleanBody))
    };
  }
  
  // Fallback to generic extraction
  return {
    title: extractJobTitle(subject, cleanBody),
    company: extractCompanyName("linkedin.com", subject, cleanBody)
  };
}

/**
 * Enhanced cleaning for LinkedIn-specific formats
 */
function cleanExtractedText(text) {
  if (!text) return "???";
  
  // Remove location info and other metadata
  text = text
    .replace(/&middot;.*$/, '') // Remove everything after location marker
    .replace(/\(.*?\)/g, '') // Remove parentheses
    .replace(/ at .*$/, '') // Remove "at company" suffixes
    .replace(/[^a-zA-Z0-9 &\-]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
    
  return text || "???";
}

/**
 * Handles JobHire/Ashby application emails
 * @param {string} from - Sender email
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @return {Object} Contains title, company and status
 */
/**
 * Enhanced JobHire.Tech email handler
 * @param {string} from - Sender email
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @return {Object} Contains title, company, and status
 */
/**
 * Handles JobHire.Tech forwarded applications
 */
function handleJobHireEmail(from, subject, body) {
  const cleanBody = body
    .replace(/\[reply to email .*?\]/g, '')
    .replace(/&nbsp;|\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract from "Thank you for applying to [Title] at [Company]"
  const appMatch = cleanBody.match(/applying to (.+?) at (.+?)(?:\.|\n|$)/i);
  if (appMatch) return {
    title: cleanExtractedText(appMatch[1]),
    company: cleanCompanyName(appMatch[2]),
    status: getStatusFromText(cleanBody)
  };

  return genericFallback(from, subject, body);
}




/**
 * Handles AshbyHQ application emails
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @return {Object} Contains title and company
 */
function handleAshbyEmail(subject, body) {
  const match = body.match(/apply(?:ing)? to.*?[:\-]?\s*(.*?)\./i);
  return {
    title: cleanExtractedText(match?.[1] || subject.split("|")[1]),
    company: cleanCompanyName(subject.split("|")[0].trim())
  };
}

/**
 * Handles Workday application emails
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @return {Object} Contains title and company
 */
function handleWorkdayEmail(subject, body) {
  const patterns = [
    /interest in the (.+?) position at (.+?)(?:\.|\n|$)/i,
    /Thank you for applying to (.+?) at (.+?)(?:\.|\n|$)/i
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return {
        title: cleanExtractedText(match[1]),
        company: cleanCompanyName(match[2])
      };
    }
  }

  return {
    title: extractJobTitle(subject, body),
    company: extractCompanyName("workday.com", subject, body)
  };
}

/**
 * Handles Lorien application emails
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @return {Object} Contains title and company
 */
function handleLorienEmail(subject, body) {
  const match = body.match(/Thank you for applying to (.+?) through Lorien/i);
  if (match) {
    return {
      title: cleanExtractedText(match[1]),
      company: "Lorien"
    };
  }

  return {
    title: extractJobTitle(subject, body),
    company: "Lorien"
  };
}

/**
 * Handles ZipRecruiter application emails
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @return {Object} Contains title and company
 */
function handleZipRecruiterEmail(subject, body) {
  const match = body.match(/applied to (.+?) at (.+?)(\.|\s|$)/i);
  if (match) {
    return {
      title: cleanExtractedText(match[1]),
      company: cleanCompanyName(match[2])
    };
  }

  return {
    title: extractJobTitle(subject, body),
    company: "ZipRecruiter"
  };
}

/**
 * Handles Experis application emails
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @return {Object} Contains title and company
 */
function handleExperisEmail(subject, body) {
  const match = body.match(/application for (.+?) through Experis/i);
  if (match) {
    return {
      title: cleanExtractedText(match[1]),
      company: "Experis"
    };
  }

  return {
    title: extractJobTitle(subject, body),
    company: "Experis"
  };
}