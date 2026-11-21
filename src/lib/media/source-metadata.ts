import {
  CustomSource,
  EncodedPacketSink,
  Input,
  MP4,
  QTFF,
  WEBM,
} from "mediabunny";
import { standardSourceSeconds } from "@/services/generation-schema";
import { sourceMime } from "./source-policy";

export class InvalidSourceError extends Error {}

/** Demux the actual private object. No native executables, browser metadata or full-file buffering. */
export async function probeSource(
  bytes: number,
  read: (start: number, end: number) => Promise<Uint8Array>,
) {
  let examined = 0,
    requests = 0;
  let readError: unknown;
  const input = new Input({
    formats: [MP4, QTFF, WEBM],
    source: new CustomSource({
      getSize: () => bytes,
      prefetchProfile: "network",
      maxCacheSize: 4 * 1024 * 1024,
      handleUnhandledError: () => {},
      read: async (start, end) => {
        examined += end - start;
        if (++requests > 160 || examined > 32 * 1024 * 1024)
          throw new InvalidSourceError();
        try {
          return await read(start, end);
        } catch (error) {
          readError = error;
          throw error;
        }
      },
    }),
  });
  try {
    const format = await input.getFormat();
    const mime =
      format === MP4
        ? sourceMime.mp4
        : format === QTFF
          ? sourceMime.mov
          : format === WEBM
            ? sourceMime.webm
            : null;
    const track = await input.getPrimaryVideoTrack();
    if (!mime || !track || !(await track.getCodec()))
      throw new InvalidSourceError();
    const sink = new EncodedPacketSink(track);
    const packet = await sink.getFirstPacket({ verifyKeyPackets: true });
    if (!packet?.data.length || packet.type !== "key")
      throw new InvalidSourceError();
    const tracks = await input.getTracks();
    if (tracks.length > 32) throw new InvalidSourceError();
    const [width, height, last, first, tail] = await Promise.all([
      track.getDisplayWidth(),
      track.getDisplayHeight(),
      input.computeDuration(tracks),
      input.getFirstTimestamp(tracks),
      sink.getPacket(Infinity),
    ]);
    if (!tail?.data.length) throw new InvalidSourceError();
    const duration = last - first;
    if (
      ![width, height].every(
        (value) => Number.isInteger(value) && value > 0 && value <= 8192,
      ) ||
      !(duration > 0 && duration <= standardSourceSeconds)
    )
      throw new InvalidSourceError();
    return { mime, width, height, duration };
  } catch {
    if (readError) throw readError;
    throw new InvalidSourceError();
  } finally {
    input.dispose();
  }
}
