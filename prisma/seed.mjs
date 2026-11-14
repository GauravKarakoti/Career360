import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';
import "dotenv/config";

const scryptAsync = promisify(scryptCb);
const db = new PrismaClient();

// Matches src/lib/auth.ts hashSecret() format (salt:hash)
async function hashSecret(secret) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(secret, salt, 64)).toString('hex');
  return `${salt}:${hash}`;
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

// Fictional demo accounts on @demo.career360.test
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
if (!DEMO_PASSWORD) {
  console.error('Set DEMO_PASSWORD in the environment before seeding (see .env.example).');
  process.exit(1);
}
const DEMO_RECOVERY = 'DEMO-DEMO-DEMO';
const DEMO_ORG_ADMIN_KEY = process.env.DEMO_ORG_ADMIN_KEY || 'ORBIT-DEMO-ADMIN-KEY';

const people = [
  {
    email: 'aarti@demo.career360.test',
    role: 'Candidate',
    profile: {
      name: 'Aarti Deshmukh',
      role: 'Candidate',
      roles: ['Candidate'],
      industry: 'Data science',
      location: 'Pune, India',
      stage: 'Final-year student',
      description:
        'Fictional final-year data-science student looking for her first internship and mentorship. Saved listings and application trackers demonstrate the candidate flow.',
      interests: 'Analytics, education, sustainability',
      constraints: 'Prefers remote or Pune-based roles',
      goals: 'Land a data internship by the next intake cycle',
      visibility: 'discoverable',
      capabilities: ['Python', 'SQL', 'Power BI', 'Data storytelling'],
      needs: ['Internship', 'Mentorship', 'Portfolio review']
    },
    trackers: [
      {
        kind: 'application',
        title: 'Data analyst internship',
        stage: 'applied',
        notes: 'Demo tracker row: application submitted.',
        counterpart: 'Northstar Analytics Lab',
        opportunityId: 'demo-internship'
      },
      {
        kind: 'application',
        title: 'Skill-building fellowship',
        stage: 'identified',
        notes: 'Demo tracker row: checking eligibility.',
        counterpart: 'Learning Bridge Foundation',
        opportunityId: 'demo-sdg-education'
      },
      {
        kind: 'lead',
        title: 'Campus data club partnership',
        stage: 'contacted',
        notes: 'Demo tracker row: first call scheduled.',
        counterpart: 'Founders & Futures Summit',
        opportunityId: 'demo-event'
      }
    ],
    saved: ['demo-internship', 'demo-event', 'demo-sdg-education']
  },
  {
    email: 'rahul@demo.career360.test',
    role: 'Startup',
    profile: {
      name: 'Rahul Iyer',
      role: 'Startup',
      roles: ['Startup'],
      industry: 'Technology',
      location: 'Bengaluru, India',
      stage: 'MVP live',
      description:
        'Fictional early-stage founder exploring partnerships, funding conversations and event visibility. His workspace demonstrates leads and source-backed publishing.',
      interests: 'Partnerships, funding, distribution',
      constraints: 'Pre-revenue, equity-conscious',
      goals: 'Close one distribution partnership this quarter',
      visibility: 'discoverable',
      capabilities: ['Product development', 'Technical expertise', 'Prototyping'],
      needs: ['Distribution', 'Funding', 'Marketing']
    },
    trackers: [
      {
        kind: 'lead',
        title: 'Distribution partnership',
        stage: 'negotiating',
        notes: 'Demo tracker row: term sheet in review.',
        counterpart: 'Bridgeway Partners',
        opportunityId: 'demo-distributor'
      },
      {
        kind: 'lead',
        title: 'Investor introduction',
        stage: 'identified',
        notes: 'Demo tracker row: warm intro requested.',
        counterpart: 'First Mile Collective',
        opportunityId: 'demo-investor'
      }
    ],
    saved: ['demo-investor', 'demo-distributor']
  },
  {
    email: 'meera@demo.career360.test',
    role: 'Recruiter',
    profile: {
      name: 'Meera Kulkarni',
      role: 'Recruiter',
      roles: ['Recruiter'],
      industry: 'Technology',
      location: 'Mumbai, India',
      stage: 'Hiring team of 5',
      description:
        'Fictional recruiter demonstrating how discoverable candidates appear in search while private profiles stay hidden. She is an admin of the demo organization.',
      interests: 'Data roles, campus hiring',
      constraints: 'Mid-size product company',
      goals: 'Fill two data internships this season',
      visibility: 'discoverable',
      capabilities: ['Technical hiring', 'Campus outreach', 'Employer branding'],
      needs: ['Data science candidates', 'Intern pipeline']
    },
    trackers: [
      {
        kind: 'application',
        title: 'Data intern pipeline',
        stage: 'shortlisting',
        notes: 'Demo tracker row: 4 candidates shortlisted.',
        counterpart: 'Northstar Analytics Lab',
        opportunityId: 'demo-internship'
      }
    ],
    saved: ['demo-creator']
  }
];

const listings = [
  {
    id: 'demo-marketing',
    ownerEmail: 'rahul@demo.career360.test',
    title: 'A growth partner for your next chapter',
    organization: 'Orbit Growth Studio',
    category: 'Partnerships',
    location: 'Bengaluru · Remote',
    industry: 'Technology',
    description:
      'A fictional independent marketing studio looking to exchange go-to-market support for product development expertise. Explore how complementary capabilities can create mutual value.',
    requirements: ['Product development', 'Technical expertise', 'Portfolio'],
    preferred: ['Content creation'],
    offers: ['Marketing', 'Brand strategy', 'Audience growth'],
    sourceUrl: 'https://example.com/',
    evidence: [{ field: 'organization', quote: 'Example Domain' }],
    sourceStatus: 'verified',
    deadline: new Date('2026-12-31T00:00:00Z')
  },
  {
    id: 'demo-investor',
    ownerEmail: 'rahul@demo.career360.test',
    title: 'Connect with an early-stage investor network',
    organization: 'First Mile Collective',
    category: 'Funding',
    location: 'India · Remote',
    industry: 'Technology',
    description:
      'A fictional founder and angel network for technology ventures preparing their first funding conversation. This example is not a funding offer.',
    requirements: ['Product development', 'Pitch deck', 'Traction'],
    preferred: ['Financial modelling'],
    offers: ['Funding', 'Mentorship', 'Partnerships'],
    sourceUrl: 'https://example.com/',
    evidence: [{ field: 'organization', quote: 'Example Domain' }],
    sourceStatus: 'verified',
    deadline: new Date('2027-01-15T00:00:00Z')
  },
  {
    id: 'demo-distributor',
    ownerEmail: 'rahul@demo.career360.test',
    title: 'Take your product to new markets',
    organization: 'Bridgeway Partners',
    category: 'Partnerships',
    location: 'Delhi NCR',
    industry: 'Technology',
    description:
      'A fictional distribution partner illustrating how a startup can connect technical capabilities with market access. No commercial relationship is implied.',
    requirements: ['Product development', 'Technical expertise', 'Product documentation'],
    preferred: [],
    offers: ['Distribution', 'Customers', 'Market access'],
    deadline: null
  },
  {
    id: 'demo-event',
    ownerEmail: 'rahul@demo.career360.test',
    title: 'Build connections beyond your pitch deck',
    organization: 'Founders & Futures Summit',
    category: 'Events',
    location: 'Bengaluru',
    industry: 'Technology',
    description:
      'A fictional startup gathering to demonstrate event discovery. There is no scheduled live event or ticket availability for this example.',
    requirements: ['Technical expertise', 'Speaking'],
    preferred: [],
    offers: ['Marketing', 'Networking', 'Mentorship'],
    deadline: new Date('2026-12-10T00:00:00Z')
  },
  {
    id: 'demo-internship',
    ownerEmail: 'meera@demo.career360.test',
    title: 'Turn your data skills into real experience',
    organization: 'Northstar Analytics Lab',
    category: 'Jobs & internships',
    location: 'India · Remote',
    industry: 'Data science',
    description:
      'A fictional data analyst internship for demonstrating candidate matching and skill gaps. This is not an open vacancy and accepts no applications.',
    requirements: ['Python', 'SQL', 'Power BI'],
    preferred: ['Data storytelling'],
    offers: ['Internship', 'Learning', 'Mentorship'],
    deadline: new Date('2026-12-20T00:00:00Z')
  },
  {
    id: 'demo-creator',
    ownerEmail: 'rahul@demo.career360.test',
    title: 'Help a new technology find its audience',
    organization: 'Signal Creative Co.',
    category: 'Collaborations',
    location: 'Mumbai · Remote',
    industry: 'Technology',
    description:
      'A fictional creator collaboration exploring the exchange between technical product teams and storytellers. No live campaign or payment is offered.',
    requirements: ['Technical expertise', 'Product development'],
    preferred: [],
    offers: ['Marketing', 'Content creation', 'Audience growth'],
    deadline: null
  },
  {
    id: 'demo-sdg-education',
    ownerEmail: 'meera@demo.career360.test',
    title: 'Skill-building fellowships for tier-2 college students',
    organization: 'Learning Bridge Foundation',
    category: 'Jobs & internships',
    location: 'Pune · Hybrid',
    industry: 'Education',
    description:
      'A fictional fellowship demonstrating source-backed listings: every claim below cites the linked source page, so the platform can re-verify it automatically. Not a real fellowship.',
    requirements: ['Python', 'Communication'],
    preferred: ['Teaching'],
    offers: ['Internship', 'Learning', 'Mentorship'],
    sourceUrl: 'https://example.com/',
    evidence: [
      { field: 'title', quote: 'Example Domain' },
      { field: 'organization', quote: 'example.com' }
    ],
    sourceStatus: 'verified',
    deadline: new Date('2027-01-31T00:00:00Z')
  },
  {
    id: 'demo-sdg-industry',
    ownerEmail: 'rahul@demo.career360.test',
    title: 'Open innovation challenge for campus hardware teams',
    organization: 'Kettle Works Lab',
    category: 'Collaborations',
    location: 'Chennai',
    industry: 'Manufacturing',
    description:
      'A fictional open-innovation challenge illustrating SDG 9 (industry and innovation) tracking with a citable source. There is no live challenge behind this example.',
    requirements: ['Technical expertise', 'Prototyping'],
    preferred: [],
    offers: ['Mentorship', 'Networking', 'Partnerships'],
    sourceUrl: 'https://example.com/',
    evidence: [{ field: 'title', quote: 'Example Domain' }],
    sourceStatus: 'verified',
    deadline: new Date('2027-02-15T00:00:00Z')
  },
  {
    id: 'demo-sdg-funding',
    ownerEmail: 'meera@demo.career360.test',
    title: 'Community grants for student-led sustainability projects',
    organization: 'Green Seed Trust',
    category: 'Funding',
    location: 'India · Remote',
    industry: 'Sustainability',
    description:
      'A fictional grant programme demonstrating how Market Pulse separates discovered opportunities from source-verified outcomes. No funding is actually available.',
    requirements: ['Project plan', 'Team of two or more'],
    preferred: ['Community engagement'],
    offers: ['Funding', 'Mentorship'],
    sourceUrl: 'https://example.com/',
    evidence: [{ field: 'title', quote: 'This quote is deliberately stale to demo re-verification' }],
    sourceStatus: 'stale',
    deadline: new Date('2026-12-05T00:00:00Z')
  }
];

const org = {
  name: 'Orbit Growth Studio',
  slug: 'orbit-growth-studio',
  description:
    'Fictional demo organization showing verification, member ranks, secure documents and the audit trail. Not a real company.',
  website: 'https://example.com/orbit-demo'
};

const orgDocument = {
  title: 'Demo onboarding guide',
  body: 'This fictional document demonstrates member-only secure documents. It is visible to demo organization members and admins only, and shows how source-backed collaboration content is stored.',
  accessLevel: 'members'
};

try {
  const passwordHash = await hashSecret(DEMO_PASSWORD);
  const recoveryCodeHash = sha256(DEMO_RECOVERY);
  const workspacesByEmail = new Map();
  const accountsByEmail = new Map();

  // 1. Seed Accounts, Workspaces & Profiles first so Opportunities can link to ownerId
  for (const person of people) {
    const account = await db.account.upsert({
      where: { email: person.email },
      update: {
        passwordHash,
        recoveryCodeHash,
        primaryRole: person.role
      },
      create: {
        email: person.email,
        passwordHash,
        recoveryCodeHash,
        primaryRole: person.role
      }
    });
    accountsByEmail.set(person.email, account);

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    let ws = await db.workspace.findFirst({ where: { accountId: account.id } });
    if (!ws) {
      ws = await db.workspace.create({
        data: {
          accountId: account.id,
          tokenHash: sha256(`demo-${account.id}-${randomBytes(8).toString('hex')}`),
          expiresAt
        }
      });
    } else {
      ws = await db.workspace.update({
        where: { id: ws.id },
        data: { expiresAt }
      });
    }
    workspacesByEmail.set(person.email, ws);

    const { capabilities, needs, ...profileFields } = person.profile;
    const profile = await db.profile.upsert({
      where: { workspaceId: ws.id },
      update: profileFields,
      create: {
        workspaceId: ws.id,
        ...profileFields
      }
    });

    await db.capability.createMany({
      data: capabilities.map((label) => ({ profileId: profile.id, label })),
      skipDuplicates: true
    });
    await db.need.createMany({
      data: needs.map((label) => ({ profileId: profile.id, label })),
      skipDuplicates: true
    });
  }

  // 2. Seed Opportunities (linked to owner Workspaces)
  for (const demo of listings) {
    const ownerWs = demo.ownerEmail ? workspacesByEmail.get(demo.ownerEmail) : null;
    const listingData = {
      title: demo.title,
      organization: demo.organization,
      category: demo.category,
      location: demo.location,
      industry: demo.industry,
      description: demo.description,
      requirements: demo.requirements,
      preferred: demo.preferred,
      offers: demo.offers,
      sourceUrl: demo.sourceUrl ?? null,
      evidence: demo.evidence ?? undefined,
      sourceStatus: demo.sourceStatus ?? null,
      lastVerifiedAt: demo.sourceStatus ? new Date() : null,
      deadline: demo.deadline ?? null,
      ownerId: ownerWs?.id ?? null,
      isDemo: true
    };

    await db.opportunity.upsert({
      where: { id: demo.id },
      update: listingData,
      create: {
        id: demo.id,
        ...listingData,
        publishedAt: new Date('2026-11-01T00:00:00Z')
      }
    });
  }

  // 3. Seed SavedOpportunities, Trackers & ActivityEvents per person
  for (const person of people) {
    const ws = workspacesByEmail.get(person.email);

    await db.savedOpportunity.createMany({
      data: person.saved.map((opportunityId) => ({ workspaceId: ws.id, opportunityId })),
      skipDuplicates: true
    });

    const existingTrackers = await db.tracker.count({ where: { workspaceId: ws.id } });
    if (existingTrackers === 0) {
      await db.tracker.createMany({
        data: person.trackers.map((t) => ({
          workspaceId: ws.id,
          kind: t.kind,
          title: t.title,
          stage: t.stage,
          notes: t.notes,
          counterpart: t.counterpart,
          opportunityId: t.opportunityId ?? null
        }))
      });
    }

    const existingEvents = await db.activityEvent.count({
      where: { workspaceId: ws.id, detail: 'demo dataset' }
    });
    if (existingEvents === 0) {
      await db.activityEvent.createMany({
        data: person.saved.map((opportunityId, index) => ({
          workspaceId: ws.id,
          kind: 'opportunity.saved',
          detail: 'demo dataset',
          opportunityId,
          createdAt: new Date(Date.now() - index * 86400000)
        }))
      });
    }
  }

  // 4. Seed ConnectionRequests & Messages
  const aarti = workspacesByEmail.get('aarti@demo.career360.test');
  const rahul = workspacesByEmail.get('rahul@demo.career360.test');
  const meera = workspacesByEmail.get('meera@demo.career360.test');

  const existingAccepted = await db.connectionRequest.findFirst({
    where: { fromWorkspaceId: rahul.id, toWorkspaceId: aarti.id }
  });
  if (!existingAccepted) {
    const connection = await db.connectionRequest.create({
      data: {
        fromWorkspaceId: rahul.id,
        toWorkspaceId: aarti.id,
        opportunityId: 'demo-internship',
        message: 'Demo conversation: Rahul shares the data internship with Aarti.',
        status: 'accepted',
        respondedAt: new Date()
      }
    });
    await db.message.createMany({
      data: [
        {
          requestId: connection.id,
          senderId: rahul.id,
          body: 'Hi Aarti! Sharing this fictional data internship — the matching said your SQL and Power BI skills fit well.',
          createdAt: new Date(Date.now() - 3600000)
        },
        {
          requestId: connection.id,
          senderId: aarti.id,
          body: 'Thanks Rahul! Saved it and started a tracker. Any tips for the demo application?',
          createdAt: new Date(Date.now() - 1800000)
        },
        {
          requestId: connection.id,
          senderId: rahul.id,
          body: 'Lead with the campus analytics project. This whole conversation is demo data.',
          createdAt: new Date()
        }
      ]
    });
  }

  const existingPending = await db.connectionRequest.findFirst({
    where: { fromWorkspaceId: meera.id, toWorkspaceId: aarti.id }
  });
  if (!existingPending) {
    await db.connectionRequest.create({
      data: {
        fromWorkspaceId: meera.id,
        toWorkspaceId: aarti.id,
        opportunityId: 'demo-internship',
        message: 'Hi Aarti, your Python & Power BI profile stood out for our upcoming data analyst intake.',
        status: 'pending'
      }
    });
  }

  // 5. Seed Organization, OrgMemberships, OrgDocuments & AuditLogs
  const demoOrg = await db.organization.upsert({
    where: { slug: org.slug },
    update: {
      name: org.name,
      description: org.description,
      website: org.website,
      verified: true
    },
    create: {
      ...org,
      adminKeyHash: sha256(DEMO_ORG_ADMIN_KEY),
      verified: true,
      verifiedAt: new Date()
    }
  });

  const meeraAccount = accountsByEmail.get('meera@demo.career360.test');
  await db.orgMembership.createMany({
    data: Array.from(accountsByEmail.values()).map((a) => ({
      orgId: demoOrg.id,
      accountId: a.id,
      role: a.id === meeraAccount.id ? 'admin' : 'member'
    })),
    skipDuplicates: true
  });

  if ((await db.orgDocument.count({ where: { orgId: demoOrg.id } })) === 0) {
    await db.orgDocument.create({
      data: {
        ...orgDocument,
        orgId: demoOrg.id,
        createdById: meeraAccount.id
      }
    });
  }

  if ((await db.auditLog.count({ where: { orgId: demoOrg.id } })) === 0) {
    await db.auditLog.createMany({
      data: [
        {
          orgId: demoOrg.id,
          accountId: meeraAccount.id,
          action: 'org.created',
          detail: 'demo dataset'
        },
        {
          orgId: demoOrg.id,
          accountId: meeraAccount.id,
          action: 'org.verified',
          detail: 'admin key confirmed'
        }
      ]
    });
  }

  const counts = {
    listings: await db.opportunity.count({ where: { isDemo: true } }),
    sourceBacked: await db.opportunity.count({ where: { isDemo: true, sourceUrl: { not: null } } }),
    accounts: await db.account.count({ where: { email: { endsWith: '@demo.career360.test' } } }),
    trackers: await db.tracker.count(),
    messages: await db.message.count(),
    organizations: await db.organization.count()
  };

  console.log(
    `Demo dataset ready: ${counts.listings} fictional listings (${counts.sourceBacked} source-backed), ${counts.accounts} demo accounts, ${counts.trackers} trackers, ${counts.messages} demo messages, ${counts.organizations} demo organization(s).`
  );
  console.log('Sign in as aarti@ / rahul@ / meera@demo.career360.test using the DEMO_PASSWORD value.');
} finally {
  await db.$disconnect();
}