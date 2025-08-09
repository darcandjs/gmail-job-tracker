/**
 * Test cases for job tracker functionality
 * @file Contains unit tests for email parsing
 */

/**
 * Runs all test cases
 */
function runAllTests() {
  testLinkedInEmailParsing();
  testJobHireEmailParsing();
  testWorkdayEmailParsing();
  testSpamDetection();
  Logger.log("✅ All tests completed");
}

/**
 * Tests LinkedIn email parsing
 */
function testLinkedInEmailParsing() {
  const testCase = {
    from: "LinkedIn <jobs-noreply@linkedin.com>",
    subject: "Your application was sent",
    body: "Your application was sent\n\nSoftware Engineer\nGoogle\nMountain View, CA",
    expected: {
      title: "Software Engineer",
      company: "Google"
    }
  };

  const result = handleLinkedInEmail(testCase.subject, testCase.body);
  assertEqual(result.title, testCase.expected.title, "LinkedIn title");
  assertEqual(result.company, testCase.expected.company, "LinkedIn company");
}

/**
 * Tests JobHire email parsing
 */
function testJobHireEmailParsing() {
  const testCases = [
    {
      from: "No Reply <robot@jobhire.tech>",
      subject: "[reply to email jobs@acme.com] Software Engineer Position",
      body: "Thank you for applying to Software Engineer at Acme Inc.",
      expected: {
        title: "Software Engineer",
        company: "Acme Inc"
      }
    },
    {
      from: "No Reply <robot@jobhire.tech>",
      subject: "Application Update",
      body: "Application update for Data Scientist role with Tech Corp",
      expected: {
        title: "Data Scientist",
        company: "Tech Corp"
      }
    }
  ];

  testCases.forEach((test, i) => {
    const result = handleJobHireEmail(test.from, test.subject, test.body);
    assertEqual(result.title, test.expected.title, `JobHire title #${i + 1}`);
    assertEqual(result.company, test.expected.company, `JobHire company #${i + 1}`);
  });
}

/**
 * Tests Workday email parsing
 */
function testWorkdayEmailParsing() {
  const testCase = {
    from: "noreply@workday.com",
    subject: "Application Received",
    body: "Thank you for your interest in the Product Manager position at Amazon",
    expected: {
      title: "Product Manager",
      company: "Amazon"
    }
  };

  const result = handleWorkdayEmail(testCase.subject, testCase.body);
  assertEqual(result.title, testCase.expected.title, "Workday title");
  assertEqual(result.company, testCase.expected.company, "Workday company");
}

/**
 * Tests spam detection
 */
function testSpamDetection() {
  const testCases = [
    {
      from: "alerts@ziprecruiter.com",
      subject: "New jobs for you",
      expected: true
    },
    {
      from: "hiring@company.com",
      subject: "Application received",
      expected: false
    }
  ];

  testCases.forEach((test, i) => {
    const result = isSpammySource(test.from) || isSpammySubject(test.subject);
    assertEqual(result, test.expected, `Spam test #${i + 1}`);
  });
}

/**
 * Asserts that two values are equal
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 * @param {string} message - Test description
 */
function assertEqual(actual, expected, message) {
  if (actual === expected) {
    Logger.log(`✅ PASS: ${message}`);
  } else {
    Logger.log(`❌ FAIL: ${message} (Expected: ${expected}, Actual: ${actual})`);
  }
}