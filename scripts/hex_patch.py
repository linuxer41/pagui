#!/usr/bin/env python3
"""
Parche binario a nivel HEX - sin editor hexadecimal, sin librería PDF de alto nivel para layout.
Reemplaza bytes literales y hex-wrapped manteniendo MISMA longitud (10 -> 10).

Uso QDF (PDF descomprimido):
  qpdf --qdf --object-streams=disable SIAT_9636_original.pdf SIAT_qdf.pdf
  python scripts/hex_patch.py SIAT_qdf.pdf visor_out.pdf --old 03/09/2026 --new 28/08/2026

Uso directo si el PDF ya no está comprimido (generado con reportlab sin deflate):
  python scripts/hex_patch.py SIAT_9636_original.pdf visor_out.pdf

También maneja streams comprimidos si se usa el modo 'stream' (usa pymupdf solo para descomprimir):
  python scripts/hex_patch.py --stream SIAT_9636_original.pdf visor_out.pdf
"""
import argparse
from pathlib import Path

def hex_patch_file(inp: Path, out: Path, old: str, new: str, stream_mode=False):
    if len(old) != len(new):
        raise ValueError(f"longitudes distintas {len(old)} != {len(new)} — debe ser igual para parche in-place")
    old_b = old.encode()
    new_b = new.encode()
    old_hex = old.encode().hex().upper().encode()  # 30332F...
    new_hex = new.encode().hex().upper().encode()
    old_hex_low = old.encode().hex().encode()
    new_hex_low = new.encode().hex().encode()
    # con < >
    pairs = [
        (old_b, new_b),
        (b"<" + old_hex + b">", b"<" + new_hex + b">"),
        (b"<" + old_hex_low + b">", b"<" + new_hex_low + b">"),
        (old_hex, new_hex),
        (old_hex_low, new_hex_low),
    ]

    if not stream_mode:
        # Puro binario a nivel archivo — equivale a HxD
        data = inp.read_bytes()
        total = 0
        for o, n in pairs:
            if o in data:
                c = data.count(o)
                data = data.replace(o, n)
                total += c
                print(f"  hex: {o[:30]!r} -> {n[:30]!r} : {c}")
        if total == 0:
            print(f"AVISO: no se encontró '{old}' en binario raw. ¿PDF comprimido? Usa --stream o descomprime a QDF con: qpdf --qdf --object-streams=disable {inp} qdf.pdf")
        else:
            print(f"OK binario: {total} reemplazo(s) '{old}' -> '{new}' (hex level, sin tocar offsets)")
        out.write_bytes(data)
        return total
    else:
        # Nivel stream descomprimido (descomprime con pymupdf, parchea, recomprime)
        import fitz
        doc = fitz.open(str(inp))
        total = 0
        for xref in range(1, doc.xref_length()):
            if not doc.xref_is_stream(xref):
                continue
            try:
                data = doc.xref_stream(xref)
            except:
                continue
            if data is None:
                continue
            nd = data
            ch = False
            for o, n in pairs:
                if o in nd:
                    c = nd.count(o)
                    nd = nd.replace(o, n)
                    total += c
                    ch = True
            if ch:
                doc.update_stream(xref, nd)
        doc.save(str(out), garbage=4, deflate=True)
        print(f"OK stream: {total} reemplazo(s) en streams descomprimidos")
        return total

def main():
    ap = argparse.ArgumentParser(description="Parche HEX binario 03/09/2026 -> 28/08/2026 (misma longitud, sin editor)")
    ap.add_argument("input", nargs="?", help="PDF entrada")
    ap.add_argument("output", nargs="?", help="PDF salida")
    ap.add_argument("--old", default="03/09/2026")
    ap.add_argument("--new", default="28/08/2026")
    ap.add_argument("--stream", action="store_true", help="parchea streams descomprimidos (para PDFs comprimidos)")
    args = ap.parse_args()
    if not args.input:
        ap.print_help()
        print("\nEjemplos:\n  python scripts/hex_patch.py SIAT_qdf.pdf visor_out.pdf\n  python scripts/hex_patch.py --stream SIAT_9636_original.pdf visor_out.pdf\n")
        return
    inp = Path(args.input)
    out = Path(args.output) if args.output else inp.with_name(inp.stem + "_" + args.new.replace("/","-") + ".pdf")
    hex_patch_file(inp, out, args.old, args.new, stream_mode=args.stream)

if __name__ == "__main__":
    main()
