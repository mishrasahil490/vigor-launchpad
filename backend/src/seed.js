/**
 * Seeds the database with realistic sample data covering every
 * module of the Vigor Launchpad platform.
 */
const path = require("path");
// Load environment variables before importing db
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const fs = require("fs");
const bcrypt = require("bcryptjs");
const db = require("./db");

async function runSeed() {
  const DATA_DIR = path.join(__dirname, "..", "data");
  if (fs.existsSync(DATA_DIR)) fs.rmSync(DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const hash = (pw) => bcrypt.hashSync(pw, 10);

    // ---------- USERS ----------
  if (db.supabase) {
    console.log("🔄 Wiping users in Supabase Auth...");
    try {
      const { data: { users: authUsers }, error: listError } = await db.supabase.auth.admin.listUsers({
        perPage: 1000
      });
      if (listError) {
        console.error("Error listing Supabase Auth users:", listError.message);
      } else if (authUsers && authUsers.length > 0) {
        for (const au of authUsers) {
          const { error: deleteError } = await db.supabase.auth.admin.deleteUser(au.id);
          if (deleteError) {
            console.error(`Error deleting auth user ${au.email}:`, deleteError.message);
          }
        }
      }
    } catch (err) {
      console.error("Failed to wipe auth users:", err);
    }
  }

  const users = [
    { name: "Aarav Shah", email: "admin@vigorlaunchpad.com", role: "Super Admin", team: "Leadership", status: "Active", passwordHash: hash("Admin@123") },
    { name: "Priya Menon", email: "priya.manager@vigorlaunchpad.com", role: "Manager", team: "Brand Partnerships", status: "Active", passwordHash: hash("Manager@123") },
    { name: "Rohan Kapoor", email: "rohan.manager@vigorlaunchpad.com", role: "Manager", team: "Events", status: "Active", passwordHash: hash("Manager@123") },
    { name: "Sneha Iyer", email: "sneha.employee@vigorlaunchpad.com", role: "Employee", team: "Brand Partnerships", status: "Active", passwordHash: hash("Employee@123") },
    { name: "Karan Verma", email: "karan.employee@vigorlaunchpad.com", role: "Employee", team: "Brand Partnerships", status: "Active", passwordHash: hash("Employee@123") },
    { name: "Ishaan Bose", email: "ishaan.employee@vigorlaunchpad.com", role: "Employee", team: "Events", status: "Active", passwordHash: hash("Employee@123") },
    { name: "Neha Joshi", email: "neha.finance@vigorlaunchpad.com", role: "Finance", team: "Finance", status: "Active", passwordHash: hash("Finance@123") },
  ];

  const userRows = [];
  for (const u of users) {
    let authId = null;
    let rawPassword = u.email.split("@")[0].charAt(0).toUpperCase() + u.email.split("@")[0].slice(1) + "@123";
    if (u.email === "admin@vigorlaunchpad.com") rawPassword = "Admin@123";
    else if (u.email.includes("manager")) rawPassword = "Manager@123";
    else if (u.email.includes("employee")) rawPassword = "Employee@123";
    else if (u.email.includes("finance")) rawPassword = "Finance@123";

    if (db.supabase) {
      try {
        const { data: authData, error: authError } = await db.supabase.auth.admin.createUser({
          email: u.email,
          password: rawPassword,
          email_confirm: true,
          user_metadata: { name: u.name, role: u.role, team: u.team }
        });
        
        if (authError) {
          console.error(`Error seeding auth user ${u.email}:`, authError.message);
        } else if (authData && authData.user) {
          authId = authData.user.id;
        }
      } catch (err) {
        console.error(`Failed to seed auth user ${u.email}:`, err);
      }
    }
    
    const row = db.insert("users", {
      name: u.name,
      email: u.email,
      role: u.role,
      team: u.team,
      status: u.status,
      passwordHash: u.passwordHash,
      authId: authId
    });
    userRows.push(row);
  }

  const byName = (n) => userRows.find((u) => u.name === n);

// ---------- LEADS ----------
const leadSources = ["Website", "Referral", "Cold Outreach", "Inbound Email", "Event", "Social Media"];
const industries = ["FMCG", "Fashion & Apparel", "BFSI", "EdTech", "Food & Beverage", "Consumer Electronics", "Travel", "Gaming"];
const leadStatuses = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];

const leadCompanyNames = [
  "Glowtone Cosmetics", "Urban Threads", "PaySecure Bank", "BrightPath EdTech", "Crave Foods Co",
  "NovaTech Electronics", "WanderWise Travel", "PixelPlay Studios", "Verve Beverages", "EcoNest Home",
  "FitForge Wearables", "Lumen Skincare", "ZoomCart Retail", "Bharat Motors", "CloudKitchen Express",
];

const leads = leadCompanyNames.map((company, i) => {
  const owner = [byName("Sneha Iyer"), byName("Karan Verma"), byName("Priya Menon")][i % 3];
  const status = leadStatuses[i % leadStatuses.length];
  const created = new Date();
  created.setDate(created.getDate() - (i * 7 + 3));
  return {
    leadName: `${company} - Q${(i % 4) + 1} Campaign`,
    companyName: company,
    contactPerson: ["Aisha Khan", "Vikram Rao", "Tanya Sharma", "Devansh Gupta", "Meera Pillai"][i % 5],
    email: `contact@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
    phoneNumber: `+91 98${(10000000 + i * 137).toString().slice(0, 8)}`,
    leadSource: leadSources[i % leadSources.length],
    industry: industries[i % industries.length],
    estimatedBudget: 200000 + i * 45000,
    ownerId: owner.id,
    ownerName: owner.name,
    status,
    score: 40 + ((i * 13) % 60),
    createdAt: created.toISOString(),
    updatedAt: created.toISOString(),
  };
});
const leadRows = leads.map((l) => db.insert("leads", l));

leadRows.forEach((l, i) => {
  db.insert("activities", { entityType: "lead", entityId: l.id, type: "Note", message: "Initial discovery call completed. Strong interest in influencer-led launch.", authorName: l.ownerName, createdAt: l.createdAt });
  if (i % 2 === 0) {
    db.insert("activities", { entityType: "lead", entityId: l.id, type: "Follow-up", message: "Send revised proposal with updated creator shortlist.", authorName: l.ownerName, status: i % 4 === 0 ? "Done" : "Pending" });
  }
});

// ---------- CLIENTS (some converted from won leads, some standalone) ----------
const clientSeed = [
  { brandName: "Glowtone Cosmetics", contactPerson: "Aisha Khan", designation: "Marketing Head", email: "aisha@glowtone.com", phone: "+91 9810000001", industry: "FMCG", gstNumber: "27AAFCG1234L1Z9", billingAddress: "Lower Parel, Mumbai", accountManager: "Priya Menon", accountManagerId: byName("Priya Menon").id, status: "Active" },
  { brandName: "Urban Threads", contactPerson: "Vikram Rao", designation: "CMO", email: "vikram@urbanthreads.com", phone: "+91 9810000002", industry: "Fashion & Apparel", gstNumber: "07AABCU5678M1Z3", billingAddress: "Connaught Place, Delhi", accountManager: "Priya Menon", accountManagerId: byName("Priya Menon").id, status: "Active" },
  { brandName: "Verve Beverages", contactPerson: "Tanya Sharma", designation: "Brand Manager", email: "tanya@verve.com", phone: "+91 9810000003", industry: "Food & Beverage", gstNumber: "29AABCV4321N1Z7", billingAddress: "Indiranagar, Bengaluru", accountManager: "Rohan Kapoor", accountManagerId: byName("Rohan Kapoor").id, status: "Active" },
  { brandName: "NovaTech Electronics", contactPerson: "Devansh Gupta", designation: "Growth Lead", email: "devansh@novatech.com", phone: "+91 9810000004", industry: "Consumer Electronics", gstNumber: "06AADCN8765P1Z1", billingAddress: "Gurugram, Haryana", accountManager: "Priya Menon", accountManagerId: byName("Priya Menon").id, status: "Active" },
  { brandName: "BrightPath EdTech", contactPerson: "Meera Pillai", designation: "VP Marketing", email: "meera@brightpath.com", phone: "+91 9810000005", industry: "EdTech", gstNumber: "33AADCB2345Q1Z5", billingAddress: "T Nagar, Chennai", accountManager: "Rohan Kapoor", accountManagerId: byName("Rohan Kapoor").id, status: "Active" },
];
const clientRows = clientSeed.map((c) => db.insert("clients", c));

// ---------- INFLUENCERS ----------
const categories = ["Beauty", "Fashion", "Fitness", "Tech", "Food", "Travel", "Comedy", "Lifestyle", "Gaming", "Finance"];
const tiers = ["Nano", "Micro", "Macro", "Mega"];
const cities = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Chandigarh"];
const languages = ["English", "Hindi", "Tamil", "Telugu", "Bengali", "Kannada"];
const creatorFirstNames = ["Ananya", "Riya", "Aditya", "Kabir", "Diya", "Arjun", "Tara", "Vivaan", "Myra", "Sai", "Anika", "Reyansh", "Ishita", "Dhruv", "Navya", "Yuvraj", "Kiara", "Aryan", "Pari", "Veer"];
const creatorLastNames = ["Malhotra", "Chopra", "Reddy", "Nair", "Bhatt", "Sen", "Khanna", "Mehta", "Trivedi", "Saxena"];

function tierFromFollowers(f) {
  if (f < 20000) return "Nano";
  if (f < 100000) return "Micro";
  if (f < 1000000) return "Macro";
  return "Mega";
}

const influencerRows = [];
for (let i = 0; i < 24; i++) {
  const name = `${creatorFirstNames[i % creatorFirstNames.length]} ${creatorLastNames[i % creatorLastNames.length]}`;
  const followers = [8000, 18000, 45000, 90000, 180000, 350000, 620000, 1200000, 2500000][i % 9];
  const tier = tierFromFollowers(followers);
  const cost = Math.round(followers * 0.18 + 5000);
  const row = db.insert("influencers", {
    creatorName: name,
    instagramHandle: `@${name.toLowerCase().replace(" ", "")}`,
    youtubeChannel: i % 3 === 0 ? `${name} Vlogs` : "",
    category: categories[i % categories.length],
    tier,
    followers,
    engagementRate: Math.round((2 + Math.random() * 6) * 10) / 10,
    gender: i % 2 === 0 ? "Female" : "Male",
    location: cities[i % cities.length],
    language: languages[i % languages.length],
    contactNumber: `+91 97${(10000000 + i * 211).toString().slice(0, 8)}`,
    email: `${name.toLowerCase().replace(" ", ".")}@creatormail.com`,
    managerDetails: i % 4 === 0 ? "Self-managed" : `${creatorFirstNames[(i + 3) % creatorFirstNames.length]} Talent Mgmt`,
    commercialCost: cost,
    adRightsCost: Math.round(cost * 0.4),
    reelCost: Math.round(cost * 0.6),
    storyCost: Math.round(cost * 0.2),
    eventAppearanceCost: Math.round(cost * 1.5),
    previousBrandCollaborations: ["Glowtone Cosmetics", "Urban Threads", "Verve Beverages"].slice(0, (i % 3) + 1).join(", "),
    contentSamples: "https://drive.example.com/samples/" + name.replace(" ", "_"),
    portfolioLinks: `https://instagram.com/${name.toLowerCase().replace(" ", "")}`,
  });
  influencerRows.push(row);
}

db.insert("influencerLists", { name: "Beauty Launch Shortlist", influencerIds: influencerRows.filter((i) => i.category === "Beauty").map((i) => i.id), createdBy: "Priya Menon" });
db.insert("influencerLists", { name: "Top Tier Mega Creators", influencerIds: influencerRows.filter((i) => i.tier === "Mega").map((i) => i.id), createdBy: "Rohan Kapoor" });

// ---------- CAMPAIGNS ----------
const campaignStatuses = ["Planning", "Active", "In Progress", "Content Approval", "Live", "Completed", "Cancelled"];
const campaignTypes = ["Product Launch", "Brand Awareness", "Festive Sale", "App Install", "UGC Drive"];

const campaignRows = [];
clientRows.forEach((client, ci) => {
  for (let n = 0; n < 2; n++) {
    const idx = ci * 2 + n;
    const status = campaignStatuses[idx % campaignStatuses.length];
    const start = new Date();
    start.setDate(start.getDate() - (idx * 9));
    const end = new Date(start);
    end.setDate(end.getDate() + 30);
    const manager = [byName("Priya Menon"), byName("Rohan Kapoor")][idx % 2];
    const budget = 300000 + idx * 60000;
    const campaign = db.insert("campaigns", {
      campaignName: `${client.brandName} ${campaignTypes[idx % campaignTypes.length]}`,
      clientId: client.id,
      campaignType: campaignTypes[idx % campaignTypes.length],
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      budget,
      assignedTeam: client.industry,
      campaignManager: manager.name,
      campaignManagerId: manager.id,
      status,
      spend: Math.round(budget * (0.3 + (idx % 5) * 0.12)),
      otherCosts: Math.round(budget * 0.05),
    });
    campaignRows.push(campaign);

    // assign 2-3 influencers per campaign
    const assignedInfluencers = influencerRows.slice((idx * 3) % influencerRows.length, (idx * 3) % influencerRows.length + 3);
    assignedInfluencers.forEach((inf, ai) => {
      db.insert("campaignInfluencers", {
        campaignId: campaign.id,
        influencerId: inf.id,
        agreedCost: inf.commercialCost,
        deliverableType: ["Reel", "Story", "Post"][ai % 3],
        approvalStatus: ["Approved", "Pending", "Approved"][ai % 3],
        contentStatus: ["Posted", "In Progress", "Not Started"][ai % 3],
      });
    });

    // deliverables / content calendar
    db.insert("deliverables", { campaignId: campaign.id, title: "Teaser Reel", influencerId: assignedInfluencers[0]?.id, dueDate: start.toISOString().slice(0, 10), status: "Completed", approvalStatus: "Approved" });
    db.insert("deliverables", { campaignId: campaign.id, title: "Launch Day Post", influencerId: assignedInfluencers[1]?.id, dueDate: end.toISOString().slice(0, 10), status: "Pending", approvalStatus: "Pending Review" });
  }
});

// ---------- VENDORS ----------
const vendorCategories = ["Production", "Photography", "Videography", "Venue", "Hospitality", "Logistics", "Printing", "Digital Marketing", "Other"];
const vendorRows = vendorCategories.map((cat, i) =>
  db.insert("vendors", {
    vendorName: `${cat} Partners ${i % 2 === 0 ? "Pvt Ltd" : "& Co"}`,
    serviceType: cat,
    contactPerson: ["Sanjay Kumar", "Ritu Agarwal", "Manoj Pillai", "Farah Sheikh"][i % 4],
    phone: `+91 96${(10000000 + i * 311).toString().slice(0, 8)}`,
    email: `ops@${cat.toLowerCase().replace(/[^a-z]/g, "")}partners.com`,
    gstNumber: `19AAACV${1000 + i}1Z${i % 9}`,
    address: cities[i % cities.length] + ", India",
    paymentTerms: ["Net 15", "Net 30", "50% Advance"][i % 3],
  })
);

// ---------- EVENTS ----------
const eventTypes = ["Brand Activation", "Product Launch", "Influencer Meetup", "Award Night", "Pop-up Store"];
const eventRows = [];
for (let i = 0; i < 6; i++) {
  const client = clientRows[i % clientRows.length];
  const manager = [byName("Rohan Kapoor"), byName("Priya Menon")][i % 2];
  const date = new Date();
  date.setDate(date.getDate() + (i * 11 - 20));
  const budget = 500000 + i * 80000;
  const event = db.insert("events", {
    eventName: `${client.brandName} ${eventTypes[i % eventTypes.length]}`,
    eventType: eventTypes[i % eventTypes.length],
    venue: [`The Leela, ${cities[i % cities.length]}`, `JW Marriott, ${cities[(i + 2) % cities.length]}`, `St Regis, ${cities[(i + 4) % cities.length]}`][i % 3],
    date: date.toISOString().slice(0, 10),
    clientId: client.id,
    budget,
    eventManager: manager.name,
    eventManagerId: manager.id,
    status: ["Planning", "Confirmed", "Completed", "Completed", "Planning", "Confirmed"][i],
    spend: Math.round(budget * 0.55),
  });
  eventRows.push(event);

  vendorRows.slice(0, 3).forEach((v, vi) => {
    db.insert("eventVendors", { eventId: event.id, vendorId: v.id, serviceScope: `${v.serviceType} services for event day`, cost: 40000 + vi * 15000, paymentStatus: vi % 2 === 0 ? "Paid" : "Pending" });
  });

  influencerRows.slice(i * 2, i * 2 + 3).forEach((inf, ii) => {
    db.insert("eventInfluencers", { eventId: event.id, influencerId: inf.id, role: "Appearance", fee: inf.eventAppearanceCost, attendanceStatus: ["Confirmed", "Invited", "Confirmed"][ii % 3] });
  });

  db.insert("eventSponsors", { eventId: event.id, sponsorName: `${vendorCategories[i % vendorCategories.length]} Co-Sponsor`, sponsorshipValue: 100000 + i * 20000, benefitsProvided: "Logo placement, stage mention, social shoutout" });
}

// ---------- TASKS ----------
const taskTitles = [
  "Follow up on proposal", "Finalize influencer shortlist", "Collect content approvals", "Send campaign report",
  "Confirm venue booking", "Vendor payment reconciliation", "Draft contract for new client", "Schedule content calendar review",
];
for (let i = 0; i < 14; i++) {
  const assignee = userRows[(i % 5) + 1];
  const due = new Date();
  due.setDate(due.getDate() + (i % 6 === 0 ? -3 : i * 2 - 5));
  db.insert("tasks", {
    title: taskTitles[i % taskTitles.length],
    description: "Auto-generated sample task for demo purposes.",
    priority: ["Low", "Medium", "High"][i % 3],
    status: i % 7 === 0 ? "Completed" : i % 5 === 0 ? "In Progress" : "Pending",
    dueDate: due.toISOString().slice(0, 10),
    assignedToId: assignee.id,
    assignedToName: assignee.name,
    linkedType: i % 2 === 0 ? "campaign" : "event",
    linkedId: i % 2 === 0 ? campaignRows[i % campaignRows.length].id : eventRows[i % eventRows.length].id,
    createdBy: byName("Aarav Shah").name,
  });
}

// ---------- FINANCE: invoices, vendor payments, expenses ----------
campaignRows.forEach((c, i) => {
  const issue = new Date();
  issue.setDate(issue.getDate() - (i % 5) * 18);
  db.insert("invoices", {
    invoiceNumber: `INV-2026-${String(i + 1).padStart(3, "0")}`,
    clientId: c.clientId,
    campaignId: c.id,
    amount: Math.round(c.budget * 1.15),
    issueDate: issue.toISOString().slice(0, 10),
    dueDate: new Date(issue.getTime() + 15 * 86400000).toISOString().slice(0, 10),
    status: ["Paid", "Paid", "Unpaid", "Overdue"][i % 4],
  });
});
eventRows.forEach((e, i) => {
  const issue = new Date();
  issue.setDate(issue.getDate() - (i % 4) * 22);
  db.insert("invoices", {
    invoiceNumber: `INV-EVT-2026-${String(i + 1).padStart(3, "0")}`,
    clientId: e.clientId,
    eventId: e.id,
    amount: Math.round(e.budget * 0.9),
    issueDate: issue.toISOString().slice(0, 10),
    dueDate: new Date(issue.getTime() + 20 * 86400000).toISOString().slice(0, 10),
    status: ["Paid", "Unpaid"][i % 2],
  });
});

vendorRows.forEach((v, i) => {
  db.insert("vendorPayments", {
    vendorId: v.id,
    invoiceRef: `VEN-${String(i + 1).padStart(3, "0")}`,
    amount: 40000 + i * 12000,
    dueDate: new Date(Date.now() + (i - 3) * 86400000 * 5).toISOString().slice(0, 10),
    status: i % 3 === 0 ? "Paid" : "Pending",
  });
});

["Office Supplies", "Software Subscriptions", "Travel & Conveyance", "Marketing Collateral", "Team Outing"].forEach((label, i) => {
  db.insert("expenses", { category: label, amount: 15000 + i * 8000, date: new Date(Date.now() - i * 4 * 86400000).toISOString().slice(0, 10), notedBy: byName("Neha Joshi").name });
});

// ---------- NOTIFICATIONS ----------
[
  { userId: byName("Sneha Iyer").id, type: "Lead Assignment", message: "You've been assigned a new lead: Crave Foods Co." },
  { userId: byName("Karan Verma").id, type: "Task Assignment", message: "New task assigned: Follow up on proposal." },
  { userId: null, type: "Campaign Update", message: "Verve Beverages Festive Sale moved to Content Approval." },
  { userId: null, type: "Event Deadline", message: "NovaTech Electronics Product Launch is in 5 days." },
  { userId: byName("Neha Joshi").id, type: "Payment Reminder", message: "3 vendor payments are due this week." },
].forEach((n) => db.insert("notifications", { ...n, read: false }));

  // ---------- DOCUMENTS (lightweight references for client history) ----------
  clientRows.forEach((c, i) => {
    db.insert("documents", { entityType: "client", entityId: c.id, name: `${c.brandName} - Master Services Agreement.pdf`, uploadedBy: c.accountManager, uploadedAt: new Date(Date.now() - i * 86400000 * 10).toISOString() });
  });

  // Wait for all writes to propagate to Supabase
  await db.flush();

  console.log("✅ Seed complete.");
  console.log("");
  console.log("Demo login credentials:");
  console.log("  Super Admin -> admin@vigorlaunchpad.com / Admin@123");
  console.log("  Manager     -> priya.manager@vigorlaunchpad.com / Manager@123");
  console.log("  Employee    -> sneha.employee@vigorlaunchpad.com / Employee@123");
  console.log("  Finance     -> neha.finance@vigorlaunchpad.com / Finance@123");
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
