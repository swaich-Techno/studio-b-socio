export const approvalStatuses = [
  "Idea",
  "In Design",
  "Caption Ready",
  "Waiting Owner Approval",
  "Waiting Client Approval",
  "Approved",
  "Scheduled",
  "Posted",
  "Revision Needed"
];

export const industryCategories = {
  "Food & Local Shops": [
    "Sweet Shop / Sweets & Snacks",
    "Restaurant / Cafe / Dhaba",
    "Bakery",
    "Fast Food",
    "Food & Drink",
    "Banquet Hall",
    "Event Venue",
    "Dairy / Milk Products",
    "Hotel / Guest House"
  ],
  "Beauty & Fashion": [
    "Salon / Beauty Parlour",
    "Barber Shop",
    "Clothing / Boutique",
    "Jewellery",
    "Makeup Artist"
  ],
  "Health & Fitness": [
    "Gym / Fitness",
    "Doctor / Clinic",
    "Dentist",
    "Pharmacy / Medical Store"
  ],
  Education: [
    "IELTS / Visa Consultant",
    "School / Coaching Centre"
  ],
  Services: [
    "Real Estate",
    "Car Dealer",
    "Bike Dealer",
    "Electronics / Mobile Shop",
    "Agriculture / Tractor / Machinery",
    "Travel Agency",
    "Furniture Store",
    "Local Retail Store"
  ],
  "Professional/Local": [
    "Photographer",
    "Wedding Planner",
    "NGO",
    "Startup",
    "Other"
  ]
};

export const defaultIndustries = Object.entries(industryCategories).flatMap(([category, names]) =>
  names.map((name) => ({
    name,
    category,
    description: `${name} marketing playbook for local social media growth.`,
    defaultContentIdeas: [
      `Customer trust post for ${name}`,
      `Behind-the-scenes reel for ${name}`,
      `Offer poster for ${name}`,
      `FAQ carousel for ${name}`,
      `Festival campaign for ${name}`
    ],
    defaultHashtags: [`#${name.replace(/[^a-zA-Z0-9]/g, "")}`, "#LocalBusiness", "#BSocioStudio", "#BeSeenBeSocial"],
    defaultPosterStyles: ["Premium", "Minimal", "Modern Indian"],
    defaultReelIdeas: [`Quick product/service reveal for ${name}`, `Customer story reel for ${name}`, `Team/process reel for ${name}`]
  }))
);

export const industryNames = [...defaultIndustries.map((industry) => industry.name), "Other"];

export const teamRoles = [
  "Owner/Admin",
  "Designer",
  "Reel Editor",
  "Caption Writer",
  "Social Media Manager",
  "Ads Manager",
  "Photographer/Videographer",
  "Client Coordinator",
  "Analyst",
  "Intern"
];

export const permissionKeys = [
  "create_content",
  "approve_posts",
  "manage_clients",
  "manage_team",
  "manage_billing",
  "manage_ads",
  "view_analytics",
  "view_reports",
  "assign_tasks",
  "manage_calendar"
];

export const roleDefaultPermissions = {
  "Owner/Admin": permissionKeys,
  "Social Media Manager": ["create_content", "view_analytics", "view_reports", "assign_tasks"],
  Designer: ["create_content"],
  "Reel Editor": ["create_content"],
  "Caption Writer": ["create_content"],
  "Ads Manager": ["manage_ads", "view_analytics", "view_reports"],
  "Photographer/Videographer": ["create_content"],
  "Client Coordinator": ["create_content", "view_reports", "assign_tasks"],
  Analyst: ["view_analytics", "view_reports"],
  Intern: ["create_content"]
};

export const skillOptions = [
  "Canva Design",
  "Poster Design",
  "Reel Editing",
  "CapCut Editing",
  "Caption Writing",
  "Hashtag Writing",
  "Instagram Posting",
  "Facebook Posting",
  "Meta Business Suite",
  "Photography",
  "Videography",
  "Mobile Shooting",
  "Client Coordination",
  "Meta Ads",
  "Facebook Ads",
  "Instagram Ads",
  "Lead Tracking",
  "Reporting",
  "Sales",
  "Strategy"
];
