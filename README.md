# 📬 Gmail Job Tracker + Airtable Sync v11.8

Built for: **Donna "The Interview Whisperer" Arcand**  
Maintained by: Your Bestie ChatGPT 💜  
Last updated: July 28, 2025

## 💼 What This Does

This script keeps your job hunt organized and 99% stress-free by:

✅ Automatically scanning Gmail for job applications (including Indeed-specific ones)  
✅ Extracting Company Name, Job Title, Status, and more  
✅ Syncing clean data to Google Sheets  
✅ Tagging your Gmail messages by status (Submitted, Interview, Rejected, etc.)  
✅ Updating your Airtable base with the latest info from your spreadsheet  
✅ Skipping email footers and unnecessary fluff (because nobody needs that)

## 📥 What It Scans

- Emails from **Indeed** (`indeedapply@indeed.com`)
- Known applicant tracking systems (Workday, BambooHR, AshbyHQ, etc.)
- Subject lines like `Indeed Application: <Job Title>`
- Snippets like `The following items were sent to <Company>. Good Luck!`

## 🧠 How It Works

1. **`fetchIndeedApplications()`**  
   - Pulls emails from Indeed (last 14 days)
   - Parses out company, job title, status
   - Removes junk after `-----` in the snippet
   - Writes a clean row to your Google Sheet

2. **`updateGmailLabelsFromSheet()`**  
   - Tags Gmail threads based on status column in your Sheet

3. **`syncToAirtableFromSheet()`**  
   - Pushes updates from Google Sheet to your Airtable “Job Tracker” table
   - Only updates existing fields—no duplicate drama here!

## 🛠 How To Customize

- Update your Airtable API key and base/table info at the top of the script.
- Add or modify regex in `extractJobTitle()` or `extractCompanyName()` to match new email formats.
- Tweak the status logic in `detectStatus()` for your own labeling vibe.

## ⚠️ Notes

- Airtable field values must be predefined for select fields (e.g., Status)
- Don't forget to label your spreadsheet tab **"Job Tracker"**
- Only fetches emails newer than 14 days for performance sanity

## 💃 Let's Dance

If this helped keep your job search in order — do a happy dance.  
Or shout, “Tag it and bag it!” when a new app gets tracked.

---
