# Gmail Job Tracker V108

This Google Apps Script automates the process of tracking job applications from your Gmail inbox. It extracts information like job title, company, status, and email link, and writes it to a Google Sheet. It also syncs with Airtable and applies Gmail labels.

## Features

- 📨 Scans Gmail for real application emails
- 🔍 Extracts job title and company from Indeed and other platforms
- ✅ Detects submission, interview, rejection, or requests for more info
- 🗂️ Updates a "Job Tracker" sheet
- 🔁 Syncs with Airtable
- 🏷️ Applies Gmail labels for better organization

## Files

- `Code.gs` – main script for Apps Script
- `README.md` – this file

## Setup

1. Paste the contents of `Code.gs` into your Google Apps Script project
2. Create a Google Sheet with a tab named `Job Tracker`
3. Set up columns matching:
   - Date, From, Subject, Company, Job Title, Status, Snippet, Auto, Tracker, Email Link, Airtable Record ID
4. Set your Airtable API key and base/table names
5. Run `fetchIndeedApplications` or `updateGmailLabelsFromSheet` manually or as time-based triggers

## License

MIT
