function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu("💼 Job Tracker")
    .addItem("📆 Fetch June 2025", "fetchJune2025") // Add this line
    .addItem("📅 Fetch Custom Month", "showMonthPickerDialog")
    // ... rest of your menu items
    .addToUi();
}

/**
 * Shows dialog to select month/year
 */
function showMonthPickerDialog() {
  const html = HtmlService.createHtmlOutput(`
    <div style="padding:20px">
      <h3>Fetch Emails for Specific Month</h3>
      <label for="year">Year:</label>
      <input type="number" id="year" value="2025" min="2020" max="2030">
      <br><br>
      <label for="month">Month:</label>
      <select id="month">
        <option value="1">January</option>
        <option value="2">February</option>
        <option value="3">March</option>
        <option value="4">April</option>
        <option value="5">May</option>
        <option value="6" selected>June</option>
        <option value="7">July</option>
        <option value="8">August</option>
        <option value="9">September</option>
        <option value="10">October</option>
        <option value="11">November</option>
        <option value="12">December</option>
      </select>
      <br><br>
      <button onclick="runFetch()">Fetch Emails</button>
    </div>
    <script>
      function runFetch() {
        const year = parseInt(document.getElementById("year").value);
        const month = parseInt(document.getElementById("month").value);
        google.script.run.fetchMonthOfLabeledEmails(year, month);
        google.script.host.close();
      }
    </script>
  `).setWidth(300).setHeight(250);
  
  SpreadsheetApp.getUi().showModalDialog(html, "Select Month");
}