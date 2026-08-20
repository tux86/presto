import { inflateSync } from "node:zlib";

/**
 * Pull the visible text out of a PDF.
 *
 * Enough to assert what a generated report actually says, without adding a
 * PDF-parsing dependency for the sake of tests. Content streams are Flate
 * compressed, and react-pdf writes text as hex strings inside `TJ` arrays.
 */
export function extractPdfText(pdf: Buffer): string {
  return flateStreams(pdf).map(textFromContentStream).join("\n");
}

/** Text-showing operators: `[…] TJ` and `… Tj`. Everything else is geometry. */
function textFromContentStream(content: string): string {
  const out: string[] = [];
  for (const match of content.matchAll(/(\[[^\]]*\]|<[0-9A-Fa-f\s]*>|\((?:\\.|[^\\()])*\))\s*T[Jj]/g)) {
    out.push(decodeStrings(match[1]!));
  }
  return out.join("");
}

function decodeStrings(operand: string): string {
  let text = "";
  for (const token of operand.matchAll(/<([0-9A-Fa-f\s]*)>|\(((?:\\.|[^\\()])*)\)/g)) {
    text += token[1] !== undefined ? decodeHex(token[1]) : unescapePdfString(token[2] ?? "");
  }
  return text;
}

/** PDF hex strings are byte sequences; standard fonts use WinAnsi, close enough to latin1. */
function decodeHex(hex: string): string {
  const clean = hex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 1 < clean.length; i += 2) {
    out += String.fromCharCode(Number.parseInt(clean.slice(i, i + 2), 16));
  }
  return out;
}

function unescapePdfString(raw: string): string {
  const simple: Record<string, string> = {
    n: "\n",
    r: "\r",
    t: "\t",
    b: "\b",
    f: "\f",
    "(": "(",
    ")": ")",
    "\\": "\\",
  };
  return raw.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, code: string) => {
    return simple[code] ?? String.fromCharCode(Number.parseInt(code, 8));
  });
}

/** Every FlateDecode stream in the file, inflated. Undecodable ones are skipped. */
function flateStreams(pdf: Buffer): string[] {
  const streams: string[] = [];
  const marker = Buffer.from("stream");
  const endMarker = Buffer.from("endstream");

  let index = 0;
  while (index < pdf.length) {
    const start = pdf.indexOf(marker, index);
    if (start === -1) break;

    // "endstream" also contains "stream" — skip those.
    if (pdf.subarray(Math.max(0, start - 3), start).toString("latin1") === "end") {
      index = start + marker.length;
      continue;
    }

    const end = pdf.indexOf(endMarker, start);
    if (end === -1) break;

    // Skip past "stream" and the EOL that must follow it.
    let from = start + marker.length;
    if (pdf[from] === 0x0d) from++;
    if (pdf[from] === 0x0a) from++;

    try {
      streams.push(inflateSync(pdf.subarray(from, end)).toString("latin1"));
    } catch {
      // Not Flate, or an object that merely looked like one.
    }
    index = end + endMarker.length;
  }

  return streams;
}
