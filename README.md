# Gmail Job Tracker + Airtable Sync

Automatically scans your Gmail inbox for job application emails and syncs them to a Google Sheet and Airtable.

## Features

- Extracts Company, Job Title, Status from application emails
- Filters out job suggestion/recommendation spam
- Tracks Indeed applications separately
- Syncs to Airtable
- Sends daily summary emails
- Labels Gmail threads by application status

## Setup

1. Set up a Google Sheet with a tab named "Job Tracker".
2. Add columns:
   `Date, From, Subject, Company, Job Title, Status, Snippet, Auto-Added, Source, Email Link, Airtable Record ID`
3. Store your Airtable API key, base ID, and table name in the script.
4. Set triggers for `fetchRecentJobApplications` and `sendDailySummary` if needed.

## License

MIT

---

Script customized by ChatGPT & Donna 💜
