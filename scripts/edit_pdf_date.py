#!/usr/bin/env python3
"""
Edita fechas en PDF — reemplaza 03/09/2026 -> 28/08/2026
Uso:
  python scripts/edit_pdf_date.py input.pdf output.pdf
  python scripts/edit_pdf_date.py input.pdf output.pdf --old 03/09/2026 --new 28/08/2026
  python scripts/edit_pdf_date.py input.pdf  # genera input_28-08-2026.pdf

Requiere: pip install pymupdf
  (pip install PyMuPDF)

Mantiene imágenes, QR y layout: busca ocurrencias de la fecha y
hace redact + reinserta texto con misma posición.
Funciona con PDFs de texto (como el SIAT R-1359). Si el PDF es
escaneado (solo imagen), no hay texto que reemplazar.
"""
import argparse
import sys
from pathlib import Path

def edit_pdf(input_path: Path, output_path: Path, old: str, new: str) -> int:
    try:
        import fitz  # pymupdf
    except ImportError:
        print("Falta dependencia: pip install pymupdf", file=sys.stderr)
        print("  pip install PyMuPDF", file=sys.stderr)
        sys.exit(1)

    if not input_path.exists():
        print(f"No existe: {input_path}", file=sys.stderr)
        sys.exit(2)

    doc = fitz.open(str(input_path))
    total = 0
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        # search_for es sensible a espacios; buscamos el literal
        instances = page.search_for(old)
        if not instances:
            # fallback: probar sin zero-padding? (3/9/2026) por si el PDF normaliza
            # y variante con guiones
            for alt in [old.lstrip("0"), old.replace("/", "-")]:
                if alt != old:
                    instances.extend(page.search_for(alt))
            if not instances:
                continue
        for rect in instances:
            total += 1
            fontsize = rect.height * 0.9
            if fontsize < 7:
                fontsize = 8
            if fontsize > 13:
                fontsize = 10
            # Usar redact con reemplazo directo — mantiene baseline y evita desfase
            # fill blanco tapa el viejo, text inserta el nuevo en el mismo rect
            page.add_redact_annot(
                rect,
                text=new,
                fontsize=fontsize,
                fontname="helv",
                text_color=(0, 0, 0),
                fill=(1, 1, 1),
                align=0,  # izquierda
            )
        if instances:
            page.apply_redactions(images=False, graphics=False)

    # Si no hubo coincidencias con search_for, intento de reemplazo por
    # reescritura de contenido (útil si texto está fragmentado en Tj)
    if total == 0:
        print(f"No se encontró '{old}' con search_for, intentando reemplazo incremental...")
        # Este fallback recorre bloques y reemplaza texto si contiene old
        # No es perfecto pero cubre PDFs con kerning raro.
        total_fallback = 0
        doc2 = fitz.open(str(input_path))
        for page in doc2:
            # usar get_text("dict") para spans
            d = page.get_text("dict")
            for block in d.get("blocks", []):
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        if old in span["text"]:
                            # reemplazo simple: crear nueva página no trivial,
                            # así que solo advertimos - el método redact ya cubrió la mayoría
                            total_fallback += 1
        if total_fallback:
            print(f"Se detectó texto fragmentado ({total_fallback} spans), pero search_for no lo capturó.")
            print("Tip: abre el PDF en editor y verifica que la fecha no esté como imagen.")
        else:
            print(f"ADVERTENCIA: no se encontró '{old}' en ningún texto del PDF. ¿Es un PDF escaneado?")

    doc.save(str(output_path), garbage=4, deflate=True)
    doc.close()
    print(f"OK: {total} ocurrencia(s) reemplazadas: '{old}' -> '{new}'")
    print(f"Entrada : {input_path}")
    print(f"Salida  : {output_path}")
    return total


def main():
    ap = argparse.ArgumentParser(description="Cambia fecha 03/09/2026 -> 28/08/2026 en PDF SIAT")
    ap.add_argument("input", nargs="?", help="PDF de entrada (ej. solicitud.pdf)")
    ap.add_argument("output", nargs="?", help="PDF de salida (ej. solicitud_editado.pdf)")
    ap.add_argument("--old", default="03/09/2026", help="fecha antigua (default 03/09/2026)")
    ap.add_argument("--new", default="28/08/2026", help="fecha nueva (default 28/08/2026)")
    args = ap.parse_args()

    if not args.input:
        ap.print_help()
        print("\nEjemplo:\n  python scripts/edit_pdf_date.py ./solicitud_9636.pdf ./solicitud_9636_28-08-2026.pdf\n", file=sys.stderr)
        sys.exit(1)

    inp = Path(args.input)
    out = Path(args.output) if args.output else inp.with_name(inp.stem + "_" + args.new.replace("/", "-") + ".pdf")

    edit_pdf(inp, out, args.old, args.new)


if __name__ == "__main__":
    main()
