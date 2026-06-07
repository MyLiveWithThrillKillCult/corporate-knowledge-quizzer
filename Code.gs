/**
 * GOOGLE FORMS QUICK TEST GENERATOR
 * * Features:
 * 1. Fetches questions from a designated Google Sheet.
 * 2. Creates a new Google Form (Quiz mode).
 * 3. Links the form to a Results Spreadsheet.
 * 4. REGISTERS A TRIGGER: Automatically emails the results to the respondent upon submission.
 * 5. Logs the creation of the test and sends invites to the mailing list.
 */

function generateQuickTest() {
  console.log("1. Starting test generation...");

  // ===============================
  // CONFIGURATION
  // ===============================
  const QUESTIONS_SHEET_ID = '';
  const LOGS_SHEET_ID      = '';
  const RESULTS_SHEET_ID   = '';

  const QUESTIONS_COUNT = 10;
  const LOGS_TAB_NAME = "Quizzes";
  const RECIPIENTS_TAB_NAME = "Recipients"; // Make sure to rename this tab in your Sheet to match, or change it back to "adresaci"
  
  // --- MAILING LIST ---
  const DEFAULT_RECIPIENTS_LIST = [
    ""
    //,mail@somwhere.com
  ];

  const currentDateTime = new Date().toLocaleString("en-GB");
  const formTitle = `Test ${QUESTIONS_COUNT} questions - ${currentDateTime}`;

  // ===============================
  // 1. FETCH QUESTIONS
  // ===============================
  let questionsSpreadsheet;
  try {
    questionsSpreadsheet = SpreadsheetApp.openById(QUESTIONS_SHEET_ID);
  } catch (error) {
    console.error('CRITICAL ERROR: Cannot open the questions spreadsheet: ' + error);
    throw error;
  }
  
  const questionsSheet = questionsSpreadsheet.getSheets()[0];
  let sheetData = questionsSheet.getDataRange().getValues();
  
  if (sheetData.length <= 1) {
    throw new Error("The questions sheet is empty.");
  }
  
  sheetData.shift(); // Remove the header row
  
  // Filter out empty rows, shuffle, and select the defined number of questions
  sheetData = sheetData.filter(row => row[0] !== "" && row[0] !== undefined && row[0] !== null);
  sheetData = shuffleArray(sheetData);
  const selectedQuestions = sheetData.slice(0, Math.min(QUESTIONS_COUNT, sheetData.length));

  console.log(`Fetched ${selectedQuestions.length} questions.`);

  // ===============================
  // 2. CREATE THE FORM
  // ===============================
  const form = FormApp.create(formTitle);
  const formId = form.getId();

  form.setIsQuiz(true);
  form.setCollectEmail(true); // Crucial for sending results
  form.setLimitOneResponsePerUser(false);
  
  form.setConfirmationMessage(
    "Thank you for submitting the test!\n" +
    "Detailed results and correct answers have been sent to your email address."
  );
  form.setDescription(`Automatically generated test. ID: ${formId}`);

  // Build questions
  selectedQuestions.forEach(row => {
    // Usunięto optE, poprawna odpowiedź jest teraz od razu po optD
    const [questionText, optA, optB, optC, optD, correctAnswer] = row; 
    
    const item = form.addMultipleChoiceItem();
    
    // 1. Filter empty values, convert to string, and remove whitespace
    const rawOptions = [optA, optB, optC, optD] // Usunięto optE z tablicy
      .filter(opt => opt !== "" && opt !== undefined && opt !== null)
      .map(opt => String(opt).trim());
      
    // 2. Remove duplicates using a Set
    const uniqueOptions = [...new Set(rawOptions)];
    
    // 3. Generate final choices for Google Forms
    const choices = uniqueOptions.map(opt => {
      // Normalizacja tekstu: małe litery oraz zamiana wszystkich białych znaków/podwójnych spacji na pojedyncze
      const cleanOpt = String(opt).replace(/\s+/g, ' ').trim().toLowerCase();
      const cleanCorrect = String(correctAnswer).replace(/\s+/g, ' ').trim().toLowerCase();
      
      const isCorrect = (cleanOpt === cleanCorrect);
      return item.createChoice(opt, isCorrect);
    });

    item.setTitle(String(questionText))
        .setPoints(1)
        .setChoices(choices);
        
    // Set feedback for incorrect answers as a failsafe
    const feedback = FormApp.createFeedback().setText(`Correct answer: ${correctAnswer}`).build();
    item.setFeedbackForIncorrect(feedback);
  });

  console.log("Form created successfully. ID: " + formId);

  // ===============================
  // 3. REGISTER TRIGGER (WITH LIMIT MANAGEMENT)
  // ===============================
  try {
    const existingTriggers = ScriptApp.getProjectTriggers();
    
    // Google allows a max of 20 triggers per script. Clean up if near limit.
    if (existingTriggers.length >= 19) {
      console.warn("Approaching the limit of 20 triggers. Deleting the oldest trigger...");
      ScriptApp.deleteTrigger(existingTriggers[0]);
    }

    ScriptApp.newTrigger('sendResultsEmail')
      .forForm(form)
      .onFormSubmit()
      .create();
      
    console.log("Registered automatic email delivery trigger.");
  } catch (error) {
    console.error("WARNING: Failed to create trigger: " + error);
  }

  // ===============================
  // 4. LOGGING AND SPREADSHEET LINKING
  // ===============================
  try {
    const logsSpreadsheet = SpreadsheetApp.openById(LOGS_SHEET_ID);
    let logsSheet = logsSpreadsheet.getSheetByName(LOGS_TAB_NAME);
    
    if (!logsSheet) { 
      logsSheet = logsSpreadsheet.insertSheet(LOGS_TAB_NAME); 
    }
    
    if (logsSheet.getLastRow() === 0) { 
      logsSheet.getRange("A1:C1").setValues([["Link", "Date", "ID"]]); 
    }
    
    logsSheet.appendRow([form.getPublishedUrl(), new Date(), formId]);
  } catch (error) { 
    console.error("Logging error: " + error); 
  }

  const resultsSpreadsheet = SpreadsheetApp.openById(RESULTS_SHEET_ID);
  const previousSheetIds = resultsSpreadsheet.getSheets().map(s => s.getSheetId());
  
  // Link form to results spreadsheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET, RESULTS_SHEET_ID);
  
  let resultsSheet = null;
  let attempts = 0;
  
  // Wait for the new sheet tab to be created by Google Forms
  while (!resultsSheet && attempts < 10) {
    Utilities.sleep(2000);
    SpreadsheetApp.flush();
    const currentSheets = SpreadsheetApp.openById(RESULTS_SHEET_ID).getSheets();
    
    for (let sheet of currentSheets) {
      if (previousSheetIds.indexOf(sheet.getSheetId()) === -1) { 
        resultsSheet = sheet; 
        break; 
      }
    }
    attempts++;
  }
  
  if (resultsSheet) {
    try { 
      resultsSheet.setName(formId); 
    } catch(error) {} // Ignore if naming fails
    
    console.log("Successfully linked to results spreadsheet.");
    
    try {
        if (resultsSheet.getMaxRows() < 2) resultsSheet.insertRowAfter(1);
        let nextCol = resultsSheet.getLastColumn() + 1;
        
        selectedQuestions.forEach((row, idx) => {
            const safeCorrectAnswer = (row[6] ? String(row[6]) : "").replace(/\n/g, " ").replace(/"/g, '""');
            
            resultsSheet.getRange(1, nextCol).setValue(`Correct ${idx+1}`).setBackground("#e6f4ea");
            resultsSheet.getRange(2, nextCol).setValue(`=ARRAYFORMULA(IF(A2:A<>""; "${safeCorrectAnswer}"; ""))`);
            nextCol++;
        });
    } catch (error) { 
      console.warn("Error editing the results spreadsheet: " + error); 
    }
  } else {
    console.warn("Failed to identify the new results tab (timeout).");
  }

  // ===============================
  // 5. SEND NOTIFICATIONS
  // ===============================
  try {
    let mailingList = [...DEFAULT_RECIPIENTS_LIST];

    // Fetch additional recipients from the sheet (if the tab exists)
    const recipientsSheet = questionsSpreadsheet.getSheetByName(RECIPIENTS_TAB_NAME);
    if (recipientsSheet) {
      const recipientsData = recipientsSheet.getDataRange().getValues();
      recipientsData.forEach(row => {
        const email = row[0];
        if (email && String(email).indexOf("@") !== -1) {
          mailingList.push(String(email).trim());
        }
      });
    }

    // Remove duplicate emails
    mailingList = [...new Set(mailingList)];

    if (mailingList.length > 0) {
      console.log(`Sending invitations to ${mailingList.length} unique recipients...`);
      
      mailingList.forEach(email => {
          try {
            MailApp.sendEmail({ 
              to: email, 
              subject: `Invitation: ${formTitle}`, 
              body: `Hello!\n\nA new knowledge test has been generated.\nLink to the test: ${form.getPublishedUrl()}\n\nGood luck!` 
            });
          } catch (error) {
            console.warn(`Failed to send email to: ${email} - ${error}`);
          }
      });
      console.log("Finished sending notifications.");
    } else {
      console.log("No recipients found for notifications.");
    }

  } catch (error) { 
    console.error("Error in the mailing section: " + error); 
  }

  console.log("=== DONE ===");
}


/**
 * TRIGGER FUNCTION: Manually calculates the score and emails results to the respondent.
 */
function sendResultsEmail(event) {
  try {
    const formResponse = event.response;
    const form = event.source; 
    const respondentEmail = formResponse.getRespondentEmail();
    
    if (!respondentEmail) {
      console.log("No respondent email provided. Skipping email delivery.");
      return;
    }

    // Get answers that can be graded
    const itemResponses = formResponse.getGradableItemResponses();
    
    // --- Manual score calculation ---
    let totalScore = 0;
    for (let i = 0; i < itemResponses.length; i++) {
      totalScore += itemResponses[i].getScore();
    }
    
    // Calculate max score (assuming all multiple choice items are worth 1 point)
    const maxScore = form.getItems(FormApp.ItemType.MULTIPLE_CHOICE).length;

    // Build the HTML body for the email
    let htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Your Test Results</h2>
        <p>Thank you for completing the test: <strong>${form.getTitle()}</strong></p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="margin: 0;">Score: ${totalScore} / ${maxScore}</h3>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
    `;

    // Iterate through responses
    for (let i = 0; i < itemResponses.length; i++) {
      const itemResponse = itemResponses[i];
      const questionTitle = itemResponse.getItem().getTitle();
      const userAnswer = itemResponse.getResponse();
      const pointsEarned = itemResponse.getScore();
      
      const isCorrect = pointsEarned > 0;
      const rowColor = isCorrect ? "#e6f4ea" : "#fce8e6";
      const statusIcon = isCorrect ? "✅" : "❌";

      htmlBody += `
        <tr style="border-bottom: 1px solid #ddd; background-color: ${rowColor};">
          <td style="padding: 10px;">
            <strong>Question ${i + 1}: ${questionTitle}</strong><br>
            Your answer: ${userAnswer} ${statusIcon}
      `;

      // If incorrect, find and display the correct answer
      if (!isCorrect) {
        const choices = itemResponse.getItem().asMultipleChoiceItem().getChoices();
        let correctAnswerText = "Not found";
        
        for (let choice of choices) {
          if (choice.isCorrectAnswer()) {
            correctAnswerText = choice.getValue();
            break;
          }
        }
        htmlBody += `<br><span style="color: #d93025; font-weight: bold;">Correct answer: ${correctAnswerText}</span>`;
      }
      
      htmlBody += `</td></tr>`;
    }

    htmlBody += `
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #777;">This is an automated message.</p>
      </div>
    `;

    MailApp.sendEmail({
      to: respondentEmail,
      subject: `Test Results: ${form.getTitle()}`,
      htmlBody: htmlBody
    });
    
    console.log(`Successfully sent results to: ${respondentEmail}`);

  } catch (error) {
    console.error("Error while sending results email: " + error);
  }
}

/**
 * Utility function to shuffle an array (Fisher-Yates algorithm)
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
