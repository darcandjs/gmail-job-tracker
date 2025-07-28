# Gmail Job Tracker 📨 + Airtable Sync

This Google Apps Script automation helps track job applications directly from your Gmail inbox and syncs them to an Airtable base. Built to support your job hunt hustle — with extra flair and automation thanks to ChatGPT 💜

## 🔧 Features
- Parses "Thank you for applying" emails from Gmail
- Extracts company, job title, status, and snippets
- Smart logic to clean up common ATS emails (Workday, Paycom, Ashby, etc.)
- Daily syncs to Airtable
- Color-coded dashboard view in Google Sheets
- (Optional) Google Slides dashboard for visual display
- Built-in daily email summary of pending actions

## 🚀 Setup
1. Copy the script from `Gmail_Job_Tracker_v10.7_Full.txt` into Google Apps Script
2. Update your:
   - `AIRTABLE_API_KEY`
   - `AIRTABLE_BASE_ID`
   - `AIRTABLE_TABLE_NAME`
3. Run `dailyTwoWaySync()` to:
   - Fetch Gmail applications
   - Sync to Airtable
   - Sync back any updates
   - Email your daily job tracker summary

## 🧹 Utilities
- `deleteAllAirtableRecords()` – clears out your Airtable base in batches of 10
- Built-in deduplication and history tracking
- Coming soon: filters, versioning, and filters by date/accounts

## Made with ☕️, 💻, and a dash of sass by Aunt Donna & ChatGPT