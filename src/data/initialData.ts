import { Phase, Topic } from '../types';

// Extended topic information including project details
export interface TopicDetails {
  name: string;
  order: number;
  maxTime: number; // in minutes
  keyTags: string[];
  deliverable: string;
  icon: string;
  technologies?: string[];
  description?: string;
}

// Initial phases for the campus learning program
export const initialPhases: Omit<Phase, 'id' | 'created_at'>[] = [
  {
    name: 'Phase 1: Student Profile & Course Portal (HTML Only)',
    start_date: new Date('2024-10-01'),
    end_date: new Date('2024-11-30'),
    order: 1
  },
  {
    name: 'Phase 2: Styling & Responsive Design',
    start_date: new Date('2024-12-01'),
    end_date: new Date('2024-12-31'),
    order: 2
  }
];

// Detailed topic information with project specifications
export const detailedTopics: { [phaseName: string]: TopicDetails[] } = {
  'Phase 1: Student Profile & Course Portal (HTML Only)': [
    {
      name: '🏠 Home Page',
      order: 1,
      maxTime: 90,
      keyTags: ['<header>', '<nav>', '<footer>', '<main>', '<ul>', '<li>', '<a>'],
      deliverable: 'Project Video 1 (Page Walkthrough)',
      icon: '🏠',
      technologies: ['HTML5 Semantics', 'Tables', 'Forms'],
      description: 'Create the main landing page. Focus is on mastering fundamental page structure and implementing basic site navigation using the new semantic tags and the anchor tag (<a>) for linking.'
    },
    {
      name: '👤 Profile Page',
      order: 2,
      maxTime: 75,
      keyTags: ['<img> (with src, alt)', '<ol>', '<br>', '<hr>'],
      deliverable: 'Project Video 2 (Page Walkthrough)',
      icon: '👤',
      technologies: ['HTML5 Semantics', 'Tables', 'Forms'],
      description: 'Build a simple "About Me" page. Focus on embedding images, using ordered (<ol>) and unordered (<ul>) lists, and using structural tags like <hr> for visual separation.'
    },
    {
      name: '📚 Courses Page',
      order: 3,
      maxTime: 75,
      keyTags: ['Relative Paths in <a> tags'],
      deliverable: 'Project Video 3 (Page Walkthrough)',
      icon: '📚',
      technologies: ['HTML5 Semantics', 'Tables', 'Forms'],
      description: 'List courses and their descriptions. Focus on creating a clear content hierarchy using heading tags and correctly using relative paths in <a> tags to link to other pages within the project structure.'
    },
    {
      name: '📝 Feedback Page',
      order: 4,
      maxTime: 90,
      keyTags: ['<form>', '<label>', '<input> (types: email, radio, checkbox)', '<textarea>', '<select>', '<button>'],
      deliverable: 'Project Video 4 (Page Walkthrough)',
      icon: '📝',
      technologies: ['HTML5 Semantics', 'Tables', 'Forms'],
      description: 'Construct a fully-featured input form. Focus is on the proper structure of a form, labeling inputs (<label>), and utilizing a wide range of input types for data collection.'
    },
    {
      name: '📊 Grades Table Page',
      order: 5,
      maxTime: 60,
      keyTags: ['<table>', '<caption>', '<thead>', '<tbody>', '<tfoot>', '<tr>', '<th>', '<td>'],
      deliverable: 'Project Video 5 (Page Walkthrough)',
      icon: '📊',
      technologies: ['HTML5 Semantics', 'Tables', 'Forms'],
      description: 'Display tabular data (grades). Focus is entirely on table structure: organizing data into rows and cells, defining columns with headers, and structuring the table body and footer semantically.'
    },
    {
      name: '📞 Contact Us Page',
      order: 6,
      maxTime: 45,
      keyTags: ['mailto: in <a>', 'tel: in <a>', '<address>'],
      deliverable: 'Project Video 6 (Page Walkthrough)',
      icon: '📞',
      technologies: ['HTML5 Semantics', 'Tables', 'Forms'],
      description: 'Provide contact information. Focus on creating actionable links that open an email client (mailto:) or initiate a phone call (tel:), and using the semantic <address> tag.'
    },
    {
      name: 'Conceptual Review',
      order: 7,
      maxTime: 0,
      keyTags: ['Focus on Semantics and Navigation'],
      deliverable: 'Concept Video 7 (Linking It All Together)',
      icon: '🔗',
      technologies: ['HTML5 Semantics', 'Tables', 'Forms'],
      description: 'Review and finalize consistent navigation across all six pages. Ensure all links function correctly and the overall HTML structure is clean and semantically correct.'
    }
  ],
  'Phase 2: Styling & Responsive Design': [
    {
      name: 'Global Stylesheet',
      order: 1,
      maxTime: 0,
      keyTags: ['N/A (Focus is on CSS)'],
      deliverable: 'CSS Foundation',
      icon: '🎨',
      technologies: ['CSS Fundamentals', 'Selectors', 'Box Model', 'Flexbox', 'Media Queries'],
      description: 'Establish the foundation: Resetting default browser styles, setting base typography, styling structural elements (<header>, <nav>), and using pseudo-classes for link interaction.'
    },
    {
      name: 'Page-by-Page Styling',
      order: 2,
      maxTime: 0,
      keyTags: ['N/A (Focus is on CSS)'],
      deliverable: 'CSS Content Styling',
      icon: '🖌️',
      technologies: ['CSS Fundamentals', 'Selectors', 'Box Model', 'Flexbox', 'Media Queries'],
      description: 'Apply styles to specific content: using Flexbox for course cards, structuring forms for usability, styling tables with tr:nth-child for readability, and mastering the CSS Box Model for spacing.'
    },
    {
      name: 'Making It Responsive',
      order: 3,
      maxTime: 0,
      keyTags: ['N/A (Focus is on CSS)'],
      deliverable: 'Responsive Design',
      icon: '📱',
      technologies: ['CSS Fundamentals', 'Selectors', 'Box Model', 'Flexbox', 'Media Queries'],
      description: 'Introduce the basics of Responsive Web Design (RWD). Define breakpoints using Media Queries to adjust styles (e.g., stacking navigation links) for mobile and tablet screens.'
    }
  ]
};

// Simplified topics for backward compatibility
export const initialTopics: { [phaseName: string]: Omit<Topic, 'id' | 'created_at' | 'phase_id'>[] } = {
  'Phase 1: Student Profile & Course Portal (HTML Only)': detailedTopics['Phase 1: Student Profile & Course Portal (HTML Only)'].map(topic => ({
    name: topic.name,
    order: topic.order
  })),
  'Phase 2: Styling & Responsive Design': detailedTopics['Phase 2: Styling & Responsive Design'].map(topic => ({
    name: topic.name,
    order: topic.order
  }))
};

// Goal templates for better guidance
export const goalTemplates: { [topicName: string]: string[] } = {
  '🏠 Home Page': [
    'Create HTML structure using <header>, <nav>, <main>, and <footer> tags',
    'Build a navigation menu with <ul>, <li>, and <a> elements',
    'Structure content with semantic HTML and proper heading hierarchy',
    'Complete the home page layout within 90 minutes and record walkthrough video'
  ],
  '👤 Profile Page': [
    'Add profile image using <img> tag with proper alt attributes',
    'Create profile information using <h2>/<h3> headings and lists',
    'Organize personal details with <ul>/<ol> and <li> elements',
    'Complete profile page within 75 minutes and record walkthrough video'
  ],
  '📚 Courses Page': [
    'Structure course listings using <h2>/<h3> headings',
    'Add course descriptions with <p> elements and proper content hierarchy',
    'Create course links using <a> tags for navigation',
    'Complete courses page within 75 minutes and record walkthrough video'
  ],
  '📝 Feedback Page': [
    'Build feedback form using <form>, <label>, and various <input> types',
    'Add text area for comments using <textarea> element',
    'Include dropdown selections with <select> and submit with <button>',
    'Complete feedback form within 90 minutes and record walkthrough video'
  ],
  '📊 Grades Table Page': [
    'Create grades table using <table>, <thead>, and <tbody> structure',
    'Add table caption with <caption> and organize data with <tr>, <th>, <td>',
    'Structure tabular data properly for accessibility and readability',
    'Complete grades table within 60 minutes and record walkthrough video'
  ],
  '📞 Contact Us Page': [
    'Add contact information using <p> and <h2>/<h3> elements',
    'Create clickable email links using <a> with mailto: protocol',
    'Add phone links using <a> with tel: protocol for mobile compatibility',
    'Complete contact page within 45 minutes and record walkthrough video'
  ],
  '🔗 Conceptual Review': [
    'Demonstrate understanding of HTML document structure and semantic elements',
    'Show how all pages link together using proper navigation',
    'Explain the relationship between different HTML elements used',
    'Record concept video explaining the complete project structure'
  ],
  'React.js Fundamentals': [
    'Build a todo list application with React components',
    'Implement state management for a shopping cart feature',
    'Create reusable components with proper prop handling'
  ],
  'Node.js & Backend Development': [
    'Set up Express server with basic routing',
    'Implement CRUD operations for a REST API',
    'Integrate authentication middleware for secure endpoints'
  ],
  'Project Planning & Architecture': [
    'Design system architecture for full-stack application',
    'Create user stories and technical specifications',
    'Set up project structure with proper folder organization'
  ]
};

// Helper function to get topic details
export const getTopicDetails = (phaseName: string, topicName: string): TopicDetails | null => {
  const phaseTopics = detailedTopics[phaseName];
  if (!phaseTopics) return null;
  
  return phaseTopics.find(topic => topic.name === topicName) || null;
};

// Achievement level descriptions
export const achievementLevels = {
  beginner: {
    range: [0, 40],
    label: 'Getting Started',
    color: 'red',
    description: 'Learning the basics and building foundation'
  },
  developing: {
    range: [41, 70],
    label: 'Developing',
    color: 'yellow',
    description: 'Understanding concepts and applying knowledge'
  },
  proficient: {
    range: [71, 85],
    label: 'Proficient',
    color: 'blue',
    description: 'Comfortable with concepts and solving problems'
  },
  advanced: {
    range: [86, 100],
    label: 'Advanced',
    color: 'green',
    description: 'Mastering concepts and teaching others'
  }
};