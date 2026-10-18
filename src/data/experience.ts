export type EmploymentType = 'Full Time' | 'Part Time' | 'Contract' | 'Internship' | 'Education';

export interface Role {
  title: string;
  company: string;
  companyUrl?: string;
  employmentType: EmploymentType;
  start: string;
  end: string;
  current: boolean;
  /** Overrides the computed tenure, e.g. for year-only dates. */
  duration?: string;
  bullets: string[];
}

export interface CompanyGroup {
  company: string;
  companyUrl?: string;
  roles: Role[];
}

/** Group consecutive roles at the same company (preserves array order). */
export function groupExperienceByCompany(roles: Role[]): CompanyGroup[] {
  const groups: CompanyGroup[] = [];
  for (const role of roles) {
    const last = groups[groups.length - 1];
    if (last && last.company === role.company) {
      last.roles.push(role);
    } else {
      groups.push({
        company: role.company,
        companyUrl: role.companyUrl,
        roles: [role],
      });
    }
  }
  return groups;
}

function parseMonthYear(value: string, current = false): Date {
  if (current || value === 'Present') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const parsed = new Date(`${value} 1`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

/** Human-readable tenure, e.g. "3 mo", "2 yrs 9 mo". */
export function formatDuration(start: string, end: string, current = false): string {
  const startDate = parseMonthYear(start);
  const endDate = parseMonthYear(end, current);
  let months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    1;
  if (months < 1) months = 1;

  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr${years === 1 ? '' : 's'}`;
  return `${years} yr${years === 1 ? '' : 's'} ${rem} mo`;
}

export function formatDateRange(start: string, end: string): string {
  return `${start} – ${end}`;
}

export const experience: Role[] = [
  {
    title: 'Open Source Developer',
    company: 'CrewAI',
    companyUrl: 'https://www.crewai.com',
    employmentType: 'Full Time',
    start: 'Aug 2026',
    end: 'Present',
    current: true,
    bullets: [
      'Working on the CrewAI open-source agent orchestration framework — contributing features, reviews, and core improvements.',
    ],
  },
  {
    title: 'Teaching Assistant',
    company: 'Outskill',
    companyUrl: 'https://www.outskill.com',
    employmentType: 'Contract',
    start: 'Aug 2026',
    end: 'Aug 2026',
    current: false,
    bullets: [
      'TA consultant for E6 and E7 cohorts — helped design course content and ran breakout rooms, quizzes, and live sessions.',
      'Supported 320+ learners, resolving doubts in group settings and 1-on-1 sessions.',
      'Covered RAG, Hugging Face, agents, MCP, observability, and deployments.',
    ],
  },
  {
    title: 'Machine Learning — Generative AI',
    company: 'Piramal Capital & Housing Finance Limited',
    companyUrl: 'https://www.piramalfinance.com',
    employmentType: 'Full Time',
    start: 'Nov 2023',
    end: 'July 2026',
    current: false,
    bullets: [
      'Designed and developed ARYA, an internal chatbot for the sales team using RAG and agentic systems — handled 500,000+ queries since launch and won Best AI Chatbot Product of the Year.',
      'Built Daily-Huddle, a WhatsApp-integrated chatbot for Branch Sales Managers, reducing daily huddle time by 30%.',
      'Designed CAM-Copilot, an underwriter assistant that summarises CIBIL reports, bank statements, and documents — cutting turnaround time by ~40%.',
      'Currently building an internal Text-to-SQL chatbot inspired by Uber\'s QueryGPT.',
    ],
  },
  {
    title: 'Data Engineer',
    company: 'Piramal Capital & Housing Finance Limited',
    companyUrl: 'https://www.piramalfinance.com',
    employmentType: 'Full Time',
    start: 'Jul 2023',
    end: 'Oct 2023',
    current: false,
    bullets: [
      'Orchestrated data pipelines for real-time feature delivery to ML models, improving model performance by 15%.',
      'Designed and deployed scalable microservices architecture, reducing feature serving latency by 20%.',
      'Used Python and Spark to optimise end-to-end feature store functionality for various ML workloads.',
    ],
  },
  {
    title: 'Junior Associate',
    company: 'Indus Insights',
    companyUrl: 'https://www.indusinsights.com',
    employmentType: 'Internship',
    start: 'Jan 2023',
    end: 'Jun 2023',
    current: false,
    bullets: [
      'Developed dynamic forecasting models using delinquency buckets and economic adjustments for seasonal and annual client planning.',
      'Led client meetings presenting findings on acquisition, response rates, and intent validation.',
      'Took initiative on ad-hoc analyses beyond core responsibilities, demonstrating adaptability.',
    ],
  },
  {
    title: 'University Leader',
    company: 'Community Classroom',
    employmentType: 'Internship',
    start: 'Jul 2021',
    end: 'Sep 2021',
    current: false,
    bullets: [
      'Founded and led a university community promoting accessible education for all.',
      'Conducted workshops to foster a programming culture on campus.',
    ],
  },
  {
    title: 'Project Leader — Machine Learning',
    company: 'Swecha',
    companyUrl: 'https://swecha.org',
    employmentType: 'Internship',
    start: 'Jun 2021',
    end: 'Jul 2021',
    current: false,
    bullets: [
      'Designed and implemented a fact-checking ML model, scraping news articles from reputable sources.',
      'Compared scraped articles against user-input news using textual entailment analysis to enhance accuracy.',
      'Developed skills in machine learning, data scraping, and NLP.',
    ],
  },
];

/** Shown as the first level on the Experience map. Kept apart from `experience` so job lists stay jobs only. */
export const education: Role[] = [
  {
    title: 'Engineering',
    company: 'BITS Pilani',
    companyUrl: 'https://www.bits-pilani.ac.in',
    employmentType: 'Education',
    start: '2019',
    end: '2023',
    current: false,
    duration: '4 yrs',
    bullets: [
      'Four years of engineering at BITS Pilani.',
      'Figured out that traditional knowledge alone would not be enough — I had to take things into my own hands.',
    ],
  },
];
