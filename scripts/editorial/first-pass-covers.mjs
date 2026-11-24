import sharp from "sharp";

const width = 1200;
const height = 675;
const rect = (x, y, w, h, fill, radius = 18) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"/>`;
const circle = (x, y, r, fill) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const line = (path, color, w = 6) =>
  `<path d="${path}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const card = (x, y, w, h, fill) => rect(x, y, w, h, fill, 24);
const person = (x, y, color) =>
  `${circle(x, y, 23, color)}<path d="M${x - 47} ${y + 80}a47 47 0 0 1 94 0" fill="${color}"/>`;
const waveform = (x, y, color) =>
  Array.from({ length: 24 }, (_, i) => {
    const h = [18, 33, 51, 26, 12, 42, 65, 53, 22, 11, 32, 45][i % 12];
    return rect(x + 14 * i, y - h / 2, 7, h, color, 4);
  }).join("");
const grid = `<defs><linearGradient id="wash" x2="1" y2="1"><stop stop-color="#eee5ff"/><stop offset="1" stop-color="#fdeafa"/></linearGradient><pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="#7958b6" opacity=".23"/></pattern></defs>`;
const back =
  rect(0, 0, width, height, "url(#wash)", 0) +
  rect(0, 0, width, height, "url(#dots)", 0);
const comparison = [
  card(88, 222, 296, 222, "#2c2451"),
  waveform(112, 310, "#d9b6ff").replace(/width="7"/g, 'width="6"'),
  rect(90, 345, 294, 98, "#2c2451"),
  rect(116, 369, 174, 10, "#b9a8e1"),
  rect(116, 396, 135, 10, "#9688bc"),
  line("M386 333H478V176H561M478 333V471H561", "#7751ce", 8),
  circle(478, 333, 13, "#7751ce"),
  card(558, 90, 540, 179, "#fff"),
  ...[0, 1, 2].map((i) =>
    rect(
      595,
      138 + 33 * i,
      [387, 302, 424][i],
      15,
      ["#b398e7", "#dfc9fc", "#9572d6"][i],
      7,
    ),
  ),
  ...[0, 1, 2].map((i) => {
    const x = 563 + 183 * i;
    return (
      card(x, 340, 148, 231, ["#4d347c", "#623ea0", "#873a77"][i]) +
      person(x + 74, 419, "#e0bae9") +
      rect(x + 26, 510, 96, 10, "#fff")
    );
  }),
].join("");
const captions = [
  card(111, 75, 290, 520, "#2c2451"),
  rect(134, 98, 244, 468, "#ae8ceb", 24),
  circle(249, 260, 72, "#ead8ff"),
  '<path d="M141 468a110 110 0 0 1 220 0" fill="#ead8ff"/>',
  rect(159, 407, 194, 76, "#2c2451"),
  rect(181, 427, 150, 10, "#fff"),
  rect(200, 449, 112, 10, "#efd4fa"),
  card(510, 186, 583, 294, "#fff"),
  waveform(621, 294, "#8660cd"),
  line("M550 353H1053", "#d8c4f2", 3),
  rect(554, 375, 220, 55, "#e7d8fc", 8),
  rect(785, 375, 259, 55, "#f7d6ec", 8),
  line("M779 225V447", "#5730aa", 5),
  rect(581, 398, 157, 9, "#7957b6", 4),
  rect(809, 398, 199, 9, "#a8558f", 4),
].join("");
const framing = [
  card(80, 161, 477, 323, "#c5aaed"),
  person(187, 257, "#623a9f"),
  rect(317, 235, 200, 147, "#f7dcf5"),
  line("M344 269H467M344 305H446M344 341H489", "#ac6aa6", 9),
  '<rect x="234" y="165" width="177" height="315" rx="13" fill="none" stroke="#5730aa" stroke-width="6" stroke-dasharray="10 10"/>',
  line("M573 324H618m-14 -13 14 13-14 13", "#7751ce", 6),
  ...[0, 1, 2].map((i) => {
    const x = 639 + i * 166;
    return (
      card(x, 164, 150, 347, "#2c2451") +
      (i === 0
        ? rect(x + 12, 180, 126, 315, "#c5aaed") +
          rect(x + 67, 253, 71, 102, "#f7dcf5")
        : i === 1
          ? rect(x + 12, 180, 126, 315, "#c5aaed") +
            person(x + 75, 295, "#623a9f")
          : rect(x + 12, 304, 126, 71, "#c5aaed", 9) +
            circle(x + 37, 329, 9, "#623a9f") +
            rect(x + 68, 320, 55, 31, "#f7dcf5", 5))
    );
  }),
].join("");

const cells = (x, y, w, h) =>
  card(x, y, w, h, "#fff") +
  Array.from({ length: 4 }, (_, i) =>
    line(
      `M${x + 12} ${y + 16 + ((i + 1) * (h - 25)) / 5}H${x + w - 12}`,
      "#ccc0e7",
      2,
    ),
  ).join("") +
  line(
    `M${x + w * 0.37} ${y + 10}V${y + h - 10}M${x + w * 0.69} ${y + 10}V${y + h - 10}`,
    "#b7a4d9",
    2,
  ) +
  rect(x + w * 0.38, y + h * 0.53, w * 0.29, 8, "#a481e1", 2);
const production = [
  card(72, 164, 466, 345, "#292143"),
  cells(100, 198, 410, 268),
  line(
    "M538 337H600M600 337V159H674M600 337H674M600 337V526H674",
    "#7751ce",
    7,
  ),
  card(669, 66, 111, 196, "#7547bd"),
  cells(682, 113, 85, 64),
  card(668, 284, 304, 171, "#3d306b"),
  cells(699, 311, 242, 115),
  card(668, 472, 127, 127, "#873a77"),
  cells(684, 491, 95, 87),
  rect(810, 129, 245, 12, "#9f83d6", 6),
  rect(810, 158, 142, 12, "#c6b3e7", 6),
  rect(817, 514, 212, 12, "#c588bb", 6),
  rect(817, 544, 176, 12, "#e2b1d4", 6),
].join("");
const slate = [
  card(79, 149, 355, 370, "#2c2451"),
  rect(105, 175, 303, 318, "#f4edff"),
  line("M144 215H371V447H144V215M316 246V410M144 380H280", "#7a53c4", 5),
  rect(189, 263, 118, 53, "#bd9aeb", 6),
  circle(246, 343, 16, "#a86aa9"),
  line("M273 380H303v29", "#aa5f99", 5),
  ...["#7e4dd0", "#9b5aa4", "#493d95", "#8854af"].flatMap((color, row) =>
    Array.from({ length: 5 }, (_, col) => {
      const x = 477 + 127 * col,
        y = 132 + 111 * row;
      return (
        card(x, y, 113, 98, color) +
        rect(x + 17, y + 27, 74, 8, "#fff", 4) +
        rect(x + 17, y + 47, 55, 7, "#eddaff", 4)
      );
    }),
  ),
].join("");

for (const [slug, art] of Object.entries({
  "opusclip-vs-descript": comparison,
  "short-video-captions": captions,
  "vertical-video-framing": framing,
  "repurpose-youtube-video": production,
  "youtube-video-twenty-posts": slate,
})) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${grid}${back}${art}</svg>`;
  await sharp(Buffer.from(svg))
    .webp({ quality: 88 })
    .toFile(`public/images/blog/${slug}.webp`);
}
