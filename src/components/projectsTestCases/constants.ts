import { Priority, Status, TestCase, Project, AutomationType } from './types';

export const SECTIONS = [
  'Authentication',
  'User Profile',
  'Checkout Process',
  'Inventory Management',
  'Reporting API',
  'Settings',
  'Billing & Invoicing',
  'Notifications',
  'Third-party Integrations',
  'Admin Dashboard',
  'Data Export',
  'Search Functionality',
  'Mobile Responsiveness',
  'Accessibility Checks',
  'Performance Metrics',
  'Security Compliance',
  'Localization',
  'Onboarding Flow',
  'GDPR Compliance',
  'Audit Logs',
  'Email Templates',
  'Payment Gateway',
  'Subscription Management',
  'Customer Support'
];

export const PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Core Platform V2',
    key: 'CP',
    description: 'Main SaaS platform overhaul including new authentication and billing modules.',
    lead: 'Alex Morgan',
    status: 'Active',
    dueDate: new Date('2024-12-01'),
    updatedAt: new Date('2024-10-26'),
    stats: {
      testCasesCount: 150,
      passRate: 94
    },
    members: ['https://picsum.photos/seed/alex/100/100', 'https://picsum.photos/seed/sarah/100/100', 'https://picsum.photos/seed/mike/100/100'],
    externalLink: 'https://jira.company.com/browse/CP',
    createdBy: 'System'
  },
  {
    id: 'proj-2',
    name: 'Mobile App (iOS)',
    key: 'IOS',
    description: 'Native iOS application for field agents. Focus on offline capabilities.',
    lead: 'Sarah Jenkins',
    status: 'Active',
    dueDate: new Date('2024-10-15'),
    updatedAt: new Date('2024-10-25'),
    stats: {
      testCasesCount: 45,
      passRate: 88
    },
    members: ['https://picsum.photos/seed/sarah/100/100', 'https://picsum.photos/seed/john/100/100'],
    createdBy: 'Sarah Jenkins'
  },
  {
    id: 'proj-3',
    name: 'Analytics Engine',
    key: 'AE',
    description: 'Big data processing pipeline and reporting dashboard widgets.',
    lead: 'Mike Ross',
    status: 'On Hold',
    dueDate: new Date('2025-01-20'),
    updatedAt: new Date('2024-09-15'),
    stats: {
      testCasesCount: 12,
      passRate: 0
    },
    members: ['https://picsum.photos/seed/mike/100/100'],
    createdBy: 'Mike Ross'
  },
  {
    id: 'proj-4',
    name: 'Android App',
    key: 'AND',
    description: 'Native Android application for field agents.',
    lead: 'David Kim',
    status: 'Active',
    dueDate: new Date('2024-11-30'),
    updatedAt: new Date('2024-10-20'),
    stats: { testCasesCount: 89, passRate: 76 },
    members: ['https://picsum.photos/seed/david/100/100'],
    createdBy: 'David Kim'
  },
  {
    id: 'proj-5',
    name: 'Customer Portal',
    key: 'CUST',
    description: 'External facing portal for end-users.',
    lead: 'Emily Chen',
    status: 'Review',
    dueDate: new Date('2025-02-15'),
    updatedAt: new Date('2024-10-27'),
    stats: { testCasesCount: 34, passRate: 92 },
    members: ['https://picsum.photos/seed/emily/100/100'],
    createdBy: 'System'
  },
  {
    id: 'proj-6',
    name: 'Internal Tools',
    key: 'INT',
    description: 'Staff management and HR tools.',
    lead: 'Greg House',
    status: 'Completed',
    dueDate: new Date('2023-12-20'),
    updatedAt: new Date('2023-12-20'),
    stats: { testCasesCount: 112, passRate: 100 },
    members: [],
    createdBy: 'System'
  },
  {
    id: 'proj-7',
    name: 'API Gateway',
    key: 'GW',
    description: 'Centralized API management layer.',
    lead: 'Sarah Connor',
    status: 'Active',
    dueDate: new Date('2024-09-10'),
    updatedAt: new Date('2024-10-10'),
    stats: { testCasesCount: 67, passRate: 85 },
    members: [],
    createdBy: 'Sarah Connor'
  },
  {
    id: 'proj-8',
    name: 'Data Warehouse',
    key: 'DW',
    description: 'Snowflake integration projects.',
    lead: 'John Smith',
    status: 'Active',
    dueDate: new Date('2024-10-01'),
    updatedAt: new Date('2024-10-01'),
    stats: { testCasesCount: 23, passRate: 60 },
    members: [],
    createdBy: 'System'
  },
  {
    id: 'proj-9',
    name: 'ML Ops Pipeline',
    key: 'ML',
    description: 'Automated training and deployment for ML models.',
    lead: 'Ada Lovelace',
    status: 'Active',
    dueDate: new Date('2025-06-01'),
    updatedAt: new Date('2024-10-22'),
    stats: { testCasesCount: 15, passRate: 100 },
    members: [],
    createdBy: 'Ada Lovelace'
  },
  {
    id: 'proj-10',
    name: 'Website Redesign',
    key: 'WEB',
    description: 'Marketing website refresh.',
    lead: 'Peter Parker',
    status: 'Completed',
    dueDate: new Date('2023-08-15'),
    updatedAt: new Date('2023-08-15'),
    stats: { testCasesCount: 200, passRate: 98 },
    members: [],
    createdBy: 'Peter Parker'
  },
  {
    id: 'proj-11',
    name: 'Legacy Migration',
    key: 'LEG',
    description: 'Migration from old monolith to microservices.',
    lead: 'Bruce Banner',
    status: 'On Hold',
    dueDate: new Date('2025-12-30'),
    updatedAt: new Date('2024-08-30'),
    stats: { testCasesCount: 40, passRate: 50 },
    members: [],
    createdBy: 'Bruce Banner'
  },
  {
    id: 'proj-12',
    name: 'Compliance Audit',
    key: 'AUD',
    description: 'Yearly security and compliance verification.',
    lead: 'Tony Stark',
    status: 'Active',
    dueDate: new Date('2024-08-01'),
    updatedAt: new Date('2024-10-28'),
    stats: { testCasesCount: 300, passRate: 89 },
    members: [],
    createdBy: 'Tony Stark'
  }
];

export const INITIAL_TEST_CASES: TestCase[] = [
  {
    id: 'TC-101',
    projectId: 'proj-1',
    title: 'Verify user can login with valid credentials',
    section: 'Authentication',
    priority: Priority.Critical,
    status: Status.Ready,
    automationType: AutomationType.UI,
    preconditions: 'User must be registered.',
    steps: [
      { id: '1', action: 'Navigate to login page', expectedResult: 'Login form visible' },
      { id: '2', action: 'Enter valid email and password', expectedResult: 'Fields populated' },
      { id: '3', action: 'Click Submit', expectedResult: 'Redirected to Dashboard' }
    ],
    tags: ['smoke', 'login'],
    updatedAt: new Date('2023-10-25T10:00:00'),
    createdBy: 'John Doe'
  },
  {
    id: 'TC-102',
    projectId: 'proj-1',
    title: 'Verify password reset email trigger',
    section: 'Authentication',
    priority: Priority.High,
    status: Status.Ready,
    automationType: AutomationType.API,
    steps: [
      { id: '1', action: 'Click "Forgot Password"', expectedResult: 'Reset modal opens' },
      { id: '2', action: 'Enter email', expectedResult: 'Success message shown' }
    ],
    tags: ['email'],
    updatedAt: new Date('2023-10-26T14:30:00'),
    createdBy: 'Jane Smith'
  },
  {
    id: 'TC-201',
    projectId: 'proj-1',
    title: 'Validate credit card checksum calculation',
    section: 'Checkout Process',
    priority: Priority.Critical,
    status: Status.Draft,
    automationType: AutomationType.Manual,
    steps: [],
    tags: ['payment', 'validation'],
    updatedAt: new Date('2023-10-27T09:15:00'),
    createdBy: 'Mike Ross'
  },
  {
    id: 'TC-205',
    projectId: 'proj-2',
    title: 'Guest checkout with PayPal',
    section: 'Checkout Process',
    priority: Priority.Medium,
    status: Status.Review,
    automationType: AutomationType.UI,
    steps: [],
    tags: ['payment', 'paypal'],
    updatedAt: new Date('2023-10-27T11:20:00'),
    createdBy: 'Mike Ross'
  },
  {
    id: 'TC-301',
    projectId: 'proj-1',
    title: 'Update user profile avatar',
    section: 'User Profile',
    priority: Priority.Low,
    status: Status.Deprecated,
    automationType: AutomationType.UI,
    steps: [],
    tags: ['ui', 'upload'],
    updatedAt: new Date('2023-10-20T16:45:00'),
    createdBy: 'John Doe'
  },
  // Generating more realistic mock data entries to fill the table across multiple projects
  ...Array.from({ length: 250 }).map((_, i) => ({
    id: `TC-${400 + i}`,
    projectId: PROJECTS[i % PROJECTS.length].id, // Cycle through all projects
    title: `Verify ${SECTIONS[i % SECTIONS.length]} functionality scenario #${i + 1}`,
    section: SECTIONS[i % SECTIONS.length], // Cycle through all sections
    priority: i % 5 === 0 ? Priority.Critical : i % 3 === 0 ? Priority.High : i % 2 === 0 ? Priority.Medium : Priority.Low,
    status: i % 7 === 0 ? Status.Review : i % 5 === 0 ? Status.Draft : Status.Ready,
    automationType: i % 3 === 0 ? AutomationType.API : i % 2 === 0 ? AutomationType.UI : AutomationType.Manual,
    steps: [{ id: '1', action: 'Perform action', expectedResult: 'Success' }],
    tags: ['automated', 'regression', `tag-${i % 10}`],
    updatedAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
    createdBy: 'System'
  }))
];