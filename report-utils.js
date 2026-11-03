(function createReportUtils(global) {
  "use strict";

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function concatBytes(...parts) {
    const arrays = parts.map((part) => (part instanceof Uint8Array ? part : encoder.encode(String(part))));
    const result = new Uint8Array(arrays.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    arrays.forEach((part) => {
      result.set(part, offset);
      offset += part.length;
    });
    return result;
  }

  function dataUrlBytes(dataUrl) {
    const binary = atob(String(dataUrl).split(",")[1]);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  function wrapText(context, text, maxWidth) {
    const lines = [];
    String(text || "")
      .split(/\r?\n/)
      .forEach((paragraph) => {
        if (!paragraph) {
          lines.push("");
          return;
        }
        let current = "";
        for (const character of paragraph) {
          const candidate = current + character;
          if (current && context.measureText(candidate).width > maxWidth) {
            lines.push(current);
            current = character;
          } else {
            current = candidate;
          }
        }
        if (current) lines.push(current);
      });
    return lines;
  }

  function renderReportPages(report) {
    const width = 1240;
    const height = 1754;
    const margin = 88;
    const bottom = height - 92;
    const pages = [];
    let canvas;
    let context;
    let y;

    function newPage() {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.textBaseline = "top";
      y = 78;
      pages.push(canvas);
    }

    function ensure(space) {
      if (y + space <= bottom) return;
      footer();
      newPage();
    }

    function footer() {
      context.strokeStyle = "#d9e4e2";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(margin, height - 70);
      context.lineTo(width - margin, height - 70);
      context.stroke();
      context.fillStyle = "#788684";
      context.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(`命理咨询工作台 · 第 ${pages.length} 页`, margin, height - 55);
    }

    function line(text, options = {}) {
      const size = options.size || 30;
      const lineHeight = options.lineHeight || Math.round(size * 1.65);
      const weight = options.weight || 400;
      context.font = `${weight} ${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      const lines = wrapText(context, text, width - margin * 2 - (options.indent || 0));
      ensure(Math.max(lineHeight, lines.length * lineHeight) + (options.after || 0));
      context.fillStyle = options.color || "#344441";
      lines.forEach((value) => {
        context.fillText(value, margin + (options.indent || 0), y);
        y += lineHeight;
      });
      y += options.after || 0;
    }

    function heading(text) {
      ensure(80);
      y += 18;
      context.fillStyle = "#23766f";
      context.fillRect(margin, y + 5, 8, 42);
      line(text, { size: 34, lineHeight: 52, weight: 700, indent: 24, color: "#1e2928", after: 12 });
    }

    newPage();
    line("命理分析报告", { size: 54, lineHeight: 72, weight: 700, color: "#175c56", after: 14 });
    line(report.identityLine, { size: 30, lineHeight: 48, weight: 600, after: 4 });
    line(`更新时间：${report.updatedAtLabel}`, { size: 24, lineHeight: 38, color: "#788684", after: 24 });
    context.strokeStyle = "#8fbcb7";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(margin, y);
    context.lineTo(width - margin, y);
    context.stroke();
    y += 28;

    report.sections.forEach((section) => {
      heading(section.title);
      if (!section.items?.length) {
        line("暂无内容", { color: "#788684", after: 6 });
        return;
      }
      section.items.forEach((item) => {
        if (item.label) line(item.label, { size: 28, lineHeight: 44, weight: 700, color: "#324946", after: 2 });
        line(item.text, { size: 27, lineHeight: 45, indent: item.bullet ? 24 : 0, after: 9 });
        if (item.factRefs?.length) {
          line(`依据：${item.factRefs.join("、")}`, { size: 22, lineHeight: 36, color: "#788684", indent: 24, after: 5 });
        }
      });
    });
    footer();
    return pages;
  }

  function buildImagePdf(images) {
    const objects = new Map();
    const pageIds = [];
    let nextId = 3;
    images.forEach((image) => {
      const pageId = nextId++;
      const imageId = nextId++;
      const contentId = nextId++;
      pageIds.push(pageId);
      objects.set(
        imageId,
        concatBytes(
          `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
          image.bytes,
          "\nendstream",
        ),
      );
      const content = encoder.encode("q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n");
      objects.set(contentId, concatBytes(`<< /Length ${content.length} >>\nstream\n`, content, "endstream"));
      objects.set(
        pageId,
        encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`),
      );
    });
    objects.set(1, encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));
    objects.set(2, encoder.encode(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`));

    const header = concatBytes("%PDF-1.4\n%", new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3]), "\n");
    const chunks = [header];
    const offsets = [0];
    let offset = header.length;
    for (let id = 1; id < nextId; id += 1) {
      offsets[id] = offset;
      const object = concatBytes(`${id} 0 obj\n`, objects.get(id), "\nendobj\n");
      chunks.push(object);
      offset += object.length;
    }
    const xrefOffset = offset;
    const xref = ["xref", `0 ${nextId}`, "0000000000 65535 f "];
    for (let id = 1; id < nextId; id += 1) xref.push(`${String(offsets[id]).padStart(10, "0")} 00000 n `);
    chunks.push(
      encoder.encode(`${xref.join("\n")}\ntrailer\n<< /Size ${nextId} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`),
    );
    return concatBytes(...chunks);
  }

  async function generateReportPdf(report) {
    const canvases = renderReportPages(report);
    const images = canvases.map((canvas) => ({
      width: canvas.width,
      height: canvas.height,
      bytes: dataUrlBytes(canvas.toDataURL("image/jpeg", 0.9)),
    }));
    return buildImagePdf(images);
  }

  const crcTable = new Uint32Array(256).map((_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function littleEndian(size, ...values) {
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let offset = 0;
    values.forEach(([method, value]) => {
      view[method](offset, value, true);
      offset += Number(method.replace(/\D/g, "")) / 8;
    });
    return new Uint8Array(buffer);
  }

  function createZip(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;
    entries.forEach((entry) => {
      const name = encoder.encode(entry.name);
      const data = entry.data instanceof Uint8Array ? entry.data : encoder.encode(String(entry.data));
      const crc = crc32(data);
      const localHeader = littleEndian(
        30,
        ["setUint32", 0x04034b50], ["setUint16", 20], ["setUint16", 0x0800], ["setUint16", 0],
        ["setUint16", 0], ["setUint16", 0], ["setUint32", crc], ["setUint32", data.length],
        ["setUint32", data.length], ["setUint16", name.length], ["setUint16", 0],
      );
      const local = concatBytes(localHeader, name, data);
      locals.push(local);
      const centralHeader = littleEndian(
        46,
        ["setUint32", 0x02014b50], ["setUint16", 20], ["setUint16", 20], ["setUint16", 0x0800],
        ["setUint16", 0], ["setUint16", 0], ["setUint16", 0], ["setUint32", crc],
        ["setUint32", data.length], ["setUint32", data.length], ["setUint16", name.length],
        ["setUint16", 0], ["setUint16", 0], ["setUint16", 0], ["setUint16", 0],
        ["setUint32", 0], ["setUint32", offset],
      );
      const central = concatBytes(centralHeader, name);
      centrals.push(central);
      offset += local.length;
    });
    const centralBytes = concatBytes(...centrals);
    const end = littleEndian(
      22,
      ["setUint32", 0x06054b50], ["setUint16", 0], ["setUint16", 0], ["setUint16", entries.length],
      ["setUint16", entries.length], ["setUint32", centralBytes.length], ["setUint32", offset], ["setUint16", 0],
    );
    return concatBytes(...locals, centralBytes, end);
  }

  function readZip(bytes) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const entries = new Map();
    let offset = 0;
    while (offset + 30 <= data.length && view.getUint32(offset, true) === 0x04034b50) {
      const flags = view.getUint16(offset + 6, true);
      const method = view.getUint16(offset + 8, true);
      const expectedCrc = view.getUint32(offset + 14, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const uncompressedSize = view.getUint32(offset + 22, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      if (flags & 0x08 || method !== 0 || compressedSize !== uncompressedSize) throw new Error("不支持的 ZIP 压缩方式");
      const nameStart = offset + 30;
      const name = decoder.decode(data.slice(nameStart, nameStart + nameLength));
      const dataStart = nameStart + nameLength + extraLength;
      const entryData = data.slice(dataStart, dataStart + uncompressedSize);
      if (entryData.length !== uncompressedSize || crc32(entryData) !== expectedCrc) throw new Error("ZIP 文件校验失败");
      entries.set(name, entryData);
      offset = dataStart + compressedSize;
    }
    if (!entries.size) throw new Error("没有找到可恢复的数据");
    return entries;
  }

  async function sha256Hex(value) {
    const bytes = value instanceof Uint8Array ? value : encoder.encode(String(value));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function downloadBytes(bytes, filename, type) {
    const blob = new Blob([bytes], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  global.MingliReportUtils = Object.freeze({
    generateReportPdf,
    createZip,
    readZip,
    sha256Hex,
    downloadBytes,
    concatBytes,
    encoder,
    decoder,
  });
})(window);
