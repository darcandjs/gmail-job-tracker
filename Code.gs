function fetch4Weeks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Job Tracker");
  const data = sheet.getDataRange().getValues();

  // Build a Set of existing Gmail thread URLs (assume column G = index 6)
  const existingUrls = new Set();
  for (let i = 1; i < data.length; i++) {
    const url = data[i][6];
    if (url) existingUrls.add(url.toString().trim());
  }

  // Define spammy sources
  const spammySources = [
    "glassdoor.com",
    "alerts@ziprecruiter.com",
    "ziprecruiter.com",
    "indeed.com",
    "adzuna.com",
    "theladders.com",
    "bounce.recruiter.com",
    "workopolis.com"
  ];

  // Loosened query: just grab all threads from last 4 weeks across all folders
  const threads = GmailApp.search('newer_than:4w in:anywhere');
  console.log(`Found ${threads.length} threads in last 4 weeks`);

  for (const thread of threads) {
    const threadId = thread.getId();
    const threadUrl = "https://mail.google.com/mail/u/0/#inbox/" + threadId;

    // Skip if this thread already exists in the sheet
    if (existingUrls.has(threadUrl)) {
      console.log(`Skipping duplicate thread: ${threadUrl}`);
      continue;
    }

    const messages = thread.getMessages();
    const firstMsg = messages[0];
    const from = firstMsg.getFrom();
    const subject = firstMsg.getSubject();
    const snippet = firstMsg.getPlainBody().slice(0, 300);

    // Spam filter
    const senderLower = from.toLowerCase();
    if (spammySources.some(spam => senderLower.includes(spam))) {
      console.log(`Skipped spammy source: ${from}`);
      continue;
    }

    console.log(`Processing: FROM=${from}, SUBJECT=${subject}`);

    const { title, company, status } = processEmail(from, subject, snippet);
    console.log(`Parsed result: Title=${title}, Company=${company}, Status=${status}`);

    if (!title && !company) {
      console.log("Skipped: No title or company extracted.");
      continue;
    }

    const row = [
      new Date(),      // Timestamp
      title || "",     // Job Title
      company || "",   // Company
      status || "Submitted", // Status
      subject,         // Subject
      from,            // From
      threadUrl        // Gmail URL
    ];

    sheet.appendRow(row);
    console.log(`✅ Added new row: ${title} at ${company}`);
  }
}
