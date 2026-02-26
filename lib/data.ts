// lib/data.ts
import type { Company, TimelineEvent } from "@/types";

export const COMPANIES: Company[] = [
  { id:"c1", name:"Deepform", website:"https://deepform.ai", stage:"Seed", sector:"AI/ML", tags:["B2B","SaaS","NLP"], hq:"San Francisco, CA", founded:2022, employees:"1-10", score:92, description:"AI-powered document intelligence platform that extracts, classifies, and routes unstructured enterprise data at scale." },
  { id:"c2", name:"Meridian Health", website:"https://meridianhealth.io", stage:"Series A", sector:"HealthTech", tags:["B2B","Clinical","AI"], hq:"Boston, MA", founded:2021, employees:"11-50", score:87, description:"Clinical decision support tooling built on large language models, deployed across 14 hospital systems." },
  { id:"c3", name:"Carbontrack", website:"https://carbontrack.io", stage:"Pre-Seed", sector:"CleanTech", tags:["B2B","ESG","SaaS"], hq:"New York, NY", founded:2023, employees:"1-10", score:78, description:"Automated Scope 1-3 carbon accounting and board-ready ESG reporting for growth-stage SMBs." },
  { id:"c4", name:"Foundry Labs", website:"https://foundrylabs.dev", stage:"Seed", sector:"DevTools", tags:["Developer","OSS","Infrastructure"], hq:"Austin, TX", founded:2022, employees:"11-50", score:84, description:"Next-gen CI/CD with AI-generated test suites and intelligent rollback." },
  { id:"c5", name:"Luma Robotics", website:"https://lumarobotics.com", stage:"Series A", sector:"Robotics", tags:["Hardware","AI","Manufacturing"], hq:"Pittsburgh, PA", founded:2020, employees:"51-200", score:76, description:"Vision-programmed collaborative robot arms for small-batch manufacturing." },
  { id:"c6", name:"Stealth Finance", website:"https://stealthfinance.xyz", stage:"Pre-Seed", sector:"FinTech", tags:["B2C","Crypto","DeFi"], hq:"Miami, FL", founded:2023, employees:"1-10", score:61, description:"DeFi yield layer connecting traditional bank accounts to permissioned on-chain strategies." },
  { id:"c7", name:"NovaSec", website:"https://novasec.io", stage:"Seed", sector:"Cybersecurity", tags:["B2B","SaaS","Zero-Trust"], hq:"Washington, DC", founded:2022, employees:"11-50", score:89, description:"Identity-first zero-trust platform securing distributed enterprise workforces." },
  { id:"c8", name:"Pulse Analytics", website:"https://pulseanalytics.com", stage:"Series B", sector:"Analytics", tags:["B2B","SaaS","Data"], hq:"Seattle, WA", founded:2019, employees:"51-200", score:71, description:"Real-time product analytics with predictive churn and expansion revenue signals." },
  { id:"c9", name:"Aether Cloud", website:"https://aethercloud.dev", stage:"Seed", sector:"Infrastructure", tags:["Developer","Cloud","GPU"], hq:"San Francisco, CA", founded:2022, employees:"1-10", score:83, description:"Spot GPU orchestration that cuts ML training costs by 60% through intelligent preemption scheduling." },
  { id:"c10", name:"Bridgepoint Legal", website:"https://bridgepointlegal.ai", stage:"Pre-Seed", sector:"LegalTech", tags:["B2B","AI","SaaS"], hq:"Chicago, IL", founded:2023, employees:"1-10", score:80, description:"Contract review and precedent research assistant for in-house legal at growth-stage companies." },
  { id:"c11", name:"Farmwise", website:"https://farmwise.io", stage:"Series A", sector:"AgriTech", tags:["Hardware","AI","B2B"], hq:"Fresno, CA", founded:2021, employees:"11-50", score:69, description:"Autonomous weeding robots with crop health analytics." },
  { id:"c12", name:"Construct AI", website:"https://constructai.build", stage:"Seed", sector:"Construction Tech", tags:["B2B","AI","SaaS"], hq:"Denver, CO", founded:2022, employees:"1-10", score:74, description:"AI-powered cost estimation and project management for commercial general contractors." },
];

export const TIMELINES: Record<string, TimelineEvent[]> = {
  c1: [
    { dt:"2024-11-15", type:"product", text:"Launched v2 multi-modal extraction engine" },
    { dt:"2024-10-02", type:"hire",    text:"VP Sales hired from Palantir" },
    { dt:"2024-08-20", type:"funding", text:"Closed $3.2M seed — a16z + 8VC" },
    { dt:"2024-07-11", type:"press",   text:"TechCrunch: Top 10 AI infrastructure startups" },
  ],
  c2: [
    { dt:"2024-12-01", type:"customer", text:"Signed 3 new Tier-1 hospital systems (14 total)" },
    { dt:"2024-09-14", type:"product",  text:"FDA cleared decision-support pilot module" },
    { dt:"2024-07-30", type:"funding",  text:"Raised $12M Series A led by a16z Bio" },
  ],
  c7: [
    { dt:"2024-12-05", type:"product",  text:"Browser SSO extension — 4.8 stars on Chrome store" },
    { dt:"2024-10-20", type:"customer", text:"Fortune 500 anchor customer signed" },
    { dt:"2024-08-12", type:"hire",     text:"CISO hired from CrowdStrike" },
  ],
  c4: [
    { dt:"2024-12-10", type:"product",  text:"Open-sourced test runner — 2.1k GitHub stars in 48h" },
    { dt:"2024-11-01", type:"customer", text:"50th enterprise customer onboarded" },
    { dt:"2024-09-15", type:"funding",  text:"$4.5M seed from Founders Fund" },
  ],
  c9: [
    { dt:"2024-11-28", type:"product",  text:"Launched spot bidding API v3" },
    { dt:"2024-10-15", type:"customer", text:"Partnership with Hugging Face announced" },
    { dt:"2024-09-01", type:"hire",     text:"Ex-Google TPU lead joins as CTO" },
  ],
};

export const defaultTimeline = (c: Company): TimelineEvent[] => [
  { dt:"2024-11-01", type:"product", text:`${c.name} shipped a major product update` },
  { dt:"2024-09-20", type:"hire",    text:"Key engineering hire from FAANG" },
  { dt:"2024-08-05", type:"press",   text:"Featured in industry newsletter" },
];

export const THESIS = {
  summary: "B2B SaaS companies using AI to automate complex enterprise workflows — with preference for infrastructure, developer tools, and vertical AI in regulated industries.",
  keywords: ["AI","B2B","SaaS","automation","infrastructure","developer","enterprise","vertical","LLM","workflow"],
  stages: ["Pre-Seed","Seed","Series A"] as string[],
  minScore: 75,
  weights: [
    ["Thesis keyword overlap", "35%"],
    ["Stage fit", "28%"],
    ["Sector signal", "22%"],
    ["Team & traction proxy", "15%"],
  ] as [string, string][],
};

export const STAGES = ["All Stages","Pre-Seed","Seed","Series A","Series B"];
export const SECTORS = ["All Sectors","AI/ML","HealthTech","CleanTech","DevTools","Robotics","FinTech","Cybersecurity","Analytics","Infrastructure","LegalTech","AgriTech","Construction Tech"];

export const isThesisMatch = (c: Company) =>
  c.score >= THESIS.minScore && THESIS.stages.includes(c.stage);

export const scoreColor = (s: number) =>
  s >= 88 ? "#10b981" : s >= 74 ? "#f59e0b" : "#ef4444";

export const stageColor = (s: string) =>
  ({"Pre-Seed":"#6366f1","Seed":"#8b5cf6","Series A":"#a855f7","Series B":"#ec4899"} as Record<string,string>)[s] ?? "#6b7280";
