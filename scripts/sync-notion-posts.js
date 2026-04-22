const fs = require("fs");
const path = require("path");
const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const POSTS_DIR = path.join(process.cwd(), "_posts");
const POST_IMAGES_DIR = path.join(process.cwd(), "assets", "img", "posts");

function normalizeCodeLanguage(language = "") {
  const normalized = String(language || "").trim().toLowerCase();

  const aliases = {
    "plain text": "plaintext",
    plain_text: "plaintext",
    text: "plaintext",
  };

  return aliases[normalized] || normalized.replace(/\s+/g, "-");
}

function getCodeFence(content = "") {
  const longestBacktickRun = Math.max(
    2,
    ...Array.from(String(content).matchAll(/`+/g), (match) => match[0].length)
  );

  return "`".repeat(longestBacktickRun + 1);
}

function codeBlockToMarkdown(language, content = "") {
  const lang = normalizeCodeLanguage(language);
  const body = redactSensitiveText(content);
  const fence = getCodeFence(body);
  const trailingNewline = body.endsWith("\n") ? "" : "\n";

  return `${fence}${lang}\n${body}${trailingNewline}${fence}`;
}

function richTextToPlain(richTextArray = []) {
  return richTextArray.map((item) => item.plain_text || "").join("");
}

function redactSensitiveText(value = "") {
  return String(value)
    .replace(/X-Amz-Credential=ASIA[A-Z0-9%/._+-]*/g, "X-Amz-Credential=REDACTED")
    .replace(/X-Amz-Security-Token=[^&\s)]+/g, "X-Amz-Security-Token=REDACTED")
    .replace(/X-Amz-Signature=[^&\s)]+/g, "X-Amz-Signature=REDACTED")
    .replace(/Authorization:\s*Bearer\s+[A-Za-z0-9._-]+/g, "Authorization: Bearer REDACTED")
    .replace(/(access_token|refresh_token|id_token|token|password)=([^&\s]+)/gi, "$1=REDACTED");
}

function isSignedAwsUrl(url = "") {
  return /[?&]X-Amz-(Credential|Security-Token|Signature)=/.test(String(url));
}

function escapeMarkdownTableCell(value = "") {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function richTextToMarkdown(richTextArray = []) {
  return richTextArray
    .map((item) => {
      let text = redactSensitiveText(item.plain_text || "");
      const annotations = item.annotations || {};

      if (!text) return "";

      if (annotations.code) {
        const tick = text.includes("`") ? "``" : "`";
        text = `${tick}${text}${tick}`;
      } else {
        if (annotations.bold) text = `**${text}**`;
        if (annotations.italic) text = `*${text}*`;
        if (annotations.strikethrough) text = `~~${text}~~`;
        if (annotations.underline) text = `<u>${text}</u>`;
      }

      const href = item.href || item.text?.link?.url;
      if (href) {
        text = isSignedAwsUrl(href) ? text : `[${text}](${redactSensitiveText(href)})`;
      }

      return text;
    })
    .join("")
    .replace(/\r?\n/g, "<br>\n")
    .replace(/^(<br>\n?)+/g, "")
    .replace(/^(<br>\n?)+$/g, "")
    .replace(/(<br>\n)+$/g, "");
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

function ensureOutputDirs() {
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  if (!fs.existsSync(POST_IMAGES_DIR)) {
    fs.mkdirSync(POST_IMAGES_DIR, { recursive: true });
  }
}

function parseFrontMatter(content) {
  const match = String(content || "").match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result = {};
  for (const line of match[1].split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");
    result[key] = value;
  }
  return result;
}

function getPostSlugFromFileName(fileName) {
  return String(fileName || "").replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
}

function getExistingNotionPosts() {
  const posts = new Map();
  const postFiles = fs.readdirSync(POSTS_DIR).filter((fileName) => fileName.endsWith(".md"));

  for (const fileName of postFiles) {
    const filePath = path.join(POSTS_DIR, fileName);
    const content = fs.readFileSync(filePath, "utf8");
    const frontMatter = parseFrontMatter(content);
    const notionPageId = frontMatter.notion_page_id;

    if (!notionPageId) continue;

    posts.set(notionPageId, {
      fileName,
      filePath,
      slug: getPostSlugFromFileName(fileName),
    });
  }

  return posts;
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
  const caption = richTextToMarkdown(image.caption);
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

    return mediaMarkdown(`/assets/img/posts/${meta.slug}/${fileName}`, alt, caption);
  } catch (error) {
    fs.rmSync(tempPath, { force: true });
    console.warn(`이미지 저장 실패 (${sourceUrl}): ${error.message}`);
    return mediaMarkdown(sourceUrl, alt, caption);
  }
}

function mediaMarkdown(url, alt, caption = "") {
  if (isSignedAwsUrl(url)) {
    return caption || "<!-- image omitted: signed URL redacted -->";
  }

  const markdown = `![${alt}](${url})`;
  if (!caption) return markdown;

  return `${markdown}\n\n<small>${caption}</small>`;
}

function getUrlFileName(url, fallback = "file") {
  try {
    return path.basename(new URL(url).pathname) || fallback;
  } catch (_error) {
    return fallback;
  }
}

function fileBlockToMarkdown(type, fileBlock) {
  const url = fileBlock.type === "external" ? fileBlock.external.url : fileBlock.file.url;
  const caption = richTextToMarkdown(fileBlock.caption);

  if (isSignedAwsUrl(url)) {
    return caption || "<!-- file omitted: signed URL redacted -->";
  }

  if (type === "video") {
    return `<video controls src="${redactSensitiveText(url)}"></video>${
      caption ? `\n\n<small>${caption}</small>` : ""
    }`;
  }

  if (type === "audio") {
    return `<audio controls src="${redactSensitiveText(url)}"></audio>${
      caption ? `\n\n<small>${caption}</small>` : ""
    }`;
  }

  const label = caption || getUrlFileName(url);
  return `[${label}](${redactSensitiveText(url)})`;
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

function indentMarkdown(markdown, depth = 1) {
  const indentation = "  ".repeat(depth);
  return String(markdown)
    .split("\n")
    .map((line) => `${indentation}${line}`)
    .join("\n");
}

function blockquoteMarkdown(markdown) {
  return String(markdown)
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
}

function joinMarkdownBlocks(parts) {
  const blocks = parts.filter(Boolean);

  return blocks
    .map((part, index) => {
      const previous = blocks[index - 1] || "";
      const currentIsList = /^(\s*)([-*+]|\d+\.) /.test(part);
      const previousIsList = /^(\s*)([-*+]|\d+\.) /.test(previous);
      const separator = index > 0 && currentIsList && previousIsList ? "\n" : "\n\n";

      return index === 0 ? part : `${separator}${part}`;
    })
    .join("");
}

function paragraphBlockToMarkdown(block) {
  if (block.type !== "paragraph") return "";
  const content = richTextToMarkdown(block.paragraph.rich_text).trim();
  return content.replace(/<br>|\s/g, "") ? content : "";
}

function hasVisibleMarkdown(content = "") {
  return String(content).replace(/<br>|\s/g, "") !== "";
}

async function getNestedMarkdown(block, context, options = {}) {
  if (!block.has_children) return "";

  const children = await getBlockChildren(block.id);
  if (options.compactParagraphs && children.every((child) => child.type === "paragraph")) {
    return children.map(paragraphBlockToMarkdown).filter(Boolean).join("<br>\n");
  }

  return blocksToMarkdown(children, context);
}

async function tableToMarkdown(block, context) {
  const rows = await getBlockChildren(block.id);
  const renderedRows = rows
    .filter((row) => row.type === "table_row")
    .map((row) =>
      row.table_row.cells.map((cell) => escapeMarkdownTableCell(richTextToMarkdown(cell)))
    );

  if (!renderedRows.length) return "";

  const width = Math.max(...renderedRows.map((row) => row.length));
  const normalizedRows = renderedRows.map((row) => {
    while (row.length < width) row.push("");
    return row;
  });
  const header = normalizedRows[0];
  const bodyRows = normalizedRows.slice(1);
  const separator = Array.from({ length: width }, () => "---");
  const rowsMarkdown = [header, separator, ...bodyRows].map((row) => `| ${row.join(" | ")} |`);
  const nested = await getNestedMarkdown(block, context);

  return nested ? `${rowsMarkdown.join("\n")}\n\n${nested}` : rowsMarkdown.join("\n");
}

async function blockToMarkdown(block, context) {
  const type = block.type;
  const value = block[type];

  if (!value) return "";

  if (type === "paragraph") {
    const content = richTextToMarkdown(value.rich_text).trim();
    const nested = await getNestedMarkdown(block, context);
    if (!hasVisibleMarkdown(content)) return nested;
    return nested ? joinMarkdownBlocks([content, nested]) : content;
  }

  if (/^heading_[1-6]$/.test(type)) {
    const level = Number(type.slice(-1));
    return `${"#".repeat(level)} ${richTextToMarkdown(value.rich_text)}`;
  }

  if (type === "bulleted_list_item" || type === "numbered_list_item") {
    const marker = type === "bulleted_list_item" ? "-" : "1.";
    const content = richTextToMarkdown(value.rich_text);
    const nested = await getNestedMarkdown(block, context, { compactParagraphs: true });
    return nested ? `${marker} ${content}\n${indentMarkdown(nested, 2)}` : `${marker} ${content}`;
  }

  if (type === "to_do") {
    const checked = value.checked ? "x" : " ";
    const content = richTextToMarkdown(value.rich_text);
    const nested = await getNestedMarkdown(block, context, { compactParagraphs: true });
    return nested ? `- [${checked}] ${content}\n${indentMarkdown(nested, 2)}` : `- [${checked}] ${content}`;
  }

  if (type === "quote") {
    const content = richTextToMarkdown(value.rich_text);
    const nested = await getNestedMarkdown(block, context);
    return blockquoteMarkdown(joinMarkdownBlocks([content, nested]));
  }

  if (type === "callout") {
    const icon = value.icon?.type === "emoji" ? `${value.icon.emoji} ` : "";
    const content = `${icon}${richTextToMarkdown(value.rich_text)}`;
    const nested = await getNestedMarkdown(block, context);
    return blockquoteMarkdown(joinMarkdownBlocks([content, nested]));
  }

  if (type === "toggle") {
    const summary = richTextToMarkdown(value.rich_text) || "Toggle";
    const nested = await getNestedMarkdown(block, context);
    return `<details>\n<summary>${summary}</summary>\n\n${nested}\n\n</details>`;
  }

  if (type === "code") {
    const content = richTextToPlain(value.rich_text);
    return codeBlockToMarkdown(value.language, content);
  }

  if (type === "divider") {
    return `---`;
  }

  if (type === "image") {
    context.imageIndex += 1;
    return imageBlockToMarkdown(block, context.meta, context.imageIndex);
  }

  if (type === "file" || type === "pdf" || type === "video" || type === "audio") {
    return fileBlockToMarkdown(type, value);
  }

  if (type === "bookmark" || type === "link_preview" || type === "embed") {
    const url = value.url;
    const caption = richTextToMarkdown(value.caption);
    return caption ? `[${caption}](${url})` : url;
  }

  if (type === "equation") {
    return `$$\n${value.expression}\n$$`;
  }

  if (type === "table") {
    return tableToMarkdown(block, context);
  }

  if (type === "table_of_contents") {
    return "* TOC\n{:toc}";
  }

  if (type === "column_list" || type === "column" || type === "synced_block" || type === "template") {
    return getNestedMarkdown(block, context);
  }

  if (type === "child_page") {
    return `## ${value.title}`;
  }

  if (type === "child_database") {
    return `## ${value.title}`;
  }

  return getNestedMarkdown(block, context);
}

async function blocksToMarkdown(blocks, context) {
  const markdownParts = [];

  for (const block of blocks) {
    const markdown = await blockToMarkdown(block, context);
    if (markdown) {
      markdownParts.push(markdown);
    }
  }

  return joinMarkdownBlocks(markdownParts);
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
  const dateOnly = formatDateOnly(rawDateStart) || getTodayDate();
  const tags = Array.isArray(tagsProp?.multi_select)
    ? tagsProp.multi_select.map((t) => t.name)
    : [];
  const category = categoryProp?.select?.name || "";
  const summary = summaryProp?.rich_text ? richTextToPlain(summaryProp.rich_text) : "";

  return { title, slug, date: dateOnly, tags, category, summary };
}

async function main() {
  if (!process.env.NOTION_TOKEN) {
    throw new Error("NOTION_TOKEN 이 없습니다.");
  }

  if (!DATABASE_ID) {
    throw new Error("NOTION_DATABASE_ID 가 없습니다.");
  }

  ensureOutputDirs();

  const pages = await getAllPages();
  const existingNotionPosts = getExistingNotionPosts();
  const activeNotionPageIds = new Set();
  const activeSlugs = new Set();

  for (const [pageIndex, page] of pages.entries()) {
    const meta = extractPageMeta(page);
    const blocks = await getBlockChildren(page.id);
    const postImageDir = path.join(POST_IMAGES_DIR, meta.slug);
    const context = {
      imageIndex: 0,
      meta,
    };
    activeNotionPageIds.add(page.id);
    activeSlugs.add(meta.slug);

    fs.rmSync(postImageDir, { recursive: true, force: true });

    const markdownBody = await blocksToMarkdown(blocks, context);

    const frontMatterLines = [
      "---",
      `title: "${escapeYaml(meta.title)}"`,
      `date: ${meta.date}`,
      `notion_page_id: "${page.id}"`,
      `notion_order: ${pageIndex + 1}`,
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
    const previousPost = existingNotionPosts.get(page.id);

    if (previousPost && previousPost.filePath !== filePath) {
      fs.rmSync(previousPost.filePath, { force: true });

      if (previousPost.slug !== meta.slug) {
        fs.rmSync(path.join(POST_IMAGES_DIR, previousPost.slug), { recursive: true, force: true });
      }
    }

    fs.writeFileSync(filePath, `${frontMatter}${markdownBody}\n`, "utf8");

    console.log(`생성 완료: ${fileName}`);
  }

  const postFiles = fs.readdirSync(POSTS_DIR).filter((fileName) => fileName.endsWith(".md"));

  for (const fileName of postFiles) {
    const filePath = path.join(POSTS_DIR, fileName);
    const content = fs.readFileSync(filePath, "utf8");
    const frontMatter = parseFrontMatter(content);
    const notionPageId = frontMatter.notion_page_id;

    if (!notionPageId) continue;
    if (activeNotionPageIds.has(notionPageId)) continue;

    fs.rmSync(filePath, { force: true });

    const slug = getPostSlugFromFileName(fileName);
    if (!activeSlugs.has(slug)) {
      fs.rmSync(path.join(POST_IMAGES_DIR, slug), { recursive: true, force: true });
    }

    console.log(`삭제 완료: ${fileName}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  codeBlockToMarkdown,
  getCodeFence,
  normalizeCodeLanguage,
};
