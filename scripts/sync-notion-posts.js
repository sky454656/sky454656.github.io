const fs = require("fs");
const path = require("path");
const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const POSTS_DIR = path.join(process.cwd(), "_posts");
const POST_IMAGES_DIR = path.join(process.cwd(), "assets", "img", "posts");

if (!process.env.NOTION_TOKEN) {
  throw new Error("NOTION_TOKEN 이 없습니다.");
}

if (!DATABASE_ID) {
  throw new Error("NOTION_DATABASE_ID 가 없습니다.");
}

if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
}

if (!fs.existsSync(POST_IMAGES_DIR)) {
  fs.mkdirSync(POST_IMAGES_DIR, { recursive: true });
}

function richTextToPlain(richTextArray = []) {
  return richTextArray.map((item) => item.plain_text || "").join("");
}

function slugify(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_가-힣]/g, "")
    .replace(/-+/g, "-");
}

function escapeYaml(str = "") {
  return String(str).replace(/\r?\n+/g, " ").replace(/\s+/g, " ").trim().replace(/"/g, '\\"');
}

function formatDateOnly(value) {
  return String(value || "").slice(0, 10);
}

function getSeoulDateParts(value) {
  const date = value ? new Date(value) : new Date();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function formatSeoulDateTime(value) {
  const parts = getSeoulDateParts(value);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} +0900`;
}

function getTodayDate() {
  const parts = getSeoulDateParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function sanitizeFileName(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getFileExtension(url, contentType) {
  const pathname = (() => {
    try {
      return new URL(url).pathname;
    } catch (_error) {
      return "";
    }
  })();

  const extensionFromPath = path.extname(pathname);
  if (extensionFromPath) {
    return extensionFromPath.toLowerCase();
  }

  const normalizedType = String(contentType || "").split(";")[0].trim().toLowerCase();
  const extensionMap = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/avif": ".avif",
  };

  return extensionMap[normalizedType] || ".img";
}

async function downloadImage(url, outputPath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`이미지 다운로드 실패: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));

  return response.headers.get("content-type");
}

async function imageBlockToMarkdown(block, meta, imageIndex) {
  const image = block.image;
  const sourceUrl = image.type === "external" ? image.external.url : image.file.url;
  const caption = richTextToPlain(image.caption);
  const alt = escapeYaml(caption || meta.title || `image-${imageIndex}`);
  const postImageDir = path.join(POST_IMAGES_DIR, meta.slug);
  const fileBaseName = sanitizeFileName(`${meta.date}-${meta.slug}-${imageIndex}`) || `image-${imageIndex}`;
  const tempPath = path.join(postImageDir, `${fileBaseName}.tmp`);

  if (!fs.existsSync(postImageDir)) {
    fs.mkdirSync(postImageDir, { recursive: true });
  }

  try {
    const contentType = await downloadImage(sourceUrl, tempPath);
    const extension = getFileExtension(sourceUrl, contentType);
    const fileName = `${fileBaseName}${extension}`;
    const outputPath = path.join(postImageDir, fileName);

    fs.renameSync(tempPath, outputPath);

    return `![${alt}](/assets/img/posts/${meta.slug}/${fileName})`;
  } catch (error) {
    fs.rmSync(tempPath, { force: true });
    console.warn(`이미지 저장 실패 (${sourceUrl}): ${error.message}`);
    return `![${alt}](${sourceUrl})`;
  }
}

async function resolveQueryTargetId() {
  if (typeof notion.dataSources?.query === "function") {
    if (typeof notion.databases?.retrieve === "function") {
      try {
        const database = await notion.databases.retrieve({
          database_id: DATABASE_ID,
        });

        const dataSourceId = database.data_sources?.[0]?.id;

        if (!dataSourceId) {
          throw new Error(
            "데이터베이스에 조회 가능한 data source 가 없습니다. NOTION_DATABASE_ID 값을 확인하세요."
          );
        }

        return {
          kind: "data_source",
          id: dataSourceId,
        };
      } catch (error) {
        if (error?.code !== "object_not_found" && error?.status !== 404) {
          throw error;
        }
      }
    }

    const dataSource = await notion.dataSources.retrieve({
      data_source_id: DATABASE_ID,
    });

    return {
      kind: "data_source",
      id: dataSource.id,
    };
  }

  if (typeof notion.databases?.query === "function") {
    return {
      kind: "database",
      id: DATABASE_ID,
    };
  }

  throw new Error("현재 설치된 Notion SDK 에서 query API 를 찾을 수 없습니다.");
}

async function getAllPages() {
  const results = [];
  let cursor = undefined;
  const target = await resolveQueryTargetId();

  while (true) {
    const queryArgs = {
      start_cursor: cursor,
      filter: {
        property: "Published",
        checkbox: {
          equals: true,
        },
      },
    };

    const response =
      target.kind === "data_source"
        ? await notion.dataSources.query({
            data_source_id: target.id,
            ...queryArgs,
          })
        : await notion.databases.query({
            database_id: target.id,
            ...queryArgs,
          });

    results.push(...response.results);

    if (!response.has_more) break;
    cursor = response.next_cursor;
  }

  return results;
}

async function getBlockChildren(blockId) {
  const blocks = [];
  let cursor = undefined;

  while (true) {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });

    blocks.push(...response.results);

    if (!response.has_more) break;
    cursor = response.next_cursor;
  }

  return blocks;
}

async function blockToMarkdown(block, context) {
  const type = block.type;

  if (type === "paragraph") {
    return richTextToPlain(block.paragraph.rich_text);
  }

  if (type === "heading_1") {
    return `# ${richTextToPlain(block.heading_1.rich_text)}`;
  }

  if (type === "heading_2") {
    return `## ${richTextToPlain(block.heading_2.rich_text)}`;
  }

  if (type === "heading_3") {
    return `### ${richTextToPlain(block.heading_3.rich_text)}`;
  }

  if (type === "bulleted_list_item") {
    return `- ${richTextToPlain(block.bulleted_list_item.rich_text)}`;
  }

  if (type === "numbered_list_item") {
    return `1. ${richTextToPlain(block.numbered_list_item.rich_text)}`;
  }

  if (type === "quote") {
    return `> ${richTextToPlain(block.quote.rich_text)}`;
  }

  if (type === "code") {
    const lang = block.code.language || "";
    const content = richTextToPlain(block.code.rich_text);
    return `\`\`\`${lang}\n${content}\n\`\`\``;
  }

  if (type === "divider") {
    return `---`;
  }

  if (type === "image") {
    context.imageIndex += 1;
    return imageBlockToMarkdown(block, context.meta, context.imageIndex);
  }

  return "";
}

function getProp(page, name) {
  return page.properties?.[name];
}

function extractPageMeta(page) {
  const titleProp = getProp(page, "Title");
  const slugProp = getProp(page, "Slug");
  const dateProp = getProp(page, "Date");
  const tagsProp = getProp(page, "Tags");
  const categoryProp = getProp(page, "Category");
  const summaryProp = getProp(page, "Summary");

  const title = titleProp?.title ? richTextToPlain(titleProp.title) : "Untitled";
  const slugRaw = slugProp?.rich_text ? richTextToPlain(slugProp.rich_text) : "";
  const slug = slugify(slugRaw || title);

  const rawDateStart = dateProp?.date?.start || "";
  const createdTime = page.created_time || new Date().toISOString();
  const dateOnly = formatDateOnly(rawDateStart) || getTodayDate();
  const hasExplicitTime = rawDateStart.includes("T");
  const dateTime = hasExplicitTime
    ? formatSeoulDateTime(rawDateStart)
    : `${dateOnly} ${formatSeoulDateTime(createdTime).slice(11)}`;
  const tags = Array.isArray(tagsProp?.multi_select)
    ? tagsProp.multi_select.map((t) => t.name)
    : [];
  const category = categoryProp?.select?.name || "";
  const summary = summaryProp?.rich_text ? richTextToPlain(summaryProp.rich_text) : "";

  return { title, slug, date: dateOnly, dateTime, tags, category, summary };
}

async function main() {
  const pages = await getAllPages();

  for (const page of pages) {
    const meta = extractPageMeta(page);
    const blocks = await getBlockChildren(page.id);
    const postImageDir = path.join(POST_IMAGES_DIR, meta.slug);
    const markdownParts = [];
    const context = {
      imageIndex: 0,
      meta,
    };

    fs.rmSync(postImageDir, { recursive: true, force: true });

    for (const block of blocks) {
      const markdown = await blockToMarkdown(block, context);
      if (markdown) {
        markdownParts.push(markdown);
      }
    }

    const markdownBody = markdownParts.join("\n\n");

    const frontMatterLines = [
      "---",
      `title: "${escapeYaml(meta.title)}"`,
      `date: ${meta.dateTime}`,
    ];

    if (meta.category) {
      frontMatterLines.push(`categories: [${meta.category}]`);
    }

    if (meta.tags.length) {
      frontMatterLines.push(`tags: [${meta.tags.join(", ")}]`);
    }

    if (meta.summary) {
      frontMatterLines.push(`description: "${escapeYaml(meta.summary)}"`);
    }

    frontMatterLines.push("---", "");

    const frontMatter = frontMatterLines.join("\n");

    const fileName = `${meta.date}-${meta.slug}.md`;
    const filePath = path.join(POSTS_DIR, fileName);
    fs.writeFileSync(filePath, `${frontMatter}${markdownBody}\n`, "utf8");

    console.log(`생성 완료: ${fileName}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
