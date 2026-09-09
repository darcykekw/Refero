import type { College, Program, Tag, ThesisWithRelations } from '@/types/database'

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
    id: 'b1000000-0000-0000-0000-000000000001',
    prog_name: 'Bachelor of Science in Biology',
    college_id: COLLEGE_OF_SCIENCES_ID,
    logo: 'YBA-LOGO.png',
    date_added: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
  },
  {
    id: 'b2000000-0000-0000-0000-000000000002',
    prog_name: 'Bachelor of Science in Marine Biology',
    college_id: COLLEGE_OF_SCIENCES_ID,
    logo: 'MBS-LOGO.png',
    date_added: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
  },
  {
    id: 'b3000000-0000-0000-0000-000000000003',
    prog_name: 'Bachelor of Science in Computer Science',
    college_id: COLLEGE_OF_SCIENCES_ID,
    logo: 'ACS-LOGO.png',
    date_added: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
  },
  {
    id: 'b4000000-0000-0000-0000-000000000004',
    prog_name: 'Bachelor of Science in Environmental Science',
    college_id: COLLEGE_OF_SCIENCES_ID,
    logo: 'ESSA-LOGO.png',
    date_added: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
  },
  {
    id: 'b5000000-0000-0000-0000-000000000005',
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

export const DEFAULT_TAGS: Tag[] = [
  { id: 'a1000000-0000-0000-0000-000000000001', name: 'Machine Learning', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 'a2000000-0000-0000-0000-000000000002', name: 'Marine Biodiversity', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 'a3000000-0000-0000-0000-000000000003', name: 'Artificial Intelligence', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 'a4000000-0000-0000-0000-000000000004', name: 'Environmental Ecology', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 'a5000000-0000-0000-0000-000000000005', name: 'Data Analytics', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 'a6000000-0000-0000-0000-000000000006', name: 'Biotechnology', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 'a7000000-0000-0000-0000-000000000007', name: 'Information Systems', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
  { id: 'a8000000-0000-0000-0000-000000000008', name: 'Conservation Biology', date_added: '2024-01-01T00:00:00Z', date_modified: '2024-01-01T00:00:00Z' },
]

export const DEFAULT_THESES: ThesisWithRelations[] = []

