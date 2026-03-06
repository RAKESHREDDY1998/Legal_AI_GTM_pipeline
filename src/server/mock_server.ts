import { Router } from 'express';

export const mockServerRouter = Router();

// Generate 55 firms with some near-duplicates
const generateFirms = () => {
  const firms = [];
  const regions = ['US', 'Australia', 'Asia', 'Europe'];
  const practiceAreas = ['Corporate', 'Litigation', 'IP', 'Real Estate', 'Tax'];
  
  for (let i = 1; i <= 50; i++) {
    firms.push({
      id: `firm_${i}`,
      name: `Law Firm ${i} LLC`,
      domain: `lawfirm${i}.com`,
      region: regions[i % regions.length],
    });
  }
  
  // Add 5 near-duplicates
  for (let i = 1; i <= 5; i++) {
    firms.push({
      id: `firm_dup_${i}`,
      name: `Law Firm ${i} L.L.C.`, // slight variation
      domain: `lawfirm${i}.com`,
      region: regions[i % regions.length],
    });
  }
  return firms;
};

const firms = generateFirms();

// Rate limiting state
let requestCount = 0;
let windowStart = Date.now();

const checkRateLimit = (req: any, res: any, next: any) => {
  const now = Date.now();
  if (now - windowStart > 60000) {
    windowStart = now;
    requestCount = 0;
  }
  
  requestCount++;
  if (requestCount > 20) {
    return res.status(429).set('Retry-After', '5').json({ error: 'Rate limit exceeded' });
  }
  next();
};

mockServerRouter.use(checkRateLimit);

// GET /firms
mockServerRouter.get('/firms', (req, res) => {
  // 10% chance of 500 error
  if (Math.random() < 0.1) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const start = (page - 1) * limit;
  const end = start + limit;
  
  res.json({
    data: firms.slice(start, end),
    meta: {
      page,
      limit,
      total: firms.length,
      totalPages: Math.ceil(firms.length / limit)
    }
  });
});

// GET /firms/:id/firmographic
mockServerRouter.get('/firms/:id/firmographic', (req, res) => {
  const firm = firms.find(f => f.id === req.params.id);
  if (!firm) return res.status(404).json({ error: 'Not found' });
  
  // 20% missing fields
  const missingFields = Math.random() < 0.2;
  
  // Inconsistent schema
  const inconsistentSchema = Math.random() < 0.5;
  
  const baseData = {
    practice_areas: missingFields ? [] : ['Corporate', 'Litigation'],
    founded_year: 1990 + Math.floor(Math.random() * 30),
  };
  
  const sizeData = inconsistentSchema 
    ? { num_lawyers: 50 + Math.floor(Math.random() * 500) }
    : { lawyer_count: 50 + Math.floor(Math.random() * 500) };
    
  res.json({ ...baseData, ...sizeData });
});

// GET /firms/:id/contact
mockServerRouter.get('/firms/:id/contact', (req, res) => {
  const firm = firms.find(f => f.id === req.params.id);
  if (!firm) return res.status(404).json({ error: 'Not found' });
  
  // 30% null email or linkedin
  const nullEmail = Math.random() < 0.3;
  const nullLinkedin = Math.random() < 0.3;
  
  res.json({
    name: `Contact for ${firm.name}`,
    title: 'Managing Partner',
    email: nullEmail ? null : `contact@${firm.domain}`,
    linkedin_url: nullLinkedin ? null : `https://linkedin.com/in/contact-${firm.id}`
  });
});

// POST /webhooks/crm
mockServerRouter.post('/webhooks/crm', (req, res) => {
  // 5% chance of failure
  if (Math.random() < 0.05) {
    return res.status(500).json({ error: 'CRM Webhook Failed' });
  }
  res.json({ success: true, id: `crm_${Date.now()}` });
});

// POST /webhooks/email
mockServerRouter.post('/webhooks/email', (req, res) => {
  // 5% chance of failure
  if (Math.random() < 0.05) {
    return res.status(500).json({ error: 'Email Webhook Failed' });
  }
  res.json({ success: true, id: `email_${Date.now()}` });
});
