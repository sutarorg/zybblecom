// Syntax only: never fetch, resolve, store or approve a remote source here.
export const videoLinkLimit = 4096;
const pages: ReadonlyArray<[RegExp, RegExp]> = [
  [
    /^(?:www\.|m\.)?youtube\.com$/,
    /^\/(?:shorts\/[\w-]+|watch\?v=[\w-]+)(?:[?&]|$)/,
  ],
  [/^youtu\.be$/, /^\/[\w-]+(?:\?|$)/],
  [/^(?:www\.)?tiktok\.com$/, /^\/@[^/]+\/video\/\d+(?:\?|$)/],
  [/^(?:www\.)?twitch\.tv$/, /^\/(?:videos\/\d+|[^/]+\/clip\/[\w-]+)(?:\?|$)/],
  [/^clips\.twitch\.tv$/, /^\/[\w-]+(?:\?|$)/],
  [
    /^(?:www\.)?kick\.com$/,
    /^\/(?:video|clips)\/[\w-]+(?:\?|$)|^\/[^/]+\/(?:videos|clips)\/[\w-]+(?:\?|$)/,
  ],
  [/^(?:www\.)?(?:x|twitter)\.com$/, /^\/[^/]+\/status\/\d+(?:\?|$)/],
  [
    /^(?:www\.|m\.)?facebook\.com$/,
    /^\/(?:watch\/\?v=\d+|(?:reel|share\/v)\/[\w-]+|[^/]+\/videos\/\d+)\/?(?:[?&]|$)/,
  ],
  [/^fb\.watch$/, /^\/[\w-]+\/?(?:\?|$)/],
  [
    /^(?:www\.)?linkedin\.com$/,
    /^\/(?:posts\/[^/?]+|feed\/update\/urn:li:activity:\d+)\/?(?:\?|$)/,
  ],
  [/^(?:www\.)?loom\.com$/, /^\/share\/[\w-]+(?:\?|$)/],
  [/^(?:[\w-]+\.)?zoom\.us$/, /^\/rec\/(?:share|play)\/[^/?]+(?:\?|$)/],
  [/^drive\.google\.com$/, /^\/file\/d\/[\w-]+(?:\/view)?(?:\?|$)/],
  [/^(?:www\.)?dropbox\.com$/, /^\/(?:s|scl\/fi)\/[\w-]+\/[^/?]+(?:\?|$)/],
  [/^(?:www\.)?dailymotion\.com$/, /^\/video\/[\w-]+(?:\?|$)/],
  [/^dai\.ly$|^(?:www\.)?streamable\.com$/, /^\/[\w-]+(?:\?|$)/],
  [/^(?:share|video)\.vidyard\.com$/, /^\/(?:watch\/)?[\w-]+(?:\?|$)/],
  [
    /^(?:[\w-]+\.)?(?:wistia\.com|wistia\.net)$/,
    /^\/(?:medias|embed\/iframe)\/[\w-]+(?:\?|$)/,
  ],
];
export function supportedVideoLink(input: string) {
  if (input.length > videoLinkLimit || /[\s\\]/.test(input)) return false;
  try {
    const url = new URL(input);
    const host = url.hostname;
    if (
      url.protocol !== "https:" ||
      url.port ||
      url.username ||
      url.password ||
      !host.includes(".") ||
      /(?:^|\.)(?:localhost|local|internal)$|^\d+(?:\.\d+)+$/.test(host)
    )
      return false;
    if (
      pages.some(
        ([domain, path]) =>
          domain.test(host) && path.test(url.pathname + url.search),
      )
    )
      return true;
    return (
      !/(?:^|\.)(?:vimeo\.com|instagram\.com|rumble\.com|reddit\.com)$/.test(
        host,
      ) && /\.(mp4|mov|webm|mkv|m4v)$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}
