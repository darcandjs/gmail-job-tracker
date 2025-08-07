function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("💼 Job Tracker Actions")
    .addItem("📆 Fetch Last 4 Weeks", "fetchLast4WeeksOfJobEmails")
    .addItem("🔁 Reclassify & Tag Emails", "reclassifyAndTagEmails")
    .addItem('🧼 Clear Tracker + Spammy Tabs', 'clearJobDataTabs')
    .addItem("🏷️ Fetch from Job Label", "fetchFromLabel")

    .addToUi();
}
