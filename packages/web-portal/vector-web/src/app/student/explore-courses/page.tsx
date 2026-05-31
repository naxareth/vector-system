'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

// ---------------------------------------------------------------------------
// Interest categories
// ---------------------------------------------------------------------------
const INTERESTS = [
  { id: 'web-dev',        label: 'Web Development'      },
  { id: 'data-science',   label: 'Data Science & AI'    },
  { id: 'cybersecurity',  label: 'Cybersecurity'        },
  { id: 'graphic-design', label: 'Graphic Design'       },
  { id: 'cloud',          label: 'Cloud Computing'      },
  { id: 'mobile',         label: 'Mobile Development'   },
  { id: 'finance',        label: 'Finance & Accounting' },
  { id: 'marketing',      label: 'Marketing & SEO'      },
  { id: 'ux',             label: 'UI/UX Design'         },
  { id: 'pm',             label: 'Project Management'   },
  { id: 'networking',     label: 'Networking & IT'      },
  { id: 'game-dev',       label: 'Game Development'     },
];

function InterestIcon({ id, className = 'w-4 h-4 flex-shrink-0' }: { id: string; className?: string }) {
  const props = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2 } as const;
  switch (id) {
    case 'web-dev': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
    );
    case 'data-science': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    );
    case 'cybersecurity': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    );
    case 'graphic-design': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
    );
    case 'cloud': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
    );
    case 'mobile': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
    );
    case 'finance': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    );
    case 'marketing': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
    );
    case 'ux': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
    );
    case 'pm': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
    );
    case 'networking': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
    );
    case 'game-dev': return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
    );
    default: return (
      <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    );
  }
}

// ---------------------------------------------------------------------------
// Curated course catalogue — keyed by interest id
// ---------------------------------------------------------------------------
interface CourseItem {
  id: string;
  title: string;
  provider: string;
  link: string;
  match: number;
  tags: string[];
  level: 'Beginner' | 'Intermediate' | 'Advanced';
}

const COURSES: Record<string, CourseItem[]> = {
  'web-dev': [
    { id: 'wd-1', title: 'The Web Developer Bootcamp', provider: 'Udemy', link: 'https://www.udemy.com/course/the-web-developer-bootcamp/', match: 97, tags: ['HTML', 'CSS', 'JavaScript'], level: 'Beginner' },
    { id: 'wd-2', title: 'Full-Stack Web Development with React', provider: 'Coursera', link: 'https://www.coursera.org/specializations/full-stack-react', match: 93, tags: ['React', 'Node.js', 'MongoDB'], level: 'Intermediate' },
    { id: 'wd-3', title: 'Responsive Web Design', provider: 'freeCodeCamp', link: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', match: 88, tags: ['CSS', 'Flexbox', 'Grid'], level: 'Beginner' },
    { id: 'wd-4', title: 'Next.js & React – The Complete Guide', provider: 'Udemy', link: 'https://www.udemy.com/course/nextjs-react-the-complete-guide/', match: 91, tags: ['Next.js', 'React', 'TypeScript'], level: 'Intermediate' },
    { id: 'wd-5', title: 'APIs and Microservices', provider: 'freeCodeCamp', link: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/', match: 85, tags: ['REST', 'APIs', 'Node.js'], level: 'Intermediate' },
  ],
  'data-science': [
    { id: 'ds-1', title: 'IBM Data Science Professional Certificate', provider: 'Coursera', link: 'https://www.coursera.org/professional-certificates/ibm-data-science', match: 97, tags: ['Python', 'Machine Learning', 'SQL'], level: 'Beginner' },
    { id: 'ds-2', title: 'Machine Learning Specialization', provider: 'Coursera', link: 'https://www.coursera.org/specializations/machine-learning-introduction', match: 95, tags: ['ML', 'Python', 'TensorFlow'], level: 'Intermediate' },
    { id: 'ds-3', title: 'Data Analysis with Python', provider: 'edX', link: 'https://www.edx.org/learn/data-analysis/ibm-data-analysis-with-python', match: 90, tags: ['Pandas', 'NumPy', 'Visualization'], level: 'Beginner' },
    { id: 'ds-4', title: 'Deep Learning Specialization', provider: 'Coursera', link: 'https://www.coursera.org/specializations/deep-learning', match: 88, tags: ['Neural Networks', 'NLP', 'CNN'], level: 'Advanced' },
    { id: 'ds-5', title: 'Applied Data Science with Python', provider: 'Coursera', link: 'https://www.coursera.org/specializations/data-science-python', match: 86, tags: ['Scikit-learn', 'Python', 'Data Viz'], level: 'Intermediate' },
  ],
  'cybersecurity': [
    { id: 'cs-1', title: 'Google Cybersecurity Certificate', provider: 'Coursera', link: 'https://www.coursera.org/professional-certificates/google-cybersecurity', match: 97, tags: ['SOC', 'Linux', 'Python'], level: 'Beginner' },
    { id: 'cs-2', title: 'CompTIA Security+ (SY0-701) Complete Course', provider: 'Udemy', link: 'https://www.udemy.com/course/securityplus/', match: 95, tags: ['CompTIA', 'Network Security', 'Compliance'], level: 'Intermediate' },
    { id: 'cs-3', title: 'Ethical Hacking Bootcamp', provider: 'Udemy', link: 'https://www.udemy.com/course/learn-ethical-hacking-from-scratch/', match: 91, tags: ['Pen Testing', 'Kali Linux', 'Exploitation'], level: 'Intermediate' },
    { id: 'cs-4', title: 'Introduction to Cybersecurity', provider: 'edX', link: 'https://www.edx.org/learn/cybersecurity/new-york-university-introduction-to-cyber-security', match: 88, tags: ['Network Security', 'Cryptography', 'Risk'], level: 'Beginner' },
    { id: 'cs-5', title: 'IBM Cybersecurity Analyst Professional Certificate', provider: 'Coursera', link: 'https://www.coursera.org/professional-certificates/ibm-cybersecurity-analyst', match: 85, tags: ['SIEM', 'Threat Intel', 'Forensics'], level: 'Intermediate' },
  ],
  'graphic-design': [
    { id: 'gd-1', title: 'Graphic Design Specialization', provider: 'Coursera', link: 'https://www.coursera.org/specializations/graphic-design', match: 96, tags: ['Typography', 'Branding', 'Adobe'], level: 'Beginner' },
    { id: 'gd-2', title: 'Adobe Photoshop CC – Essentials Training', provider: 'Udemy', link: 'https://www.udemy.com/course/adobe-photoshop-cc-essentials-training-course/', match: 93, tags: ['Photoshop', 'Photo Editing', 'Adobe'], level: 'Beginner' },
    { id: 'gd-3', title: 'Logo Design Masterclass', provider: 'Udemy', link: 'https://www.udemy.com/course/logo-design-master-class/', match: 89, tags: ['Illustrator', 'Branding', 'Logos'], level: 'Beginner' },
    { id: 'gd-4', title: 'Visual Elements of User Interface Design', provider: 'Coursera', link: 'https://www.coursera.org/learn/visual-elements-user-interface-design', match: 85, tags: ['Color Theory', 'Layout', 'UI'], level: 'Beginner' },
    { id: 'gd-5', title: 'Motion Design with After Effects', provider: 'Udemy', link: 'https://www.udemy.com/course/after-effects-motion-graphics/', match: 82, tags: ['After Effects', 'Animation', 'Video'], level: 'Intermediate' },
  ],
  'cloud': [
    { id: 'cl-1', title: 'AWS Certified Solutions Architect – Associate', provider: 'Udemy', link: 'https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/', match: 97, tags: ['AWS', 'Cloud Architecture', 'DevOps'], level: 'Intermediate' },
    { id: 'cl-2', title: 'Google Cloud Professional Cloud Architect', provider: 'Coursera', link: 'https://www.coursera.org/professional-certificates/gcp-cloud-architect', match: 93, tags: ['GCP', 'Kubernetes', 'Terraform'], level: 'Advanced' },
    { id: 'cl-3', title: 'Microsoft Azure Fundamentals (AZ-900)', provider: 'Coursera', link: 'https://www.coursera.org/learn/microsoft-azure-fundamentals-az-900-exam-prep', match: 90, tags: ['Azure', 'Cloud Basics', 'Microsoft'], level: 'Beginner' },
    { id: 'cl-4', title: 'Cloud Computing Specialization', provider: 'Coursera', link: 'https://www.coursera.org/specializations/cloud-computing', match: 87, tags: ['Cloud', 'Distributed Systems', 'DevOps'], level: 'Intermediate' },
    { id: 'cl-5', title: 'Docker & Kubernetes: The Practical Guide', provider: 'Udemy', link: 'https://www.udemy.com/course/docker-kubernetes-the-practical-guide/', match: 85, tags: ['Docker', 'Kubernetes', 'Containers'], level: 'Intermediate' },
  ],
  'mobile': [
    { id: 'mb-1', title: 'Flutter & Dart – The Complete Guide', provider: 'Udemy', link: 'https://www.udemy.com/course/learn-flutter-dart-to-build-ios-android-apps/', match: 96, tags: ['Flutter', 'Dart', 'Cross-platform'], level: 'Beginner' },
    { id: 'mb-2', title: 'Android Development for Beginners', provider: 'Udemy', link: 'https://www.udemy.com/course/master-android-7-nougat-java-app-development-step-by-step/', match: 92, tags: ['Android', 'Java', 'Kotlin'], level: 'Beginner' },
    { id: 'mb-3', title: 'iOS & Swift – The Complete iOS App Development', provider: 'Udemy', link: 'https://www.udemy.com/course/ios-13-app-development-bootcamp/', match: 90, tags: ['iOS', 'Swift', 'Xcode'], level: 'Beginner' },
    { id: 'mb-4', title: 'React Native – The Practical Guide', provider: 'Udemy', link: 'https://www.udemy.com/course/react-native-the-practical-guide/', match: 87, tags: ['React Native', 'JavaScript', 'Mobile'], level: 'Intermediate' },
    { id: 'mb-5', title: 'Meta Android Developer Professional Certificate', provider: 'Coursera', link: 'https://www.coursera.org/professional-certificates/meta-android-developer', match: 84, tags: ['Kotlin', 'Jetpack Compose', 'Android'], level: 'Beginner' },
  ],
  'finance': [
    { id: 'fi-1', title: 'Financial Markets', provider: 'Coursera', link: 'https://www.coursera.org/learn/financial-markets-global', match: 95, tags: ['Investing', 'Stocks', 'Risk'], level: 'Beginner' },
    { id: 'fi-2', title: 'Introduction to Corporate Finance', provider: 'Coursera', link: 'https://www.coursera.org/learn/wharton-finance', match: 91, tags: ['Corporate Finance', 'Valuation', 'NPV'], level: 'Beginner' },
    { id: 'fi-3', title: 'Accounting Fundamentals', provider: 'edX', link: 'https://www.edx.org/learn/accounting/purdue-university-global-accounting-fundamentals', match: 88, tags: ['Bookkeeping', 'Financial Statements', 'GAAP'], level: 'Beginner' },
    { id: 'fi-4', title: 'CFA Level 1 Exam Prep', provider: 'Udemy', link: 'https://www.udemy.com/course/cfa-level-1-exam-complete-prep-course/', match: 85, tags: ['CFA', 'Investments', 'Portfolio'], level: 'Advanced' },
    { id: 'fi-5', title: 'Excel for Finance', provider: 'Udemy', link: 'https://www.udemy.com/course/excel-for-finance/', match: 82, tags: ['Excel', 'Financial Modeling', 'Analysis'], level: 'Beginner' },
  ],
  'marketing': [
    { id: 'mk-1', title: 'Google Digital Marketing & E-commerce Certificate', provider: 'Coursera', link: 'https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce', match: 96, tags: ['SEO', 'SEM', 'Analytics'], level: 'Beginner' },
    { id: 'mk-2', title: 'Social Media Marketing Specialization', provider: 'Coursera', link: 'https://www.coursera.org/specializations/social-media-marketing', match: 92, tags: ['Social Media', 'Content', 'Ads'], level: 'Beginner' },
    { id: 'mk-3', title: 'SEO Training Course', provider: 'Udemy', link: 'https://www.udemy.com/course/seo-training-course/', match: 89, tags: ['SEO', 'Backlinks', 'Keywords'], level: 'Beginner' },
    { id: 'mk-4', title: 'Email Marketing Certification', provider: 'HubSpot', link: 'https://academy.hubspot.com/courses/email-marketing', match: 86, tags: ['Email', 'Campaigns', 'Automation'], level: 'Beginner' },
    { id: 'mk-5', title: 'Facebook Ads & Social Media Marketing', provider: 'Udemy', link: 'https://www.udemy.com/course/facebook-ads-social-media/', match: 83, tags: ['Facebook Ads', 'Meta', 'Paid Social'], level: 'Intermediate' },
  ],
  'ux': [
    { id: 'ux-1', title: 'Google UX Design Professional Certificate', provider: 'Coursera', link: 'https://www.coursera.org/professional-certificates/google-ux-design', match: 97, tags: ['Figma', 'Prototyping', 'User Research'], level: 'Beginner' },
    { id: 'ux-2', title: 'UI/UX Design Bootcamp', provider: 'Udemy', link: 'https://www.udemy.com/course/ui-ux-web-design-using-adobe-xd/', match: 93, tags: ['Adobe XD', 'Wireframing', 'Design Systems'], level: 'Beginner' },
    { id: 'ux-3', title: 'Interaction Design Specialization', provider: 'Coursera', link: 'https://www.coursera.org/specializations/interaction-design', match: 89, tags: ['Interaction', 'Information Architecture', 'Usability'], level: 'Intermediate' },
    { id: 'ux-4', title: 'Figma UI UX Design Essentials', provider: 'Udemy', link: 'https://www.udemy.com/course/figma-ux-ui-design-user-experience-tutorial-course/', match: 87, tags: ['Figma', 'Auto Layout', 'Components'], level: 'Beginner' },
    { id: 'ux-5', title: 'Design Thinking and Innovation', provider: 'edX', link: 'https://www.edx.org/learn/design-thinking/harvard-university-design-thinking-and-innovation', match: 84, tags: ['Design Thinking', 'Innovation', 'Ideation'], level: 'Beginner' },
  ],
  'pm': [
    { id: 'pm-1', title: 'Google Project Management Certificate', provider: 'Coursera', link: 'https://www.coursera.org/professional-certificates/google-project-management', match: 96, tags: ['Agile', 'Scrum', 'PMP'], level: 'Beginner' },
    { id: 'pm-2', title: 'PMP Exam Prep Seminar', provider: 'Udemy', link: 'https://www.udemy.com/course/pmp-pmbok6-exam/', match: 92, tags: ['PMP', 'PMBOK', 'Risk Management'], level: 'Advanced' },
    { id: 'pm-3', title: 'Agile with Atlassian Jira', provider: 'Coursera', link: 'https://www.coursera.org/learn/agile-atlassian-jira', match: 88, tags: ['Jira', 'Agile', 'Sprints'], level: 'Beginner' },
    { id: 'pm-4', title: 'Scrum Master Certification Prep', provider: 'Udemy', link: 'https://www.udemy.com/course/scrum-master-certification/', match: 85, tags: ['Scrum', 'CSM', 'Agile'], level: 'Intermediate' },
    { id: 'pm-5', title: 'Engineering Project Management', provider: 'Coursera', link: 'https://www.coursera.org/specializations/engineering-project-management', match: 81, tags: ['Engineering PM', 'Scheduling', 'Budget'], level: 'Intermediate' },
  ],
  'networking': [
    { id: 'nw-1', title: 'CompTIA Network+ (N10-008) Complete Course', provider: 'Udemy', link: 'https://www.udemy.com/course/comptia-network-n10-007/', match: 96, tags: ['CompTIA', 'Network+', 'TCP/IP'], level: 'Beginner' },
    { id: 'nw-2', title: 'The Bits and Bytes of Computer Networking', provider: 'Coursera', link: 'https://www.coursera.org/learn/computer-networking', match: 92, tags: ['Networking', 'DNS', 'Protocols'], level: 'Beginner' },
    { id: 'nw-3', title: 'Cisco CCNA – Complete Course', provider: 'Udemy', link: 'https://www.udemy.com/course/ccna-complete/', match: 89, tags: ['Cisco', 'CCNA', 'Routing'], level: 'Intermediate' },
    { id: 'nw-4', title: 'IT Support Professional Certificate', provider: 'Coursera', link: 'https://www.coursera.org/professional-certificates/google-it-support', match: 86, tags: ['IT Support', 'Troubleshooting', 'Help Desk'], level: 'Beginner' },
    { id: 'nw-5', title: 'Linux Administration Bootcamp', provider: 'Udemy', link: 'https://www.udemy.com/course/linux-administration-bootcamp/', match: 83, tags: ['Linux', 'Bash', 'Sysadmin'], level: 'Intermediate' },
  ],
  'game-dev': [
    { id: 'gm-1', title: 'Complete C# Unity Game Developer 3D', provider: 'Udemy', link: 'https://www.udemy.com/course/unitycourse2/', match: 96, tags: ['Unity', 'C#', '3D Games'], level: 'Beginner' },
    { id: 'gm-2', title: 'Unreal Engine 5 C++ Developer', provider: 'Udemy', link: 'https://www.udemy.com/course/unrealcourse/', match: 92, tags: ['Unreal Engine', 'C++', 'Game Design'], level: 'Intermediate' },
    { id: 'gm-3', title: 'Game Design and Development Specialization', provider: 'Coursera', link: 'https://www.coursera.org/specializations/game-development', match: 88, tags: ['Game Design', 'Unity', 'Assets'], level: 'Beginner' },
    { id: 'gm-4', title: 'Godot 4 Game Development Bootcamp', provider: 'Udemy', link: 'https://www.udemy.com/course/godot-game-development-projects-complete-course/', match: 84, tags: ['Godot', 'GDScript', 'Indie Games'], level: 'Beginner' },
    { id: 'gm-5', title: 'Introduction to Game Design', provider: 'Coursera', link: 'https://www.coursera.org/learn/game-design', match: 80, tags: ['Game Theory', 'Mechanics', 'Level Design'], level: 'Beginner' },
  ],
};

const PROVIDER_PILL: Record<string, string> = {
  udemy:       'bg-purple-100 text-purple-700',
  coursera:    'bg-blue-100 text-blue-700',
  edx:         'bg-slate-100 text-slate-700',
  freecodecamp:'bg-green-100 text-green-700',
  hubspot:     'bg-orange-100 text-orange-700',
};

function providerClass(p: string) {
  return PROVIDER_PILL[p.toLowerCase()] ?? 'bg-[#06B4C9]/10 text-[#06B4C9]';
}

const LEVEL_PILL: Record<string, string> = {
  Beginner:     'bg-green-50 text-green-700 border-green-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced:     'bg-red-50 text-red-600 border-red-200',
};

export default function ExploreCourses() {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);
  const COURSES_PER_PAGE = 30;

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    setPage(1);
  };

  // Map interest IDs to skill tag keywords for the API
  const INTEREST_TAGS: Record<string, string[]> = {
    'web-dev': ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Next.js'],
    'data-science': ['Python', 'Machine Learning', 'SQL', 'TensorFlow', 'Data'],
    'cybersecurity': ['Security', 'Pen Testing', 'Network Security', 'Cryptography'],
    'graphic-design': ['Photoshop', 'Illustrator', 'Adobe', 'Design', 'Branding'],
    'cloud': ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Cloud'],
    'mobile': ['Flutter', 'React Native', 'iOS', 'Android', 'Swift', 'Kotlin'],
    'finance': ['Finance', 'Accounting', 'Investing', 'Excel'],
    'marketing': ['SEO', 'Marketing', 'Social Media', 'Ads'],
    'ux': ['Figma', 'UX', 'UI', 'Prototyping', 'User Research'],
    'pm': ['Agile', 'Scrum', 'PMP', 'Project Management'],
    'networking': ['CompTIA', 'Cisco', 'Linux', 'Networking'],
    'game-dev': ['Unity', 'Unreal', 'C#', 'Game Design'],
  };

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const tags = selectedInterests.flatMap(id => INTEREST_TAGS[id] || []);
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (tags.length > 0) params.set('tags', tags.join(','));
      params.set('page', page.toString());
      params.set('limit', COURSES_PER_PAGE.toString());

      const res = await fetch(`/api/student/courses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.courses && data.courses.length > 0) {
          setCourses(data.courses.map((c: { id: string; title: string; provider?: string; link?: string; skill_tags?: string[] }) => ({
            id: c.id,
            title: c.title,
            provider: c.provider || 'Unknown',
            link: c.link || '#',
            match: 85,
            tags: c.skill_tags || [],
            level: 'Intermediate' as const,
          })));
          setTotalPages(data.totalPages || 1);
          setLoading(false);
          return;
        }
      }
      // Fallback to hardcoded data if DB is empty
      // eslint-disable-next-line react-hooks/immutability
      fallbackToHardcoded();
    } catch {
      fallbackToHardcoded();
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedInterests, page]);

  // Fallback: use hardcoded COURSES if DB is empty
  const fallbackToHardcoded = () => {
    const ids = selectedInterests.length > 0 ? selectedInterests : Object.keys(COURSES);
    const all = ids.flatMap(id => COURSES[id] ?? []);
    const seen = new Set<string>();
    const unique = all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    const q = search.toLowerCase().trim();
    const filtered = q
      ? unique.filter(c =>
          c.title.toLowerCase().includes(q) ||
          c.provider.toLowerCase().includes(q) ||
          c.tags.some(t => t.toLowerCase().includes(q))
        )
      : unique;
    const sorted = filtered.sort((a, b) => b.match - a.match);
    setCourses(sorted.slice((page - 1) * COURSES_PER_PAGE, page * COURSES_PER_PAGE));
    setTotalPages(Math.max(1, Math.ceil(sorted.length / COURSES_PER_PAGE)));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const pagedCourses = courses;

  // Simple pagination control
  function Pagination() {
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-center items-center gap-2 mt-6">
        <button
          className="px-2 py-1 rounded border text-xs font-medium disabled:opacity-40"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Prev
        </button>
        <span className="text-xs text-gray-500">
          Page {page} of {totalPages}
        </span>
        <button
          className="px-2 py-1 rounded border text-xs font-medium disabled:opacity-40"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* ── Page header ── */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/student/coach" className="hover:text-[#06B4C9] transition-colors">AI Coach</Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">Explore Courses</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Explore Courses</h1>
          <p className="text-sm text-gray-400 mt-0.5">Pick your interests and discover courses that match your goals.</p>
        </div>
        {selectedInterests.length > 0 && (
          <button
            onClick={() => setSelectedInterests([])}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 mt-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Interest chips ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          What are you interested in?
          <span className="ml-2 text-xs font-normal text-gray-400">Select one or more</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(interest => {
            const active = selectedInterests.includes(interest.id);
            return (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  active
                    ? 'bg-[#06B4C9] border-[#06B4C9] text-white shadow-sm shadow-[#06B4C9]/20'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-[#06B4C9] hover:text-[#06B4C9]'
                }`}
              >
                <InterestIcon id={interest.id} />
                {interest.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, provider, or skill..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B4C9] placeholder:text-gray-400 bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Results label ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {courses.length} course{courses.length !== 1 ? 's' : ''} found
          {selectedInterests.length > 0 && (
            <span className="ml-1 text-gray-400">
              in {selectedInterests.map(id => INTERESTS.find(i => i.id === id)?.label).join(', ')}
            </span>
          )}
        </p>
      </div>

      {/* ── Course grid ── */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-600 mb-1">No courses found</p>
          <p className="text-xs text-gray-400">Try a different search or select more interests.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pagedCourses.map((course, i) => (
              <div
                key={course.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-gray-300 transition-all flex flex-col gap-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 mt-0.5">
                      {(page - 1) * COURSES_PER_PAGE + i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{course.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${providerClass(course.provider)}`}>
                          {course.provider}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${LEVEL_PILL[course.level]}`}>
                          {course.level}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-sm font-bold text-[#06B4C9]">{course.match}%</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {course.tags.map(tag => (
                    <span key={tag} className="text-xs text-gray-500 border border-gray-200 rounded-full px-2 py-0.5 bg-gray-50">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex justify-end mt-auto">
                  <a
                    href={course.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-[#06B4C9] hover:text-[#06B4C9] transition-colors bg-white inline-flex items-center gap-1"
                  >
                    Take Course
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Pagination />
        </>
      )}
    </DashboardLayout>
  );
}
