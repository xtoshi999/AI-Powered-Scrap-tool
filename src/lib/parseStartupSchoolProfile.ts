import * as cheerio from "cheerio";
import { parseLastSeenToApproximateMinutes } from "@/lib/lastSeen";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

function trimCellAfterLabel(main: Cheerio<AnyNode>, labelText: string): string {
  return main
    .find(`span.css-19yrmx8:contains("${labelText}")`)
    .first()
    .next(".css-1tp1ukf")
    .text()
    .trim();
}

function interestPillsFromRow(
  main: Cheerio<AnyNode>,
  $: CheerioAPI,
  labelText: string
): string[] {
  const label = main.find(`span.css-19yrmx8:contains("${labelText}")`).first();
  if (!label.length) return [];
  const cell = label.next(".css-1tp1ukf");
  const newStyle = cell.find(".css-1ehgg8");
  if (newStyle.length) {
    return newStyle
      .map((_: number, el: AnyNode) => $(el).text().trim())
      .get()
      .filter(Boolean);
  }
  return [];
}

/**
 * Parses Startup School co-founder candidate HTML. Emotion class hashes change between
 * deploys; we combine stable attributes (title=, label text) with current class fallbacks.
 */
export function parseStartupSchoolProfile(html: string, pageUrl: string) {
  const $ = cheerio.load(html);
  const mainContent = $(".css-139x40p");
  if (!mainContent.length) return null;

  const userId = pageUrl.split("/").filter(Boolean).pop();
  if (!userId) return null;

  const age = mainContent.find('[title="Age"]').text().replace(/\D/g, "");

  const name =
    mainContent.find(".css-1s8r69b").first().text().trim() ||
    mainContent.find("h1").first().text().trim() ||
    mainContent.find(".css-y9z691").first().text().trim();

  const sumary =
    mainContent.find(".css-cyoc3t").first().text().trim() ||
    mainContent.find(".css-1wz7m2j").first().text().trim();

  let shared = interestPillsFromRow(mainContent, $, "Our shared interests");
  if (!shared.length) {
    shared = mainContent
      .find(".css-1v9f1hn")
      .map((_, el) => $(el).text().trim())
      .get();
  }

  let personal = interestPillsFromRow(mainContent, $, "My personal interests");
  if (!personal.length) {
    personal = mainContent
      .find(".css-1lw35t7")
      .map((_, el) => $(el).text().trim())
      .get();
  }

  const liAnchor = mainContent.find('a[href*="linkedin.com"]').first();
  const linkedIn =
    liAnchor.attr("href")?.trim() ||
    mainContent.find(".css-107cmgv").attr("title")?.trim();

  const lastSeen = mainContent
    .find('[title="Last seen on co-founder matching"]')
    .text()
    .replace("Last seen ", "")
    .trim();
  const lastSeenMinutesApprox =
    parseLastSeenToApproximateMinutes(lastSeen) ?? undefined;

  const profile = {
    userId,
    name,
    location: mainContent.find('[title="Location"]').text().trim(),
    age: age ? parseInt(age, 10) : null,
    lastSeen,
    lastSeenMinutesApprox,
    avatar: mainContent.find(".css-1bm26bw").attr("src"),
    sumary,
    intro: trimCellAfterLabel(mainContent, "Intro"),
    lifeStory: trimCellAfterLabel(mainContent, "Life Story"),
    freeTime: trimCellAfterLabel(mainContent, "Free Time"),
    other: trimCellAfterLabel(mainContent, "Other"),
    accomplishments: trimCellAfterLabel(
      mainContent,
      "Impressive accomplishment"
    ),
    education: Array.from(
      new Set(
        mainContent
          .find('.css-19yrmx8:contains("Education")')
          .first()
          .next(".css-1tp1ukf")
          .find("li .css-kaq1dv, .css-kaq1dv")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter((text: string) => text.length > 0)
      )
    ),
    employment: Array.from(
      new Set(
        mainContent
          .find('.css-19yrmx8:contains("Employment")')
          .first()
          .next(".css-1tp1ukf")
          .find("li .css-kaq1dv, .css-kaq1dv")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter((text: string) => text.length > 0)
      )
    ),
    startup: {
      name:
        mainContent.find(".css-bcaew0 b").first().text().trim() !== ""
          ? mainContent.find(".css-bcaew0 b").first().text().trim()
          : "Potential Idea",
      description:
        mainContent.find(".css-bcaew0 b").first().text().trim() !== ""
          ? mainContent
              .find(
                `span.css-19yrmx8:contains("${mainContent
                  .find(".css-bcaew0 b")
                  .first()
                  .text()
                  .trim()}")`
              )
              .next(".css-1tp1ukf")
              .text()
              .trim()
          : mainContent.find("div.css-1hla380").text().trim(),
      progress: trimCellAfterLabel(mainContent, "Progress"),
      funding: trimCellAfterLabel(mainContent, "Funding Status"),
    },
    cofounderPreferences: {
      requirements: mainContent
        .find(".css-1hla380 p")
        .map((_, el) => $(el).text().trim())
        .get(),
      idealPersonality: trimCellAfterLabel(mainContent, "Ideal co-founder"),
      equity: trimCellAfterLabel(mainContent, "Equity expectations"),
    },
    interests: {
      shared,
      personal,
    },
    linkedIn,
  };

  return profile;
}
