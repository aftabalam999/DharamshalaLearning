// Phase 3 curriculum details for Interactive Quiz Master
// This file is for code-only storage; admin dashboard integration will follow later.

export const phase3Topics = [
  {
    name: 'Project Introduction: Interactive Quiz Master',
    order: 1,
    maxTime: null,
    keyConcepts: ['Overview'],
    description: 'Learn how JavaScript brings websites to life. Understand the goal of making an interactive quiz application using existing HTML & CSS.',
    deliverable: 'No video – intro only',
    video: null
  },
  {
    name: 'Starting the Quiz (Start Page / quiz.html)',
    order: 2,
    maxTime: null,
    keyConcepts: ['Variables', 'Functions', 'DOM Manipulation', 'Events'],
    description: 'Implement "Start Quiz" button functionality to reveal the first question or navigate to quiz.html. Learn DOM basics and event handling.',
    deliverable: '1 Video: Show Start Page + explain variables, functions, events, DOM Manipulation.',
    video: 1
  },
  {
    name: 'Storing Quiz Questions & Answers',
    order: 3,
    maxTime: null,
    keyConcepts: ['Arrays', 'Objects'],
    description: 'Create an array of question objects holding text, options, and correct answers. Practice storing structured data.',
    deliverable: '1 Video: Show array/object structure + explain data organization.',
    video: 1
  },
  {
    name: 'Displaying Questions & Options (quiz.html)',
    order: 4,
    maxTime: null,
    keyConcepts: ['Loops', 'Strings', 'Functions', 'DOM Manipulation'],
    description: 'Use loops to iterate through questions and display them dynamically. Build HTML content using strings.',
    deliverable: '1 Video: Show questions & options appearing dynamically + explanation of loops, strings, DOM usage.',
    video: 1
  },
  {
    name: 'Handling User Answers & Navigation (quiz.html)',
    order: 5,
    maxTime: null,
    keyConcepts: ['Variables', 'Operators', 'Conditional Statements', 'Functions', 'DOM', 'Events'],
    description: 'Detect user answers, compare with correct answers, update score, and move to the next question or results page.',
    deliverable: '1 Video: Show answer handling and navigation + explanation of events, conditionals, and score tracking.',
    video: 1
  },
  {
    name: 'Calculating & Displaying Results (results.html)',
    order: 6,
    maxTime: null,
    keyConcepts: ['Variables', 'Strings', 'DOM', 'Functions', 'URL Parameters (optional)'],
    description: 'Calculate final score and display a result message dynamically. Optionally, pass data between pages.',
    deliverable: '1 Video: Show results display + explanation of score calculation and DOM usage.',
    video: 1
  },
  {
    name: 'Restarting the Quiz (Optional, results.html or quiz.html)',
    order: 7,
    maxTime: null,
    keyConcepts: ['Functions', 'Variables', 'DOM', 'Events'],
    description: 'Implement a "Restart Quiz" feature to reset variables and page state.',
    deliverable: '1 Video: Show reset functionality + explanation of functions, events, and state reset.',
    video: 1
  },
  {
    name: 'Mini Projects: Practice JS Concepts',
    order: 8,
    maxTime: null,
    keyConcepts: ['Variables', 'Arrays', 'Objects', 'Functions', 'DOM', 'Events', 'Operators', 'Strings'],
    description: 'Build focused practice projects: To-Do List, Tip Calculator, Quote Generator. Solidify JS fundamentals before or alongside the main project.',
    deliverable: '1 Video per mini-project: Show working demo + explain concepts applied.',
    video: 3
  },
  {
    name: 'Project Wrap-Up & Reflection',
    order: 9,
    maxTime: null,
    keyConcepts: ['Review All Learned Concepts'],
    description: 'Review JavaScript fundamentals applied in the project: Variables, Data Types, Operators, Strings, Loops, Arrays, Objects, Functions, DOM, Events, Conditional Statements.',
    deliverable: '1 Video: Reflect on learning + demonstrate final working quiz.',
    video: 1
  }
];
