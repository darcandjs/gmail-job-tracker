// --- TEST CASES ---
function testLinkedInAndJobHireFixes() {
  const testCases = [
    {
      from: "LinkedIn <jobs-noreply@linkedin.com>",
      subject: "Donna, your application was sent to Tishman",
      snippet: "Your application was sent to Tishman\n\nProject Manager – Capital Projects\nTishman\nLake Buena Vista, FL",
      expected: {
        title: "Project Manager Capital Projects",
        company: "Tishman"
      }  
    },
    {
      from: "No Reply <robot@jobhire.tech>",
      subject: "[reply to email awilkerson@meteoreducation.com] Software Engineer - Meteor Education",
      snippet: "Thank you for your interest in the Software Engineer position with Meteor Education",
      expected: {
        title: "Software Engineer",
        company: "Meteor Education"
      }
    },
    {
      from: "No Reply <robot@jobhire.tech>",
      subject: "[reply to email donotreply@msg.paycomonline.com] Application Status Update",
      snippet: "Thank you so much for the interest you’ve expressed in working at Outlook Amusements. We have decided to pursue other applicants for the Project Manager position.",
      expected: {
        title: "Project Manager",
        company: "Outlook Amusements"
      }
    },
    {
      from: "No Reply <robot@jobhire.tech>",
      subject: "[reply to email prince.john@cytora.com] Thank you for your application to Cytora.",
      snippet: "Dear Donna,\nThank you for taking the time to apply for the Delivery Manager - US position at Cytora.",
      expected: {
        title: "Delivery Manager - US",
        company: "Cytora"
      }
    }
  ];

  testCases.forEach((test, i) => {
    const result = processEmail(test.from, test.subject, test.snippet);
Logger.log(`Test ${i + 1}:`);
Logger.log(`  Expected: ${JSON.stringify(test.expected)}`);
Logger.log(`  Actual:   ${JSON.stringify(result)}`);
Logger.log(`  Match:    ${result.title === test.expected.title && result.company === test.expected.company ? '✅' : '❌'}`);
  });

}

function testAlertSmartsearchEmail() {
  const subject = "Application Update for Sr. Commercial Construction Project Manager role with Jonah Development Corp.";
  const snippet = `
    [reply to email alert@smartsearchonline.com]
    Unfortunately, we have decided to move forward with other candidates.
    Application Update for Sr. Commercial Construction Project Manager role with Jonah Development Corp.
  `;

  const result = processEmail("robot@jobhire.tech", subject, snippet);

  console.log("📬 testAlertSmartsearchEmail result:", result);

  if (result.title !== "Sr Commercial Construction Project Manager") {
    throw new Error(`❌ Incorrect title. Expected 'Sr Commercial Construction Project Manager' but got '${result.title}'`);
  }
  if (result.company !== "Jonah Development Corp") {
    throw new Error(`❌ Incorrect company. Expected 'Jonah Development Corp' but got '${result.company}'`);
  }
  if (result.status !== "Rejected") {
    throw new Error(`❌ Incorrect status. Expected 'Rejected' but got '${result.status}'`);
  }

  console.log("✅ testAlertSmartsearchEmail passed");

}
function testJobHireTEKsystems1() {
  const subject = "[reply to email opportunities@e.teksystems.com] Hi Donna, thank you for applying for the Engagement Manager II (Hybrid) position - TEKsystems Careers";
  const snippet = `
Hi Donna,

Thank you for applying for the Engagement Manager II (Hybrid) position – TEKsystems Careers
https://click.e.allegisgroup.com/?qs=abc123
`;

  const result = handleJobHireEmail(subject, snippet);

  console.log("🧪 Test TEKsystems #1 result:", result);
  if (result.title !== "Engagement Manager II (Hybrid)") throw new Error(`❌ Incorrect title. Got '${result.title}'`);
  if (result.company !== "TEKsystems Careers") throw new Error(`❌ Incorrect company. Got '${result.company}'`);
  if (result.status !== "Submitted") throw new Error(`❌ Incorrect status. Got '${result.status}'`);
}
function testJobHireTEKsystems2() {
  const subject = "[reply to email opportunities@e.teksystems.com] Thank you for applying";
  const snippet = `
Hi Donna,

Thank you for applying for the Engagement Manager II (Hybrid) position – TEKsystems
You’ll hear back if your experience matches our requirements.
`;

  const result = handleJobHireEmail(subject, snippet);

  console.log("🧪 Test TEKsystems #2 result:", result);
  if (result.title !== "Engagement Manager II (Hybrid)") throw new Error(`❌ Incorrect title. Got '${result.title}'`);
  if (result.company !== "TEKsystems") throw new Error(`❌ Incorrect company. Got '${result.company}'`);
  if (result.status !== "Submitted") throw new Error(`❌ Incorrect status. Got '${result.status}'`);
}

