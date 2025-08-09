function exportAllScripts() {
  const projectId = ScriptApp.getScriptId();
  const url = `https://script.google.com/feeds/download/export?id=${projectId}&format=json`;
  
  const response = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
    }
  });
  
  const content = JSON.parse(response.getContentText());
  const files = content.files.filter(f => f.type === 'server_js');
  
  files.forEach(file => {
    DriveApp.createFile(file.name + '.gs', file.source);
  });
}