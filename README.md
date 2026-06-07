# Corporate Knowledge Retention Quizzer 🧠🏢

An automated Google Apps Script solution designed to improve internal knowledge management and employee retention. It dynamically generates Google Forms quizzes from a Google Sheet, automatically grades them, and emails the results to respondents.

## 🎯 Background: The Problem & Solution

In organizations relying on extensive internal knowledge bases, information decay and inconsistencies are common challenges. Employees often struggle to retain specific business processes or updates.

This tool was originally developed for a Google Cloud-based corporate environment to systematically reinforce learning. By automatically generating periodic (e.g., weekly) micro-tests, employees can quickly verify their knowledge, while the organization ensures a single source of truth is actively maintained and reviewed.

## 🐙 The Demo: H.P. Lovecraft & NotebookLM

Because internal corporate data is confidential, this repository includes a **Proof-of-Concept demo** based on the short stories of H.P. Lovecraft.

The sample questions were generated using **Google's NotebookLM**. You can find the source files used for NotebookLM in the `notebooklm_sources/` directory. This demonstrates how you can easily feed any documentation (corporate wikis, handbooks, or fictional stories) into an LLM to generate automated training materials.

## ✨ Features

- **Automated Quiz Creation:** Pulls questions from a designated Google Sheet and builds a Google Form (Quiz mode).
- **Randomization:** Shuffles questions and selects a defined amount (e.g., 10 questions per test) to ensure variety in periodic testing.
- **Auto-Grading & Emailing:** Registers a trigger that calculates the score upon submission and emails a detailed report (correct/incorrect answers) directly to the employee.
- **Logging System:** Keeps track of all generated form URLs and IDs in a dedicated spreadsheet tab for administrative oversight.
- **Mailing List Invites:** Automatically sends an email invitation to a predefined list of employees when a new test is generated.

## 🛠 Setup & Installation

1. Create a new Google Spreadsheet. This will be your main database.
2. Go to `Extensions` > `Apps Script`.
3. Clear the default code and paste the contents of `Code.gs` from this repository.
4. Set up your Google Sheet with the following tabs:
   - **Questions Sheet** (First tab)
   - **Quizzes** (Logs tab)
   - **Recipients** (Mailing list tab, optional)
5. Update the Configuration section in `Code.gs` with your Spreadsheet IDs:

```javascript
const QUESTIONS_SHEET_ID = 'your_sheet_id_here';
const LOGS_SHEET_ID      = 'your_sheet_id_here';
const RESULTS_SHEET_ID   = 'your_sheet_id_here';
```

6. Run the `generateQuickTest()` function.

> **Note:** On the first run, Google will ask for necessary permissions to access Forms, Sheets, and Gmail.

## 📊 Data Structure

The script expects the **Questions Sheet** to have the following column structure (header in row 1):

| Column A | Column B | Column C | Column D | Column E | Column F |
|----------|----------|----------|----------|----------|----------|
| Question text | Option A | Option B | Option C | Option D | Correct Answer |
