function sameMonth(dateValue, month, year) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return date.getMonth() + 1 === Number(month) && date.getFullYear() === Number(year);
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

export function buildMonthlyReport({ client, month, year, analytics = [], calendar = [], tasks = [] }) {
  const brandBrain = client.brandBrain || {};
  const monthCalendar = calendar.filter((item) => sameMonth(item.postDate || item.date, month, year));
  const monthAnalytics = analytics.filter((item) => sameMonth(item.date, month, year));
  const monthTasks = tasks.filter((item) => item.status === "Completed" && sameMonth(item.dueDate || item.createdAt, month, year));
  const totalPosts = monthCalendar.filter((item) => item.contentType === "Post" || item.contentType === "Carousel").length;
  const totalReels = monthCalendar.filter((item) => item.contentType === "Reel").length;
  const totalStories = monthCalendar.filter((item) => item.contentType === "Story").length;
  const totalReach = sum(monthAnalytics, "reach");
  const totalEngagement = sum(monthAnalytics, "likes") + sum(monthAnalytics, "comments") + sum(monthAnalytics, "shares") + sum(monthAnalytics, "saves");
  const totalLeads = sum(monthAnalytics, "leads");
  const bestPlatform = [...monthAnalytics].sort((a, b) => Number(b.reach || 0) - Number(a.reach || 0))[0]?.platform || "Manual tracking not added yet";

  return {
    summary: `${client.businessName} had ${monthCalendar.length} planned content items in ${month}/${year}, including ${totalPosts} posts/carousels, ${totalReels} reels, and ${totalStories} stories. Manual analytics recorded ${totalReach} reach, ${totalEngagement} engagement actions, and ${totalLeads} leads.`,
    completedWork: monthTasks.length
      ? monthTasks.map((task) => `${task.title} (${task.category})`).join(", ")
      : "No completed tasks were marked for this period yet.",
    analyticsSummary: `Followers tracked: ${sum(monthAnalytics, "followers")}. Reach: ${totalReach}. Views / Impressions: ${sum(monthAnalytics, "impressions")}. Leads: ${totalLeads}. Estimated sales: ${sum(monthAnalytics, "salesEstimate")}.`,
    bestContent: `Best performing platform/content signal: ${bestPlatform}. Add content-level notes in calendar entries to make this section sharper.`,
    nextMonthSuggestions: `Post consistently, turn ${brandBrain.bestSellingProducts || "best offers"} into reels, collect more customer reviews, and test one local trend for ${client.industry}. Keep the tone ${brandBrain.brandTone || "consistent with the brand"}.`,
    platformsHandled: Array.from(new Set(monthCalendar.map((item) => item.platform))).filter(Boolean),
    totals: {
      posts: totalPosts,
      reels: totalReels,
      stories: totalStories,
      planned: monthCalendar.length,
      completedTasks: monthTasks.length,
      reach: totalReach,
      engagement: totalEngagement,
      leads: totalLeads
    }
  };
}
