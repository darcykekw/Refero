import type { College, Program } from '@/types/database'

export const COLLEGE_OF_SCIENCES_ID = 'c011e9e0-0000-0000-0000-000000000001'

export const DEFAULT_COLLEGES: College[] = [
  {
    id: COLLEGE_OF_SCIENCES_ID,
    college_name: 'College of Sciences',
    date_added: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
  },
]

export const DEFAULT_PROGRAMS: Program[] = [
  {
    id: 'p0000000-0000-0000-0000-000000000001',
    prog_name: 'Bachelor of Science in Biology',
    college_id: COLLEGE_OF_SCIENCES_ID,
    logo: 'YBA-LOGO.png',
    date_added: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000002',
    prog_name: 'Bachelor of Science in Marine Biology',
    college_id: COLLEGE_OF_SCIENCES_ID,
    logo: 'MBS-LOGO.png',
    date_added: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000003',
    prog_name: 'Bachelor of Science in Computer Science',
    college_id: COLLEGE_OF_SCIENCES_ID,
    logo: 'ACS-LOGO.png',
    date_added: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000004',
    prog_name: 'Bachelor of Science in Environmental Science',
    college_id: COLLEGE_OF_SCIENCES_ID,
    logo: 'ESSA-LOGO.png',
    date_added: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000005',
    prog_name: 'Bachelor of Science in Information Technology',
    college_id: COLLEGE_OF_SCIENCES_ID,
    logo: 'SITE-LOGO.png',
    date_added: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
  },
]

export function getProgramLogoUrl(logo?: string | null, progName?: string | null): string {
  if (logo && logo.trim()) {
    return logo.startsWith('/') || logo.startsWith('http') ? logo : `/images/${logo}`
  }
  const name = (progName || '').toLowerCase()
  if (name.includes('marine')) return '/images/MBS-LOGO.png'
  if (name.includes('computer')) return '/images/ACS-LOGO.png'
  if (name.includes('information') || name.includes('technology') || name.includes('it')) return '/images/SITE-LOGO.png'
  if (name.includes('environmental')) return '/images/ESSA-LOGO.png'
  if (name.includes('biology')) return '/images/YBA-LOGO.png'
  return '/images/Refero.png'
}

import type { Tag, ThesisWithRelations } from '@/types/database'

export const DEFAULT_TAGS: Tag[] = [
  { id: 't0000000-0000-0000-0000-000000000001', name: 'Machine Learning', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 't0000000-0000-0000-0000-000000000002', name: 'Marine Biodiversity', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 't0000000-0000-0000-0000-000000000003', name: 'Artificial Intelligence', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 't0000000-0000-0000-0000-000000000004', name: 'Environmental Ecology', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 't0000000-0000-0000-0000-000000000005', name: 'Data Analytics', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 't0000000-0000-0000-0000-000000000006', name: 'Biotechnology', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 't0000000-0000-0000-0000-000000000007', name: 'Information Systems', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 't0000000-0000-0000-0000-000000000008', name: 'Conservation Biology', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
]

export const DEFAULT_THESES: ThesisWithRelations[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    title: 'Automated Semantic Search and Classification of Academic Manuscripts using Natural Language Processing',
    abstract: 'This study presents an automated retrieval architecture employing contextual embeddings and transformer-based models to index and classify university research papers, improving discovery precision.',
    authors: 'Juan Dela Cruz, Paolo M. Reyes',
    adviser: 'Dr. Alan Turing',
    year_submitted: 2024,
    uploaded_by: '00000000-0000-0000-0000-000000000000',
    college_id: COLLEGE_OF_SCIENCES_ID,
    program_id: 'p0000000-0000-0000-0000-000000000003', // BS Computer Science
    panel_score: 95.5,
    pdf_file: '',
    view_count: 142,
    ss_paper_id: null,
    status: 'verified',
    date_added: '2024-03-15T08:00:00Z',
    date_modified: '2024-03-15T08:00:00Z',
    college: DEFAULT_COLLEGES[0],
    program: DEFAULT_PROGRAMS[2],
    tags: [DEFAULT_TAGS[0], DEFAULT_TAGS[2], DEFAULT_TAGS[6]],
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    title: 'Coral Reef Resilience and Benthic Community Assessment Across Marine Sanctuaries in Honda Bay',
    abstract: 'A comprehensive ecological evaluation assessing hard coral cover, bleaching vulnerability indices, and reef fish biomass dynamics across key marine protected zones in Palawan.',
    authors: 'Christian Rivera, Angelica M. Soriano',
    adviser: 'Dr. Angel Alcala',
    year_submitted: 2024,
    uploaded_by: '00000000-0000-0000-0000-000000000000',
    college_id: COLLEGE_OF_SCIENCES_ID,
    program_id: 'p0000000-0000-0000-0000-000000000002', // BS Marine Biology
    panel_score: 93.0,
    pdf_file: '',
    view_count: 98,
    ss_paper_id: null,
    status: 'verified',
    date_added: '2024-04-10T10:30:00Z',
    date_modified: '2024-04-10T10:30:00Z',
    college: DEFAULT_COLLEGES[0],
    program: DEFAULT_PROGRAMS[1],
    tags: [DEFAULT_TAGS[1], DEFAULT_TAGS[3]],
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    title: 'Phytochemical Screening and Antimicrobial Activity of Selected Endemic Flora in Palawan Biosphere Reserve',
    abstract: 'Investigation of bioactive phytochemical compounds and antibacterial efficacy of indigenous plant extracts against pathogenic bacterial strains, offering insights for pharmaceutical applications.',
    authors: 'Kristine Joy Mendoza, Rafael Dalisay',
    adviser: 'Dr. Maria Orosa',
    year_submitted: 2023,
    uploaded_by: '00000000-0000-0000-0000-000000000000',
    college_id: COLLEGE_OF_SCIENCES_ID,
    program_id: 'p0000000-0000-0000-0000-000000000001', // BS Biology
    panel_score: 91.5,
    pdf_file: '',
    view_count: 85,
    ss_paper_id: null,
    status: 'verified',
    date_added: '2023-11-20T14:15:00Z',
    date_modified: '2023-11-20T14:15:00Z',
    college: DEFAULT_COLLEGES[0],
    program: DEFAULT_PROGRAMS[0],
    tags: [DEFAULT_TAGS[5], DEFAULT_TAGS[7]],
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    title: 'Spatial Distribution and Abundance of Microplastics in Mangrove Estuarine Sediments of Puerto Princesa',
    abstract: 'Field-based spatial modeling measuring synthetic polymer concentrations and sedimentation rates in tropical mangrove ecosystems, providing baseline indicators for coastal pollution control.',
    authors: 'Patricia Tan, Gabriel A. Fernandez',
    adviser: 'Dr. Perry Ong',
    year_submitted: 2023,
    uploaded_by: '00000000-0000-0000-0000-000000000000',
    college_id: COLLEGE_OF_SCIENCES_ID,
    program_id: 'p0000000-0000-0000-0000-000000000004', // BS Environmental Science
    panel_score: 89.0,
    pdf_file: '',
    view_count: 73,
    ss_paper_id: null,
    status: 'verified',
    date_added: '2023-10-05T09:00:00Z',
    date_modified: '2023-10-05T09:00:00Z',
    college: DEFAULT_COLLEGES[0],
    program: DEFAULT_PROGRAMS[3],
    tags: [DEFAULT_TAGS[3], DEFAULT_TAGS[7]],
  },
  {
    id: 'd0000000-0000-0000-0000-000000000005',
    title: 'Development of a Cloud-Native Institutional Research Repository with Real-Time Access Delegation',
    abstract: 'Engineering a highly responsive, resilient institutional archive architecture integrating microservice storage, distributed metadata indexing, and role-based cryptographic verification.',
    authors: 'Kimberly Ramos, Mark Lester Santos',
    adviser: 'Prof. Tim Berners-Lee',
    year_submitted: 2024,
    uploaded_by: '00000000-0000-0000-0000-000000000000',
    college_id: COLLEGE_OF_SCIENCES_ID,
    program_id: 'p0000000-0000-0000-0000-000000000005', // BS Information Technology
    panel_score: 96.0,
    pdf_file: '',
    view_count: 165,
    ss_paper_id: null,
    status: 'verified',
    date_added: '2024-05-02T11:45:00Z',
    date_modified: '2024-05-02T11:45:00Z',
    college: DEFAULT_COLLEGES[0],
    program: DEFAULT_PROGRAMS[4],
    tags: [DEFAULT_TAGS[4], DEFAULT_TAGS[6]],
  },
]

