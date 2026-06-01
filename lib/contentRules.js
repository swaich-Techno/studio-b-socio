import { defaultIndustries } from "@/lib/options";

const industryPlaybooks = {
  "Sweet Shop": {
    products: ["sweets", "samosa", "bread toast", "pakoras", "golgappa", "roasted barfi"],
    ideas: [
      "Fresh morning preparation reel showing the team making {product}",
      "Family order bundle for weekend guests and small celebrations",
      "Festival offer post with premium sweet box styling",
      "Local shop promotion highlighting fresh taste and WhatsApp orders",
      "Behind-the-counter video showing hot samosa, pakoras, and bread toast"
    ],
    hashtags: ["#SweetShop", "#FreshSweets", "#SamosaLove", "#PakoraTime", "#Golgappa", "#Barfi", "#FestivalSweets", "#FamilyOrders", "#WhatsAppOrders", "#LocalBusiness"]
  },
  Restaurant: {
    products: ["combos", "chef special", "family meal", "customer reviews"],
    ideas: [
      "Combo offer post built around {product}",
      "Behind-the-scenes reel from kitchen prep",
      "Customer review carousel with a food close-up",
      "Lunch or dinner rush reel with fast cuts",
      "Weekend table booking reminder with local CTA"
    ],
    hashtags: ["#RestaurantMarketing", "#Foodie", "#FoodPromo", "#ChefSpecial", "#LocalEats", "#WeekendFood", "#FoodReels"]
  },
  Cafe: {
    products: ["coffee", "snacks", "desserts", "combo offers"],
    ideas: [
      "Cafe mood reel with coffee pour and soft music",
      "Snack combo poster for students and office crowd",
      "Customer corner photo carousel",
      "Dessert close-up post with premium caption",
      "Weekend hangout story poll"
    ],
    hashtags: ["#CafeLife", "#CoffeeTime", "#CafeReels", "#LocalCafe", "#DessertPost", "#SnackCombo"]
  },
  Salon: {
    products: ["bridal packages", "haircuts", "skincare", "festive offers"],
    ideas: [
      "Before-after haircut transformation reel",
      "Bridal package carousel with service highlights",
      "Skincare routine tip post",
      "Festive glow-up offer poster",
      "Stylist expert tip story sequence"
    ],
    hashtags: ["#Salon", "#BridalPackage", "#Haircut", "#Skincare", "#GlowUp", "#FestiveOffer", "#BeautyReels"]
  },
  Gym: {
    products: ["membership", "trainer sessions", "diet tips", "transformations"],
    ideas: [
      "Transformation post with member story",
      "Trainer reel teaching one correct exercise form",
      "Membership offer poster for new joiners",
      "Diet tip carousel for local fitness audience",
      "Morning workout motivation story"
    ],
    hashtags: ["#GymMarketing", "#Fitness", "#Transformation", "#TrainerReels", "#DietTips", "#MembershipOffer"]
  }
};

for (const industry of defaultIndustries) {
  if (!industryPlaybooks[industry.name]) {
    industryPlaybooks[industry.name] = {
      products: ["signature offer", "best-selling service", "customer result"],
      ideas: industry.defaultContentIdeas,
      hashtags: industry.defaultHashtags
    };
  }
}

const defaultPlaybook = {
  products: ["service", "offer", "customer story", "local promotion"],
  ideas: [
    "Customer problem and solution post for {product}",
    "Local trust-building carousel with business highlights",
    "Founder or team story reel",
    "Limited-time offer poster with clear CTA",
    "FAQ story sequence answering common customer questions"
  ],
  hashtags: ["#LocalBusiness", "#SmallBusiness", "#SupportLocal", "#BusinessGrowth", "#SocialMediaMarketing", "#LocalOffers"]
};

function pickPlaybook(industry) {
  if (industryPlaybooks[industry]) return industryPlaybooks[industry];
  if (industry?.includes("Sweet")) return industryPlaybooks["Sweet Shop"];
  if (industry?.includes("Restaurant") || industry?.includes("Cafe") || industry?.includes("Dhaba")) return industryPlaybooks.Restaurant;
  if (industry?.includes("Salon") || industry?.includes("Beauty")) return industryPlaybooks.Salon;
  if (industry?.includes("Gym") || industry?.includes("Fitness")) return industryPlaybooks.Gym;
  return defaultPlaybook;
}

function fillTemplate(text, values) {
  return text.replaceAll("{product}", values.product || "your best-selling product").replaceAll("{business}", values.business || "your business");
}

function languageHint(language) {
  const hints = {
    Hindi: "Use simple Hindi words with a friendly local tone.",
    Punjabi: "Use warm Punjabi phrasing suitable for a local audience.",
    Hinglish: "Use Hinglish that feels natural for Instagram and WhatsApp.",
    English: "Use clean, simple English."
  };
  return hints[language] || hints.English;
}

function toneHint(tone) {
  const hints = {
    Premium: "premium and polished",
    Funny: "light, clever, and shareable",
    Festive: "celebration-focused and warm",
    Professional: "clear and reliable",
    Friendly: "warm and approachable",
    "Local Punjabi/Hindi": "local, familiar, and community-first"
  };
  return hints[tone] || "friendly and useful";
}

function compactHashtag(value) {
  return `#${String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 40)}`;
}

function ctaByLanguage(language) {
  const ctas = {
    Punjabi: ["WhatsApp ਤੇ order ਕਰੋ", "ਅੱਜ ਹੀ visit ਕਰੋ", "DM ਕਰਕੇ book ਕਰੋ", "Offer save ਕਰੋ", "Call ਕਰਕੇ ਪੁੱਛੋ"],
    Hindi: ["WhatsApp पर order करें", "आज ही visit करें", "DM करके book करें", "Offer save करें", "Call करके पूछें"],
    Hinglish: ["WhatsApp par order karein", "DM to book", "Visit today", "Save this offer", "Call now"],
    English: ["Order on WhatsApp", "DM to book", "Visit today", "Save this offer", "Call now"]
  };
  return ctas[language] || ctas.English;
}

function localizedCaption({ language, business, product, offer, tone, audience, platform, goal }) {
  const offerLine = offer ? ` ${offer}` : "";
  const audienceLine = audience ? ` ${audience}` : "";
  const captions = {
    Punjabi: [
      `${business} ਵੱਲੋਂ ${product} ਦੀ fresh update. Quality, taste ਤੇ local trust ਇੱਕੋ ਥਾਂ.${offerLine} WhatsApp ਤੇ order ਕਰੋ ਜਾਂ ਅੱਜ ਹੀ visit ਕਰੋ।`,
      `Bagli/Samrala side ਦੇ customers ਲਈ ${business} ਦਾ ${product} ready ਹੈ. Fresh preparation, clean service ਤੇ family orders ਲਈ perfect.${offerLine}`,
      `${product} ਦਾ mood ਹੈ? ${business} ਤੇ ਆਓ ਜਾਂ WhatsApp ਕਰੋ. Taste local, presentation premium, service fast.${offerLine}`
    ],
    Hindi: [
      `${business} की fresh update: ${product} अब ready है. Quality, taste और local trust एक साथ.${offerLine} WhatsApp पर order करें या आज visit करें।`,
      `${product} के लिए ${business} आपके local customers की trusted choice है. Fresh preparation, clean service और family orders के लिए perfect.${offerLine}`,
      `आज कुछ tasty चाहिए? ${business} पर ${product} try करें. Local taste, premium presentation और clear service.${offerLine}`
    ],
    Hinglish: [
      `${business} ki fresh update: ${product} ready hai. Taste local, quality trusted, presentation premium.${offerLine} WhatsApp par order karein.`,
      `${product} ke liye ${business} is ready for local customers. Fresh prep, clear pricing, and quick service.${offerLine}`,
      `Aaj ka plan simple rakho: ${business} ka ${product} try karo. DM/WhatsApp for order or booking.${offerLine}`
    ],
    English: [
      `${business} brings you ${product} with fresh preparation, clean presentation, and local trust.${offerLine} Message us to order or book today.`,
      `Make your next visit or order easier with ${business}. ${product} is ready for customers who care about quality.${offerLine}`,
      `Looking for ${product}? ${business} has you covered with a simple, reliable, and premium local experience.${offerLine}`
    ]
  };

  return (captions[language] || captions.English).map((caption) =>
    `${caption} ${tone ? `Tone: ${tone}.` : ""} Platform: ${platform}. Goal: ${goal}.${audienceLine}`
  );
}

function catalogueHighlights(client) {
  const items = client.catalogueItems || [];
  return items
    .slice(0, 6)
    .map((item) => item.name || item)
    .filter(Boolean);
}

function sweetShopBoost(industry, product) {
  if (!industry?.toLowerCase().includes("sweet") && !industry?.toLowerCase().includes("food")) return [];
  return [
    `Fresh counter reel: close-ups of ${product}, samosa, pakoras, bread toast, and golgappa with quick price/menu text overlays.`,
    "Family order carousel: sweet boxes, snacks, birthday/function orders, and WhatsApp order CTA.",
    "Banquet/function booking post: show hall setup, food counters, sweets, snacks, and booking contact."
  ];
}

export function generateContentPlan(input, client = {}) {
  const playbook = pickPlaybook(client.industry || input.industry);
  const brandBrain = client.brandBrain || {};
  const catalogueProducts = catalogueHighlights(client);
  const product = input.productName || catalogueProducts[0] || brandBrain.bestSellingProducts || playbook.products[0] || client.mainProducts || "featured product";
  const business = client.businessName || "the business";
  const platform = input.platform || "Instagram";
  const goal = input.goal || "Awareness";
  const tone = toneHint(input.tone || brandBrain.brandTone);
  const selectedLanguage = input.language || brandBrain.preferredLanguage || "English";
  const language = languageHint(selectedLanguage);
  const offer = input.offerDetails ? `Offer: ${input.offerDetails}.` : "";
  const audienceText = brandBrain.mainAudience || client.targetAudience || "";
  const audience = audienceText ? `Target audience: ${audienceText}.` : "";
  const avoidWords = brandBrain.doNotUseWords ? ` Avoid these words: ${brandBrain.doNotUseWords}.` : "";
  const competitors = brandBrain.competitors ? ` Differentiate from competitors: ${brandBrain.competitors}.` : "";
  const notes = input.extraNotes || brandBrain.notes ? ` Extra context: ${input.extraNotes || brandBrain.notes}.` : "";
  const catalogueLine = catalogueProducts.length ? ` Use these catalogue/menu highlights when relevant: ${catalogueProducts.join(", ")}.` : "";

  const ideas = [
    ...playbook.ideas.map((idea, index) =>
      `${index + 1}. ${fillTemplate(idea, { product, business })} for ${platform}, focused on ${goal}. ${catalogueLine}`
    ),
    ...sweetShopBoost(client.industry || input.industry, product)
  ];

  while (ideas.length < 5) {
    ideas.push(`${ideas.length + 1}. Local customer trust post for ${business} featuring ${product}, proof, pricing clarity, and a direct CTA.`);
  }

  const captions = localizedCaption({
    language: selectedLanguage,
    business,
    product,
    offer,
    tone,
    audience,
    platform,
    goal
  }).slice(0, 3);

  captions.push(
    `${business}: ${product} highlight for ${platform}. ${language} Keep the message ${tone}. ${offer} ${audience}${competitors}${avoidWords}${notes} CTA: ${ctaByLanguage(selectedLanguage)[0]}.`,
    `Post angle: customer problem, product close-up, trust proof, and CTA for ${business}. Feature ${product}.${catalogueLine} ${offer} ${audience}`
  );

  const hashtags = Array.from(new Set([
    ...playbook.hashtags,
    ...catalogueProducts.map(compactHashtag),
    compactHashtag(business),
    compactHashtag(platform),
    compactHashtag(client.location || "Local"),
    "#BeSeenBeSocial",
    "#BSocioStudio",
    "#LocalMarketing"
  ].filter((tag) => tag.length > 1))).slice(0, 15);

  const reelIdeas = [
    `Quick hook: show ${product} in the first second, then reveal ${offer || "the main benefit"} with readable text.`,
    `Behind-the-scenes reel at ${business}: preparation, staff action, customer-facing result, then WhatsApp/DM CTA.`,
    `Menu highlight reel: 3 quick shots from ${catalogueProducts.length ? catalogueProducts.join(", ") : product}, ending with price/order CTA.`
  ];

  const storyIdeas = [
    `Poll: Would you try ${product} today?`,
    `Countdown sticker for ${offer || "today's special offer"} with a reply-to-order prompt.`,
    `Question box: Ask ${business} about ${product}, family orders, bookings, or availability.`
  ];

  const posterPrompts = [
    `Premium poster for ${business} featuring ${product}. Use realistic product photography, brand colors ${brandBrain.brandColors || client.brandColors || "teal and black"}, clear headline, offer block, and WhatsApp CTA.`,
    `Menu/catalogue poster for ${business}: show ${catalogueProducts.length ? catalogueProducts.join(", ") : product}, clean grid layout, prices if available, mobile-safe text, premium local style.`,
    `Festival/local offer poster for ${business}: warm lighting, rich product close-up, bold ${selectedLanguage} headline, clear CTA, no clutter.`
  ];
  const monthlyCalendar = ideas.slice(0, 8).map((idea, index) => ({
    week: `Week ${Math.floor(index / 2) + 1}`,
    topic: idea.replace(/^\d+\.\s*/, ""),
    platform,
    contentType: index % 3 === 0 ? "Reel" : index % 3 === 1 ? "Story" : "Post"
  }));
  const adCopy = [
    `Headline: ${product} at ${business}. Primary text: Fresh, trusted, and ready for local customers. ${offer || "Message now for details."} CTA: ${ctaByLanguage(selectedLanguage)[0]}.`,
    `Headline: Local favorite offer. Primary text: Visit ${business} today and experience quality made for ${audienceText || "your family and friends"}. CTA: ${ctaByLanguage(selectedLanguage)[2]}.`
  ];
  const whatsappMessages = [
    selectedLanguage === "Punjabi" ? `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ਜੀ, ${business} ਤੇ ${product} available ਹੈ। Order/booking ਲਈ ਇਸੇ WhatsApp ਤੇ message ਕਰੋ।` : `Hi, ${business} has ${product} available today. Reply here to order or ask for details.`,
    selectedLanguage === "Hindi" ? `नमस्ते, ${business} पर ${product} available है। Order/booking के लिए इसी WhatsApp पर message करें।` : `Special update from ${business}: ${offer || `fresh ${product} is ready`}. Message us to book/order.`
  ];
  const googleReviewRequests = [
    selectedLanguage === "Punjabi" ? `${business} visit ਕਰਨ ਲਈ ਧੰਨਵਾਦ ਜੀ। Google ਤੇ ਇੱਕ review ਸਾਡੇ local business ਲਈ ਬਹੁਤ help ਕਰੇਗਾ।` : `Thank you for visiting ${business}. Please share your experience on Google, it helps our local business grow.`,
    selectedLanguage === "Hindi" ? `${business} आने के लिए धन्यवाद। Google पर एक review हमारे local business की बहुत मदद करेगा।` : `We hope you liked ${product}. A quick Google review would mean a lot to our team.`
  ];

  return {
    ideas: ideas.slice(0, 5),
    captions,
    hashtags,
    reelIdeas,
    storyIdeas,
    posterPrompts,
    monthlyCalendar,
    adCopy,
    whatsappMessages,
    googleReviewRequests,
    ctas: ctaByLanguage(selectedLanguage)
  };

  // Future AI upgrade:
  // Replace or enrich this function with an OpenAI API call using the same input shape.
}

export function generateImagePrompt(input, client = {}) {
  const brandBrain = client.brandBrain || {};
  const business = client.businessName || "the business";
  const catalogueProducts = catalogueHighlights(client);
  const product = input.productName || catalogueProducts[0] || brandBrain.bestSellingProducts || "featured product/service";
  const platform = input.platformSize || input.platform || "Instagram Post";
  const colors = input.colors || input.brandColors || brandBrain.brandColors || client.brandColors || "black, white, grey, and one premium accent color";
  const cta = input.cta || (input.offer ? `Use CTA text related to "${input.offer}".` : "Use a clear CTA such as Order Now, Book Now, or Visit Today.");
  const designPreferences = brandBrain.designPreferences ? `Design preferences: ${brandBrain.designPreferences}.` : "";
  const audience = brandBrain.mainAudience || client.targetAudience ? `Audience: ${brandBrain.mainAudience || client.targetAudience}.` : "";
  const sizes = {
    "Instagram Post": "1:1 square, 1080x1080",
    "Instagram Story": "9:16 vertical, 1080x1920",
    "Reel Cover": "9:16 vertical with safe center crop",
    "Facebook Post": "4:5 or 1:1 feed-safe",
    Banner: "wide 16:9 banner",
    "WhatsApp Status": "9:16 vertical"
  };
  const catalogueLine = catalogueProducts.length ? `Optional menu/catalogue items to include tastefully: ${catalogueProducts.join(", ")}.` : "";

  return {
    prompt: `Create a professional marketing poster for ${business}. Main focus: ${product}. Platform: ${platform}. Required size/aspect: ${input.aspectRatio || sizes[platform] || "platform appropriate"}. Style: ${input.style || "Premium"}, clean, realistic, premium local Indian business design. Use brand colors: ${colors}. Visible text language: ${input.language || brandBrain.preferredLanguage || "English"}. Include text exactly where readable: "${input.textToInclude || business}". Offer text: "${input.offer || "no offer"}". CTA: ${cta}. Composition: realistic product/service hero image, soft natural lighting, slight 45-degree camera angle, clean background, crisp typography, strong visual hierarchy, safe margins for mobile, and no visual clutter. Industry context: ${input.industry || client.industry || "local business"}. ${catalogueLine} ${audience} ${designPreferences} Notes: ${input.notes || brandBrain.notes || "keep it clean and premium."}`,
    negativePrompt: "Avoid clutter, blurry text, distorted logos, fake contact numbers, spelling mistakes, unreadable typography, messy backgrounds, low-resolution output, random brand names, watermarks, over-saturated colors, plastic-looking food, extra hands, and cropped CTA text.",
    designNotes: `Use ${colors}. Keep the product/service first, headline second, CTA third. Use large text only for the main offer or product name.`,
    suggestedLayout: "Top: small brand name and category. Center: product/service hero. Lower third: offer, menu/service highlight, and CTA. Bottom: WhatsApp/contact/location if provided.",
    suggestedCTA: input.offer ? "Claim Offer Today" : "Order Now"
  };

  // Future AI image API integration can send prompt and negativePrompt to OpenAI image generation,
  // Midjourney, Leonardo, Ideogram, Canva AI, or another poster creation workflow.
}

export function generateReelPlan(input, client = {}) {
  const brandBrain = client.brandBrain || {};
  const business = client.businessName || "the business";
  const catalogueProducts = catalogueHighlights(client);
  const product = input.productName || catalogueProducts[0] || brandBrain.bestSellingProducts || client.mainProducts || "featured offer";
  const goal = input.goal || "Awareness";
  const duration = input.duration || "15 sec";
  const tone = input.tone || brandBrain.brandTone || "Local";
  const language = input.language || brandBrain.preferredLanguage || "Hinglish";
  const audience = brandBrain.mainAudience || client.targetAudience || "local customers";
  const hooks = {
    Punjabi: `${duration} ਵਿੱਚ ${product} ਦੀ fresh ਝਲਕ - ${business} ਨੂੰ local customers ਕਿਉਂ choose ਕਰਨ?`,
    Hindi: `${duration} में ${product} की fresh झलक - ${business} को local customers क्यों choose करें?`,
    Hinglish: `${duration} mein ${product} ka fresh look - why locals should choose ${business}.`,
    English: `${product} in ${duration}: show the strongest reason ${audience} should choose ${business}.`
  };
  const hook = hooks[language] || hooks.English;
  const scenes = [
    `0-3 sec: strong close-up of ${product} with hook text on screen and no slow intro.`,
    `3-8 sec: show preparation, result, menu/service detail, or customer benefit with quick cuts.`,
    `8-12 sec: add proof such as freshness, team work, review, offer, transformation, or catalogue/menu highlight.`,
    `Final seconds: show ${business} name, location/contact, and clear CTA.`
  ];
  const hashtags = Array.from(new Set([
    `#${business.replace(/[^a-zA-Z0-9]/g, "")}`,
    `#${String(client.industry || "LocalBusiness").replace(/[^a-zA-Z0-9]/g, "")}`,
    "#ReelMarketing",
    "#LocalBusiness",
    "#BSocioStudio",
    "#BeSeenBeSocial"
  ]));

  return {
    hook,
    script: `Goal: ${goal}. Tone: ${tone}. Language: ${language}. Open with ${product}, show a real benefit, include ${catalogueProducts.length ? catalogueProducts.join(", ") : "one proof point"}, then end with a direct CTA for ${business}.`,
    scenes,
    onScreenText: language === "Punjabi"
      ? [`${product} ready ਹੈ`, "Fresh taste, local trust", "WhatsApp ਕਰੋ"]
      : language === "Hindi"
        ? [`${product} ready है`, "Fresh taste, local trust", "WhatsApp करें"]
        : [`Why locals love ${product}`, "Fresh, trusted, ready today", "DM or WhatsApp now"],
    voiceover: language === "Punjabi"
      ? `${business} ਤੇ ${product} fresh ready ਹੈ। Order ਜਾਂ booking ਲਈ WhatsApp ਕਰੋ।`
      : language === "Hindi"
        ? `${business} पर ${product} fresh ready है। Order या booking के लिए WhatsApp करें।`
        : `${language} voiceover: Looking for ${product}? ${business} brings you quality, trust, and a reason to visit today.`,
    caption: localizedCaption({ language, business, product, offer: "", tone, audience: `For ${audience}.`, platform: "Reels", goal })[0],
    hashtags,
    editingInstructions: "Use fast cuts, clear readable text, natural colors, clean transitions, and keep the product visible in every main shot.",
    musicSuggestion: `${tone} trending reel audio with a clean beat. Future API integration can pull real trend sounds from social platforms.`,
    coverPrompt: `Create a clean reel cover for ${business} featuring ${product}, bold readable title, ${tone} style, mobile-first layout, brand colors ${brandBrain.brandColors || client.brandColors || "black, white, and teal"}.`
  };

  // Future video AI upgrade:
  // Send scenes, voiceover, and coverPrompt to Runway or another video generation API.
}
