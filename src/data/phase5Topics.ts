// Phase 5 curriculum details for Ask Gemini Web App
// This file is for code-only storage; admin dashboard integration will follow later.

export const phase5Topics = [
  {
    name: 'Project Introduction: Ask Gemini Web App',
    order: 1,
    maxTime: null,
    keyConcepts: ['Overview'],
    description: 'Understand full-stack development: frontend communicates with backend server built in Node.js & Express, which integrates with Gemini API.',
    deliverable: 'No video – intro only',
    video: null
  },
  {
    name: 'Express App Setup & Structure',
    order: 2,
    maxTime: null,
    keyConcepts: ['Node.js runtime', 'express()', 'Project folder structure'],
    description: 'Initialize Express server, install dependencies, organize project folders (server code, frontend files).',
    deliverable: '1 Video: Show setup, folder structure, app.listen(), basic server code.',
    video: 1
  },
  {
    name: 'Backend Routes & Request Handling',
    order: 3,
    maxTime: null,
    keyConcepts: ['Express routes (app.get(), app.post())', 'express.json()'],
    description: 'Handle frontend requests via GET/POST. Parse incoming request data (JSON), structure server responses.',
    deliverable: '1 Video: Demonstrate routes handling user inputs.',
    video: 1
  },
  {
    name: 'Gemini API Integration on Backend',
    order: 4,
    maxTime: null,
    keyConcepts: ['fetch() / axios', 'Promises', 'async/await', 'environment variables (.env, dotenv)'],
    description: 'Securely communicate with Gemini API from server. Handle asynchronous responses, parse JSON, return data to frontend.',
    deliverable: '1 Video: Show API integration + explain API key security + backend response processing.',
    video: 1
  },
  {
    name: 'Frontend-Backend Interaction Demo',
    order: 5,
    maxTime: null,
    keyConcepts: ['DOM manipulation', 'fetch() (frontend)', 'Event handling'],
    description: 'Send user input to backend, receive AI-generated content, update frontend dynamically. Demonstrate full-stack communication.',
    deliverable: '1 Video: Demo full app flow (frontend → backend → Gemini → frontend).',
    video: 1
  },
  {
    name: 'Mini Projects / Practice Exercises',
    order: 6,
    maxTime: null,
    keyConcepts: ['Node.js', 'Express routes', 'fetch()/axios', 'JSON responses'],
    description: 'Practice building small backend APIs: AI Fun Facts, AI Daily Journal Prompter, AI Helper Bot with multiple endpoints. Apply async JS and Gemini API integration.',
    deliverable: '1 Video per mini-project: Demo working backend + explain code and API usage.',
    video: 3
  },
  {
    name: 'Project Wrap-Up & Reflection',
    order: 7,
    maxTime: null,
    keyConcepts: ['Review All Learned Concepts'],
    description: 'Review Node.js, Express.js, backend routing, API integration, async operations, full-stack flow. Reflect on building a functional backend app with AI.',
    deliverable: '1 Video: Demonstrate final full-stack "Ask Gemini" app + reflect on learning outcomes.',
    video: 1
  }
];
