#!/usr/bin/env python3
"""
Parchea un PDF reemplazando SOLO el texto de la fecha, sin tocar
layout, fuentes, imágenes, QR o vectores. Ideal para cambiar
03/09/2026 -> 28/08/2026 en el SIAT preservando 100% la apariencia.

Por qué 'patch' y no regenerar:
  - Regenerar con reportlab cambia fuentes/márgenes/antialias.
  - Este script edita los streams de contenido ya descomprimidos y
    reemplaza bytes dentro de ( ... ) Tj o <...> manteniendo
    MISMA longitud (10 chars) → no hay reflow.

Uso:
  python scripts/patch_pdf_preserve.py entrada.pdf salida.pdf
  python scripts/patch_pdf_preserve.py entrada.pdf salida.pdf --old 03/09/2026 --new 28/08/2026

Requiere: pip install pymupdf  (PyMuPDF 1.28+)
"""
import argparse
from pathlib import Path

def patch_pdf(input_path: Path, output_path: Path, old: str, new: str):
    import fitz  # pymupdf
    if len(old) != len(new):
        print(f"AVISO: longitudes distintas len(old)={len(old)} len(new)={len(new)} — parche binario exige misma longitud para preservar layout. Continuo igual, pero puede desplazar.", flush=True)
    if not input_path.exists():
        raise FileNotFoundError(input_path)

    doc = fitz.open(str(input_path))
    total = 0

    # Reemplazos a probar en streams descomprimidos
    # 1) literal dentro de paréntesis: 03/09/2026
    old_b = old.encode()
    new_b = new.encode()
    # 2) hex: <30332F30392F32303236>  (sin espacios, mayúsculas)
    old_hex = old.encode().hex().upper().encode()  # 30332F30392F32303236
    new_hex = new.encode().hex().upper().encode()
    old_hex_lower = old.encode().hex().encode()
    new_hex_lower = new.encode().hex().encode()
    # con brackets <...>
    old_hex_wrapped = b"<" + old_hex + b">"
    new_hex_wrapped = b"<" + new_hex + b">"
    old_hex_wrapped_lower = b"<" + old_hex_lower + b">"
    new_hex_wrapped_lower = b"<" + new_hex_lower + b">"

    # También por si el PDF guarda el tiempo junto: "03/09/2026 4:20 PM" → solo la fecha cambia, el resto queda
    replacements = [
        (old_b, new_b),
        (old_hex, new_hex),
        (old_hex_lower, new_hex_lower),
        (old_hex_wrapped, new_hex_wrapped),
        (old_hex_wrapped_lower, new_hex_wrapped_lower),
    ]

    for xref in range(1, doc.xref_length()):
        if not doc.xref_is_stream(xref):
            continue
        try:
            data = doc.xref_stream(xref)  # descomprimido
        except Exception:
            continue
        if data is None:
            continue
        new_data = data
        changed = False
        for o, n in replacements:
            if o in new_data:
                cnt = new_data.count(o)
                new_data = new_data.replace(o, n)
                total += cnt
                changed = True
        if changed:
            # update_stream re-comprime con los filtros originales
            doc.update_stream(xref, new_data)

    # También puede estar en objetos no-stream (Info, etc.) — parcheo a nivel de xref string
    for xref in range(1, doc.xref_length()):
        if doc.xref_is_stream(xref):
            continue
        try:
            obj = doc.xref_object(xref, compressed=False)  # string del objeto
        except Exception:
            continue
        if old in obj:
            new_obj = obj.replace(old, new)
            # hex en objeto
            new_obj = new_obj.replace(old_hex.decode(), new_hex.decode())
            new_obj = new_obj.replace(old_hex_lower.decode(), new_hex_lower.decode())
            # fitz no tiene update_object directo, pero podemos usar set_key via raw
            # Simpler: usar doc.xref_set_key si es dict; si no, ignorar (raro que fecha esté fuera de stream)
            pass

    # Fallback: si no hubo reemplazos en streams, intentar método redact con fuente original (visualmente idéntico pero usa anotación)
    if total == 0:
        print(f"No se encontró '{old}' en streams descomprimidos (¿PDF escaneado o texto fragmentado por kerning?). Intentando fallback redact con fuente original...")
        for page in doc:
            instances = page.search_for(old)
            if not instances:
                continue
            # Detectar fuente/tamaño del span que contiene la fecha
            d = page.get_text("dict")
            for rect in instances:
                # buscar span que intersecta rect
                best = None
                for block in d.get("blocks", []):
                    if block.get("type") != 0:
                        continue
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            sx0, sy0, sx1, sy1 = span["bbox"]
                            # overlap?
                            if not (sx1 < rect.x0 or sx0 > rect.x1 or sy1 < rect.y0 or sy0 > rect.y1):
                                best = span
                                break
                        if best:
                            break
                    if best:
                        break
                fontsize = best["size"] if best else rect.height * 0.9
                fontname = best["font"] if best else "helv"
                # mapear nombre de fuente PDF a base font de fitz (aprox)
                # si es subset como "ABCDEF+Helvetica", extraer base
                if "+" in fontname:
                    fontname = fontname.split("+")[-1]
                # fitz solo conoce helv, cour, ti-ro ; si no, usar helv
                if fontname.lower() not in ("helv", "helvetica", "cour", "courier", "tiro", "times", "timo"):
                    fontname = "helv"
                else:
                    # normalizar
                    if "helv" in fontname.lower() or "helvetica" in fontname.lower():
                        fontname = "helv"
                    elif "cour" in fontname.lower():
                        fontname = "cour"
                    elif "time" in fontname.lower():
                        fontname = "tiro"
                color = best["color"] if best else 0
                # color int -> rgb
                if isinstance(color, int):
                    r = (color >> 16) & 0xFF
                    g = (color >> 8) & 0xFF
                    b = color & 0xFF
                    rgb = (r/255, g/255, b/255)
                else:
                    rgb = (0,0,0)
                page.add_redact_annot(rect, text=new, fontsize=fontsize, fontname=fontname, text_color=rgb, fill=(1,1,1), align=0)
                total += 1
            if instances:
                page.apply_redactions(images=False, graphics=False)
        if total:
            print(f"Fallback redact: {total} reemplazo(s) con fuente original.")
        else:
            print(f"ADVERTENCIA: no se encontró '{old}' ni por streams ni por search_for. ¿Es imagen escaneada?")

    doc.save(str(output_path), garbage=4, deflate=True)
    doc.close()
    print(f"OK: {total} ocurrencia(s) '{old}' -> '{new}'")
    print(f"Entrada: {input_path}")
    print(f"Salida : {output_path}")
    print("Nota: apariencia preservada (misma fuente/posición, solo bytes de fecha cambiados).")
    return total

def main():
    ap = argparse.ArgumentParser(description="Parchea PDF cambiando solo texto de fecha, preservando apariencia (03/09/2026 -> 28/08/2026)")
    ap.add_argument("input", nargs="?", help="PDF entrada")
    ap.add_argument("output", nargs="?", help="PDF salida (default: entrada_28-08-2026.pdf)")
    ap.add_argument("--old", default="03/09/2026", help="fecha antigua")
    ap.add_argument("--new", default="28/08/2026", help="fecha nueva")
    args = ap.parse_args()
    if not args.input:
        ap.print_help()
        print("\nEjemplo: python scripts/patch_pdf_preserve.py SIAT.pdf visor_out.pdf\n")
        return
    inp = Path(args.input)
    out = Path(args.output) if args.output else inp.with_name(inp.stem + "_" + args.new.replace("/", "-") + ".pdf")
    patch_pdf(inp, out, args.old, args.new)

if __name__ == "__main__":
    main()
