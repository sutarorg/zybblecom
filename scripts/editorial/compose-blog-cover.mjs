import { readFile } from "node:fs/promises";
import sharp from "sharp";

const W = 1200;
const H = 675;
const gutter = 65;
const headlineWidth = 530;
const ink = "#17182C";
const paper = "#FFFFFF";
const lavender = "#EEE7FF";

const svg = (width, height, body) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
  );
const xml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

async function text(value, size, color) {
  return sharp({
    text: {
      text: `<span foreground="${color}">${xml(value)}</span>`,
      font: `DejaVu Sans Bold ${size}`,
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
}

/** Renders exact text and separately sourced, unaltered-aspect-ratio marks. */
export async function composeBlogCover({
  illustration,
  output,
  lines,
  marks = [],
}) {
  const plate = await sharp(illustration)
    .resize(W, H, { fit: "cover" })
    .png()
    .toBuffer();
  const logo = await sharp(await readFile("public/icon.svg"))
    .resize(47, 47)
    .png()
    .toBuffer();
  const identity = await text("ZYBBLE JOURNAL", 23, lavender);
  const layers = [
    {
      input: svg(
        W,
        H,
        `<defs><linearGradient id="shade"><stop stop-color="${ink}" offset="0"/><stop stop-color="${ink}" offset=".43"/><stop stop-color="${ink}" stop-opacity=".93" offset=".48"/><stop stop-color="${ink}" stop-opacity=".38" offset=".55"/><stop stop-color="${ink}" stop-opacity="0" offset=".64"/></linearGradient></defs><rect width="1200" height="675" fill="url(#shade)"/><rect x="65" y="139" width="66" height="5" rx="2.5" fill="#E65EBB"/>`,
      ),
    },
    { input: logo, top: 58, left: gutter },
    { input: identity.data, top: 73, left: 127 },
  ];
  let title;
  for (let point = lines.length < 3 ? 94 : 78; point >= 48; point -= 1) {
    title = await Promise.all(
      lines.map((line, i) => text(line, point, i === 0 ? paper : lavender)),
    );
    if (title.every(({ info }) => info.width <= headlineWidth)) break;
  }
  if (title.some(({ info }) => info.width > headlineWidth))
    throw new Error(`Headline exceeds cover grid: ${lines.join(" ")}`);
  const gap = 20;
  const totalHeight =
    title.reduce((sum, { info }) => sum + info.height, 0) +
    gap * (title.length - 1);
  if (totalHeight > 290)
    throw new Error(
      `Headline is taller than the reserved grid: ${lines.join(" ")}`,
    );
  let top = Math.round(329 - totalHeight / 2);
  for (const { data, info } of title) {
    layers.push({ input: data, top, left: gutter });
    top += info.height + gap;
  }
  let left = gutter;
  for (const mark of marks) {
    const tileW = mark.width ?? 145;
    const tileH = 67;
    const tileTop = 526;
    if (left + tileW > gutter + headlineWidth)
      throw new Error("Brand marks exceed cover grid");
    const background = mark.dark ? "#282338" : "#FFFEFB";
    layers.push({
      input: svg(
        tileW,
        tileH,
        `<rect x=".5" y=".5" width="${tileW - 1}" height="${tileH - 1}" rx="13" fill="${background}" stroke="${mark.dark ? "#52456F" : "#FFF"}"/>`,
      ),
      top: tileTop,
      left,
    });
    const item = mark.path
      ? await sharp(mark.path)
          .trim({ threshold: 15 })
          .resize(tileW - 30, tileH - 26, { fit: "inside" })
          .png()
          .toBuffer({ resolveWithObject: true })
      : await text(mark.label, 21, ink);
    if (item.info.width > tileW - 12)
      throw new Error(`Mark too wide: ${mark.label}`);
    layers.push({
      input: item.data,
      top: tileTop + Math.round((tileH - item.info.height) / 2),
      left: left + Math.round((tileW - item.info.width) / 2),
    });
    left += tileW + 12;
  }
  return sharp(plate)
    .composite(layers)
    .webp({ quality: 87, effort: 6 })
    .toFile(output);
}
