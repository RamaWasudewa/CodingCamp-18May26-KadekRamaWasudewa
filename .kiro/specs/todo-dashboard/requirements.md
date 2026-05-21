# Requirements Document

## Introduction

The **Todo Dashboard** is a personal productivity web application built with HTML, CSS, and Vanilla JavaScript. It runs entirely in the browser with no backend or framework dependencies. All user data is persisted using the browser's LocalStorage API. The dashboard provides four core productivity widgets — a time-based greeting, a Pomodoro focus timer, a to-do list, and a quick links panel — along with optional enhancements for custom naming, light/dark theming, and duplicate task prevention.

The application is delivered as a single-page layout with one CSS file (`css/style.css`) and one JavaScript file (`js/app.js`), and must function correctly in modern versions of Chrome, Firefox, Edge, and Safari.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI component that displays the current time, date, and a personalized greeting message.
- **Focus_Timer**: The UI component that implements a 25-minute Pomodoro countdown timer.
- **Todo_List**: The UI component that manages a collection of user-defined tasks.
- **Quick_Links**: The UI component that displays user-defined shortcut buttons linking to external URLs.
- **Task**: A single to-do item consisting of a text description and a completion status.
- **Link**: A user-defined entry consisting of a label and a URL, displayed as a clickable button.
- **LocalStorage**: The browser's Web Storage API used to persist all user data across sessions.
- **Theme**: The visual color scheme of the Dashboard, either light or dark.
- **Session**: A single browser session from page load to page close or refresh.

---

## Requirements

### Requirement 1: Time and Date Greeting

**User Story:** As a user, I want to see the current time, date, and a greeting based on the time of day, so that I have an at-a-glance sense of when I am working.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Greeting_Widget SHALL display the current local time in HH:MM format and the current date in the format "Weekday, DD Month YYYY" (e.g., "Monday, 26 May 2025").
2. WHILE the Dashboard is open, THE Greeting_Widget SHALL update the displayed time and date every 60 seconds to reflect the current local time and date.
3. WHEN the current local hour is between 05:00 and 11:59 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Morning".
4. WHEN the current local hour is between 12:00 and 17:59 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. WHEN the current local hour is between 18:00 and 21:59 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Evening".
6. WHEN the current local hour is between 22:00 and 23:59 or between 00:00 and 04:59 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Night".
7. IF the browser cannot determine the current local time, THEN THE Greeting_Widget SHALL display a placeholder string in place of the time and date and SHALL NOT display an error to the user.

---

### Requirement 2: Custom Name in Greeting

**User Story:** As a user, I want to enter my name so that the greeting addresses me personally.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL provide an input field for the user to enter their name, accepting a maximum of 100 characters.
2. WHEN the user submits a name that is non-empty after trimming leading and trailing whitespace, THE Greeting_Widget SHALL append the trimmed name to the greeting message (e.g., "Good Morning, Alex") within 300 milliseconds of submission.
3. WHEN the user submits a name that is non-empty after trimming leading and trailing whitespace, THE Dashboard SHALL attempt to persist the trimmed name to LocalStorage under the key "greeting_name".
4. WHEN the Dashboard loads and a saved name exists in LocalStorage under the key "greeting_name", THE Greeting_Widget SHALL display the saved name in the greeting without requiring re-entry.
5. IF the Dashboard fails to read the name from LocalStorage on load, THEN THE Greeting_Widget SHALL display the greeting without a name and SHALL NOT display an error to the user.
6. IF the user clears the name field and submits, THEN THE Greeting_Widget SHALL display the greeting without a name.
7. IF the user clears the name field and submits, THEN THE Dashboard SHALL remove the "greeting_name" entry from LocalStorage.
8. IF the Dashboard fails to write the name to LocalStorage, THEN THE Greeting_Widget SHALL display the greeting using the submitted name for the current session and SHALL NOT display an error to the user.

---

### Requirement 3: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer so that I can work in focused Pomodoro sessions.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialize with a countdown value of 25 minutes and 00 seconds (25:00) on page load.
2. WHEN the user activates the Start button, THE Focus_Timer SHALL begin counting down in one-second intervals from the currently displayed remaining time.
3. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL display the remaining time in MM:SS format.
4. WHEN the user activates the Stop button, THE Focus_Timer SHALL pause the countdown and retain the current remaining time.
5. WHEN the user activates the Reset button, THE Focus_Timer SHALL stop any active countdown and reset the display to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop the countdown completely and display an on-page notification message that persists until the user activates the Reset button.
7. WHILE the Focus_Timer is counting down or has reached 00:00, THE Focus_Timer SHALL disable the Start button to prevent duplicate timers; WHEN the Focus_Timer is paused, THE Focus_Timer SHALL re-enable the Start button.
8. WHILE the Focus_Timer is paused, reset, or has reached 00:00, THE Focus_Timer SHALL disable the Stop button.

---

### Requirement 4: To-Do List

**User Story:** As a user, I want to manage a list of tasks so that I can track what I need to accomplish.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an input field and an Add button for creating new tasks.
2. WHEN the user submits a non-empty task description of 200 characters or fewer, THE Todo_List SHALL add the task to the list with a default status of incomplete; IF the addition fails due to a technical reason such as a storage limit, THEN THE Todo_List SHALL display an inline error message.
3. WHEN a task is added, edited, marked done, or deleted, THE Dashboard SHALL attempt to persist the updated task collection to LocalStorage.
4. WHEN the Dashboard loads, THE Todo_List SHALL restore all previously saved tasks from LocalStorage and display them with their saved description text and completion status.
5. WHEN the user activates the Mark Done control on a task, THE Todo_List SHALL toggle the task's completion status and apply a strikethrough visual style to completed tasks; the strikethrough SHALL only be applied through explicit user interaction with the Mark Done control.
6. WHEN the user activates the Edit control on a task, THE Todo_List SHALL present the current task description in an editable field; WHEN the user activates the Save control with a non-empty description of 200 characters or fewer, THE Todo_List SHALL update the task text; IF the user activates the Cancel control, THEN THE Todo_List SHALL discard the changes and restore the original task text.
7. WHEN the user activates the Delete control on a task, THE Todo_List SHALL remove the task from the list and from LocalStorage.
8. IF the user attempts to add a task with an empty description, THEN THE Todo_List SHALL reject the input and display an inline validation message indicating the description cannot be empty.
9. IF the user attempts to add a task with a description exceeding 200 characters, THEN THE Todo_List SHALL reject the input and display an inline validation message indicating the 200-character limit.
10. IF the Dashboard fails to load tasks from LocalStorage on page load, THEN THE Todo_List SHALL display an empty list and SHALL NOT display an error to the user.
11. IF a LocalStorage write operation fails after a task mutation, THEN THE Todo_List SHALL retain the updated task list in memory for the current session and display an inline error message indicating the save failed.
12. WHEN the Todo_List contains no tasks, THE Todo_List SHALL display a placeholder message indicating the list is empty.

---

### Requirement 5: Prevent Duplicate Tasks

**User Story:** As a user, I want the app to prevent me from adding the same task twice so that my list stays clean and uncluttered.

#### Acceptance Criteria

1. IF the user attempts to add a task whose trimmed, lowercased description does not match the trimmed, lowercased description of any existing task, THEN THE Todo_List SHALL proceed with adding the task normally.
2. WHEN the user attempts to add a task, THE Todo_List SHALL compare the trimmed, lowercased new description against the trimmed, lowercased descriptions of all existing tasks; IF a match is found, THEN THE Todo_List SHALL reject the input, retain the user's original input in the input field, and display an inline validation message indicating the task already exists.
3. WHEN the user edits an existing task, THE Todo_List SHALL compare the trimmed, lowercased edited description against the trimmed, lowercased descriptions of all other tasks, excluding the task being edited; IF no match is found, THEN THE Todo_List SHALL proceed with saving the edit.
4. IF the edited description matches another task's description (case-insensitive, after trimming), THEN THE Todo_List SHALL reject the edit, retain the edited text in the editable field, and display an inline validation message indicating the task already exists.
5. IF the duplicate detection mechanism encounters an error during an add or edit operation, THEN THE Todo_List SHALL reject the operation and display an inline error message indicating a system error.

---

### Requirement 6: Quick Links

**User Story:** As a user, I want to save and access my favorite websites as one-click buttons so that I can navigate quickly without typing URLs.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide an input field for a link label (maximum 50 characters) and an input field for a URL (maximum 2048 characters), and an Add button for creating new link entries.
2. WHEN the user submits a valid label and URL, THE Quick_Links SHALL display the new entry as a clickable button appended after any existing link buttons, in insertion order.
3. WHEN a link button is activated, THE Dashboard SHALL open the associated URL in a new browser tab.
4. WHEN a link is added or deleted, THE Dashboard SHALL persist the updated link collection to LocalStorage.
5. WHEN the Dashboard loads, THE Quick_Links SHALL restore all previously saved links from LocalStorage and render them as buttons in their saved insertion order.
6. WHEN the user activates the Delete control on a link, THE Quick_Links SHALL remove the link button and update LocalStorage.
7. IF the user attempts to add a link with an empty label, an empty URL, a label exceeding 50 characters, a URL exceeding 2048 characters, a URL that duplicates an existing saved URL, or when the total number of saved links has reached 20, THEN THE Quick_Links SHALL reject the input and display an inline validation message describing the specific failure; WHEN the user corrects the input, THE Quick_Links SHALL clear the validation message.
8. IF the user attempts to add a link with a URL that does not begin with "http://" or "https://", THEN THE Quick_Links SHALL reject the input and display an inline validation message indicating the URL format is invalid; WHEN the user corrects the URL, THE Quick_Links SHALL clear the validation message.
9. IF LocalStorage is unavailable or the stored links data cannot be parsed as valid JSON on page load, THEN THE Quick_Links SHALL display an empty links panel and SHALL NOT display an error to the user.

---

### Requirement 7: Light / Dark Mode

**User Story:** As a user, I want to toggle between a light and dark theme so that I can use the dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a theme toggle control that is rendered within the viewport, has a minimum clickable area of 24×24 pixels, and displays a label or icon indicating the currently active theme.
2. WHEN the user activates the theme toggle, THE Dashboard SHALL switch the active Theme, apply the corresponding CSS styles across all widgets within 300 milliseconds, and update the toggle's own visual state to reflect the newly active theme.
3. WHEN the user activates the theme toggle, THE Dashboard SHALL attempt to persist the selected Theme value ("light" or "dark") to LocalStorage under the key "theme".
4. IF the Dashboard fails to write the selected Theme to LocalStorage, THEN THE Dashboard SHALL continue using the selected theme for the current session without displaying an error to the user.
5. WHEN the Dashboard loads and a saved Theme value exists in LocalStorage under the key "theme", THE Dashboard SHALL apply the saved Theme without requiring the user to toggle again.
6. IF no saved Theme exists in LocalStorage under the key "theme", THEN THE Dashboard SHALL apply the light Theme as the default.
7. IF the Dashboard fails to load the saved Theme from LocalStorage, THEN THE Dashboard SHALL apply the light Theme as the default.

---

### Requirement 8: Data Persistence Integrity

**User Story:** As a user, I want my data to survive page refreshes so that I never lose my tasks, links, or preferences.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL read all persisted data from LocalStorage before rendering any widget content; IF a LocalStorage key is absent, THEN THE Dashboard SHALL initialize that category with its empty default state without displaying an error.
2. WHEN any user action modifies application state (task added, task edited, task deleted, task toggled, link added, link deleted, name saved, theme changed), THE Dashboard SHALL write the updated state to LocalStorage so that the write completes before any subsequent page load reflects stale data.
3. THE Dashboard SHALL use the following distinct LocalStorage keys: "tasks" for the task list, "links" for the quick links, "greeting_name" for the user name, and "theme" for the theme preference.
4. IF a LocalStorage write operation fails, THEN THE Dashboard SHALL retain the updated state in memory for the current session and SHALL NOT display an error to the user.
5. IF LocalStorage data for any category is present but cannot be parsed as valid JSON on page load, THEN THE Dashboard SHALL discard the corrupted data for that category and initialize that category with its empty default state: an empty array for "tasks", an empty array for "links", an empty string for "greeting_name", and "light" for "theme"; THE Dashboard SHALL NOT display an error to the user.

---

### Non-Functional Requirements

### NFR-1: Simplicity

**User Story:** As a user, I want a clean and minimal interface so that the dashboard is easy to use without visual clutter.

#### Acceptance Criteria

1. THE Dashboard SHALL present all four widgets on a single page without requiring navigation between views.
2. THE Dashboard SHALL use a single CSS file located at `css/style.css` and a single JavaScript file located at `js/app.js`.
3. THE Dashboard SHALL not depend on any external JavaScript frameworks, CSS frameworks, or third-party libraries.

---

### NFR-2: Performance

**User Story:** As a user, I want the dashboard to load quickly and respond immediately to my interactions so that it does not slow down my workflow.

#### Acceptance Criteria

1. THE Dashboard SHALL complete initial render and display all widget content within 2 seconds on a standard broadband connection.
2. WHEN the user interacts with any control (button click, form submit, timer tick), THE Dashboard SHALL update the UI within 100 milliseconds.

---

### NFR-3: Visual Design

**User Story:** As a user, I want a visually appealing and readable interface so that using the dashboard is a pleasant experience.

#### Acceptance Criteria

1. THE Dashboard SHALL apply a consistent typographic scale with a minimum body font size of 14px.
2. THE Dashboard SHALL maintain a color contrast ratio of at least 4.5:1 between text and background colors in both light and dark themes, in compliance with WCAG 2.1 AA.
3. THE Dashboard SHALL apply a clear visual hierarchy that distinguishes widget titles, primary content, and secondary controls.
4. THE Dashboard SHALL be responsive and remain usable at viewport widths from 320px to 1920px.
