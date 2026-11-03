"""Render API_REFERENCE.md to a dependency-free, printable PDF."""

from __future__ import annotations

import re
import sys
import textwrap
from pathlib import Path

PAGE_W, PAGE_H = 595.28, 841.89
LEFT, RIGHT, TOP, BOTTOM = 48, 48, 52, 48
BODY_W = PAGE_W - LEFT - RIGHT


def pdf_text(value: str) -> bytes:
    value = value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    return value.encode("cp1252", errors="replace")


def wrap(value: str, width: int) -> list[str]:
    return textwrap.wrap(
        value,
        width=width,
        break_long_words=True,
        break_on_hyphens=False,
        replace_whitespace=True,
    ) or [""]


def render_lines(markdown: str) -> list[tuple[str, str]]:
    rendered: list[tuple[str, str]] = []
    in_code = False
    for raw in markdown.splitlines():
        line = raw.rstrip()
        if line.startswith("```"):
            in_code = not in_code
            rendered.append(("gap", ""))
            continue
        if in_code:
            for part in wrap(line, 91):
                rendered.append(("code", part))
            continue
        if not line:
            rendered.append(("gap", ""))
            continue
        if re.fullmatch(r"\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?", line):
            continue
        if line.startswith("# "):
            rendered.append(("title", line[2:]))
            continue
        if line.startswith("## "):
            rendered.append(("h2", line[3:]))
            continue
        if line.startswith("### "):
            rendered.append(("h3", line[4:]))
            continue
        if line.startswith("| "):
            line = "  |  ".join(cell.strip() for cell in line.strip("|").split("|"))
        line = re.sub(r"\*\*(.*?)\*\*", r"\1", line)
        line = re.sub(r"`([^`]*)`", r"\1", line)
        line = line.replace("\\|", "|")
        if line.startswith("- "):
            line = "• " + line[2:]
        for part in wrap(line, 105):
            rendered.append(("body", part))
    return rendered


def make_pdf(lines: list[tuple[str, str]], output: Path) -> None:
    pages: list[list[tuple[str, str, float]]] = [[]]
    y = PAGE_H - TOP
    for style, text in lines:
        size, leading = {
            "title": (20, 27),
            "h2": (14, 20),
            "h3": (11, 16),
            "body": (8.5, 12),
            "code": (8, 11),
            "gap": (1, 7),
        }[style]
        if y - leading < BOTTOM + 20:
            pages.append([])
            y = PAGE_H - TOP
        pages[-1].append((style, text, y))
        y -= leading

    objects: list[bytes] = []

    def add_object(data: bytes) -> int:
        objects.append(data)
        return len(objects)

    catalog_id = add_object(b"")
    pages_id = add_object(b"")
    regular_id = add_object(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    )
    bold_id = add_object(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    )
    code_id = add_object(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>"
    )

    page_ids: list[int] = []
    for page_number, page in enumerate(pages, 1):
        stream = bytearray()
        for style, text, y in page:
            if style == "gap":
                continue
            if style == "code":
                stream.extend(
                    f"0.95 0.96 0.97 rg {LEFT - 4:.2f} {y - 3:.2f} {BODY_W + 8:.2f} 12 re f\n".encode()
                )
                font, size, x = "F3", 8, LEFT + 4
            elif style == "title":
                font, size, x = "F2", 20, LEFT
            elif style in ("h2", "h3"):
                font, size, x = "F2", (14 if style == "h2" else 11), LEFT
                stream.extend(
                    f"0.12 0.32 0.52 rg {LEFT:.2f} {y - 2:.2f} 2 14 re f\n".encode()
                )
                x += 8
            else:
                font, size, x = "F1", 8.5, LEFT
            stream.extend(
                f"BT /{font} {size} Tf 0.12 0.15 0.19 rg {x:.2f} {y:.2f} Td (".encode()
                + pdf_text(text)
                + b") Tj ET\n"
            )
        stream.extend(
            f"BT /F1 8 Tf 0.4 0.4 0.4 rg {LEFT} 25 Td (SchoolERP API Reference  |  Page {page_number} of {len(pages)}) Tj ET\n".encode()
        )
        content_id = add_object(
            b"<< /Length "
            + str(len(stream)).encode()
            + b" >>\nstream\n"
            + bytes(stream)
            + b"endstream"
        )
        page_id = add_object(
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {PAGE_W:.2f} {PAGE_H:.2f}] /Resources << /Font << /F1 {regular_id} 0 R /F2 {bold_id} 0 R /F3 {code_id} 0 R >> >> /Contents {content_id} 0 R >>".encode()
        )
        page_ids.append(page_id)

    objects[catalog_id - 1] = f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode()
    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[pages_id - 1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode()

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for object_number, data in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{object_number} 0 obj\n".encode() + data + b"\nendobj\n")
    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode()
    )
    output.write_bytes(pdf)


def main() -> None:
    root = Path(__file__).resolve().parent
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "API_REFERENCE.md"
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "API_REFERENCE.pdf"
    make_pdf(render_lines(source.read_text(encoding="utf-8")), output)
    print(f"Created {output}")


if __name__ == "__main__":
    main()
