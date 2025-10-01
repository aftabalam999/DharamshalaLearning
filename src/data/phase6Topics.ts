// Phase 6 curriculum details for Student Feedback Manager
// This file is for code-only storage; admin dashboard integration will follow later.

export const phase6Topics = [
  {
    name: 'Project Introduction: Student Feedback Manager',
    order: 1,
    maxTime: null,
    keyConcepts: ['Overview'],
    description: 'Understand databases, NoSQL concepts, MongoDB for data storage, Mongoose for schema and model management.',
    deliverable: 'No video – intro only',
    video: null
  },
  {
    name: 'MongoDB Setup & Connection',
    order: 2,
    maxTime: null,
    keyConcepts: ['mongoose.connect()', '.env (dotenv)'],
    description: 'Connect Node.js/Express app to MongoDB (local or Atlas). Keep connection string secure with environment variables.',
    deliverable: '1 Video: Show database connection, explain .env usage, demonstrate successful connection.',
    video: 1
  },
  {
    name: 'Define Schema & Model',
    order: 3,
    maxTime: null,
    keyConcepts: ['mongoose.Schema()', 'mongoose.model()'],
    description: 'Create a Mongoose schema for feedback (name, rating, comments). Build a model to interact with the database.',
    deliverable: '1 Video: Explain schema, model, and why schemas structure data.',
    video: 1
  },
  {
    name: 'Storing New Feedback (Create)',
    order: 4,
    maxTime: null,
    keyConcepts: ['new Model()', 'instance.save()', 'express.json()'],
    description: 'Receive POST requests from frontend form, create a new document, save feedback to MongoDB.',
    deliverable: '1 Video: Submit feedback via form → save to database → confirm stored data (MongoDB Compass or shell).',
    video: 1
  },
  {
    name: 'Retrieving & Displaying Feedback (Read)',
    order: 5,
    maxTime: null,
    keyConcepts: ['Model.find()', 'async/await', 'Express GET route'],
    description: 'Create route to fetch all feedback, send JSON to frontend, dynamically display feedback on “All Feedback” page.',
    deliverable: '1 Video: Fetch feedback → render on frontend → explain full data flow.',
    video: 1
  },
  {
    name: 'Mini Projects / Practice Exercises',
    order: 6,
    maxTime: null,
    keyConcepts: ['CRUD basics (Create & Read focus)', 'Express routes', 'Mongoose models'],
    description: 'Build small apps to practice database integration: contact form collector, student progress tracker, quick notes saver. Use POST to store and GET to retrieve data.',
    deliverable: '1 Video per mini-project: Demo backend functionality, explain schema, routes, and database interactions.',
    video: 3
  },
  {
    name: 'Project Wrap-Up & Reflection',
    order: 7,
    maxTime: null,
    keyConcepts: ['Review MongoDB + Mongoose', 'full-stack data flow'],
    description: 'Consolidate knowledge: connect frontend, backend, database; secure connection; handle user data persistently.',
    deliverable: '1 Video: Showcase final app, explain end-to-end data flow (frontend → backend → database → frontend).',
    video: 1
  }
];
