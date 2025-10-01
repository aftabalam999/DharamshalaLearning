// Phase 7 curriculum details for CollabSphere
// This file is for code-only storage; admin dashboard integration will follow later.

export const phase7Topics = [
  {
    name: 'Project Introduction: CollabSphere',
    order: 1,
    maxTime: null,
    keyConcepts: ['Overview of full-stack + AI integration'],
    description: 'Understand project scope: full-stack development, AI-powered collaboration, portfolio-ready SaaS application.',
    deliverable: 'No video – intro only',
    video: null
  },
  {
    name: 'User Authentication System',
    order: 2,
    maxTime: null,
    keyConcepts: ['bcrypt.js (password hashing)', 'JWT (auth)', 'Express routes', 'MongoDB'],
    description: 'Secure user registration, login, JWT-protected routes, store users in MongoDB.',
    deliverable: 'Video 1: Registration & Login demo, explain auth flow and JWT handling',
    video: 1
  },
  {
    name: 'Project Creation & Collaboration',
    order: 3,
    maxTime: null,
    keyConcepts: ['Express routes', 'MongoDB relations', 'Mongoose models'],
    description: 'Create projects, invite users as members, display user dashboard.',
    deliverable: 'Video 2: Create project, add members, demo dashboard',
    video: 1
  },
  {
    name: 'Markdown Notes Management',
    order: 4,
    maxTime: null,
    keyConcepts: ['SimpleMDE editor', 'CRUD operations', 'MongoDB'],
    description: 'Create, edit, save notes; basic collaboration logic.',
    deliverable: 'Video 3: CRUD notes demo, save to DB, frontend interaction',
    video: 1
  },
  {
    name: 'Gemini AI Integration with Notes',
    order: 5,
    maxTime: null,
    keyConcepts: ['Gemini API', 'Express backend routes', 'fetch/axios'],
    description: 'Buttons to explain notes or suggest improvements via Gemini; backend handles API calls securely.',
    deliverable: 'Video 4: Gemini explain & suggestion demo, show backend API routes',
    video: 1
  },
  {
    name: 'File Upload & Preview',
    order: 6,
    maxTime: null,
    keyConcepts: ['Multer (or Cloudinary)', 'file handling', 'MongoDB references'],
    description: 'Upload project files, basic preview, Gemini code explanation for supported files.',
    deliverable: 'Video 5: Upload demo, preview, Gemini code explanation',
    video: 1
  },
  {
    name: 'Contribution Analytics',
    order: 7,
    maxTime: null,
    keyConcepts: ['Express GET routes', 'MongoDB queries', 'data aggregation'],
    description: 'Track user activity: notes created, files uploaded, project contributions.',
    deliverable: 'Video 6: Analytics demo, basic dashboard summary',
    video: 1
  },
  {
    name: 'Public Shareable Project Page & README Generation',
    order: 8,
    maxTime: null,
    keyConcepts: ['Public routes', 'Gemini API', 'Markdown generation'],
    description: 'Generate project README via Gemini, make project or README publicly viewable.',
    deliverable: 'Video 7: Public project page demo, README generation using Gemini',
    video: 1
  },
  {
    name: 'Mini Projects / Practice Exercises',
    order: 9,
    maxTime: null,
    keyConcepts: ['Isolated practice for features'],
    description: '1) Authentication system, 2) Collaborative Markdown notes, 3) Gemini-powered README generator.',
    deliverable: 'Optional videos for practice, helps prep final project',
    video: 3
  },
  {
    name: 'Project Wrap-Up & Reflection',
    order: 10,
    maxTime: null,
    keyConcepts: ['Full-stack flow', 'secure integration', 'AI enhancement'],
    description: 'Consolidate all features, demonstrate end-to-end functionality, deployment readiness.',
    deliverable: 'Optional reflection video summarizing full app',
    video: 1
  }
];
