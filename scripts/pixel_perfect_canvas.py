#!/usr/bin/env python3
# Pixel-perfect SIAT - canvas absoluto, medidas tomadas de la imagen original
# Genera visor_out_pixel_perfect.pdf con 28/08/2026
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
import qrcode, io, os

W, H = A4
OUT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "visor_out_pixel_perfect.pdf")
OUT2 = r"C:\Users\linuxer\Downloads\visor_out.pdf"

BLUE = HexColor("#1E5A96")
BLUE_DARK = HexColor("#0F3A6B")
GRAY_HEAD = HexColor("#E2E2E2")
GRAY_BORDER = HexColor("#9A9A9A")
GRAY_LIGHT = HexColor("#F2F2F2")
FOOTER_DARK = HexColor("#10406B")
FOOTER_LIGHT = HexColor("#1E9AC4")

def qr_buf(data="7474483013|9636|28/08/2026"):
    qr = qrcode.QRCode(version=2, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=0)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

def draw_header(c):
    # SIAT logo texto
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(15*mm, H-18*mm, "siat")
    c.setFont("Helvetica", 6)
    c.setFillColor(HexColor("#1E5A96"))
    # red de puntos simulada
    c.setFont("Helvetica", 4)
    c.drawString(32*mm, H-15*mm, "◉ ◉ ◉")
    c.setFont("Helvetica-Bold", 6)
    c.setFillColor(BLUE_DARK)
    c.drawString(15*mm, H-22*mm, "IMPUESTOS NACIONALES")
    # bandera mini
    c.setFillColor(HexColor("#FF0000")); c.rect(62*mm, H-22*mm, 3*mm, 1.5*mm, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFD700")); c.rect(65*mm, H-22*mm, 3*mm, 1.5*mm, fill=1, stroke=0)
    c.setFillColor(HexColor("#00A651")); c.rect(68*mm, H-22*mm, 3*mm, 1.5*mm, fill=1, stroke=0)

    # derecha IMPUESTOS NACIONALES
    c.setFillColor(BLUE_DARK)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(W-15*mm-8*mm, H-18*mm, "IMPUESTOS NACIONALES")
    # icono i
    c.setFillColor(BLUE_DARK)
    c.roundRect(W-15*mm-7*mm, H-20*mm, 7*mm, 7*mm, 1*mm, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(W-15*mm-3.5*mm, H-15.5*mm, "i")

def draw_footer(c):
    y = 12*mm
    c.setFillColor(FOOTER_DARK)
    c.rect(0, 0, W, 14*mm, fill=1, stroke=0)
    # diagonal light
    c.setFillColor(FOOTER_LIGHT)
    p = c.beginPath()
    p.moveTo(W*0.35, 0); p.lineTo(W*0.45, 14*mm); p.lineTo(W, 14*mm); p.lineTo(W, 0); p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(15*mm, 9*mm, "Sumamos")
    c.setFont("Helvetica", 5)
    c.drawString(15*mm, 6*mm, "calidad a nuestros servicios  ISO 9001:2015")
    c.setFont("Helvetica", 6)
    c.drawRightString(W-15*mm, 9*mm, "Línea gratuita: 800-10-3444")
    c.drawRightString(W-15*mm, 6*mm, "www.impuestos.gob.bo")
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(16*mm, 10.2*mm, "✓")
    c.setFillColor(FOOTER_DARK)
    c.setFont("Helvetica", 4)
    c.drawString(15*mm, 3*mm, "")

c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("SIAT 9636 - 28/08/2026")

# ===== PAGINA 1 =====
draw_header(c)

# Fecha reporte / usuario / N solicitud
c.setFillColor(HexColor("#000000"))
c.setFont("Helvetica-Bold", 6)
c.drawString(15*mm, H-32*mm, "Fecha de reporte:")
c.setFont("Helvetica", 6)
c.drawString(35*mm, H-32*mm, "28/08/2026 4:20 PM")
c.setFont("Helvetica-Bold", 6)
c.drawString(15*mm, H-37*mm, "Usuario:")
c.setFont("Helvetica", 6)
c.drawString(35*mm, H-37*mm, "linuxer41@gmail.com")
# N solicitud box
c.setFillColor(GRAY_HEAD)
c.rect(W-15*mm-45*mm, H-38*mm, 45*mm, 8*mm, fill=1, stroke=0)
c.setFillColor(HexColor("#000000"))
c.setStrokeColor(GRAY_BORDER)
c.rect(W-15*mm-45*mm, H-38*mm, 45*mm, 8*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 7)
c.drawString(W-15*mm-42*mm, H-33.5*mm, "Nº SOLICITUD")
c.setFont("Helvetica", 7)
c.drawString(W-15*mm-12*mm, H-33.5*mm, "9636")

# titulo
c.setFont("Helvetica-Bold", 10)
c.setFillColor(HexColor("#000000"))
c.drawCentredString(W/2, H-50*mm, "SOLICITUD DE AUTORIZACIÓN")
c.drawCentredString(W/2, H-55*mm, "DE SISTEMAS INFORMÁTICOS DE FACTURACIÓN")
c.setFont("Helvetica", 6)
c.drawCentredString(W/2, H-59*mm, "R-1359 -01")

# DATOS BASICOS
y = H-70*mm
c.setFillColor(GRAY_HEAD)
c.rect(15*mm, y, 125*mm, 6*mm, fill=1, stroke=0)
c.setStrokeColor(GRAY_BORDER)
c.rect(15*mm, y, 125*mm, 6*mm, fill=0, stroke=1)
c.setFillColor(HexColor("#000000"))
c.setFont("Helvetica-Bold", 7)
c.drawCentredString(15*mm+125*mm/2, y+2*mm, "DATOS BÁSICOS DEL CONTRIBUYENTE")
# NIT
c.rect(15*mm, y-6*mm, 40*mm, 6*mm, fill=0, stroke=1)
c.rect(55*mm, y-6*mm, 85*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 6)
c.drawString(16*mm, y-4*mm, "NIT")
c.setFont("Helvetica", 6)
c.drawString(56*mm, y-4*mm, "7474483013")
# RAZON
c.rect(15*mm, y-12*mm, 40*mm, 6*mm, fill=0, stroke=1)
c.rect(55*mm, y-12*mm, 85*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 6)
c.drawString(16*mm, y-10*mm, "RAZÓN SOCIAL")
c.setFont("Helvetica", 6)
c.drawString(56*mm, y-10*mm, "FRANCISCO OCHOA GONZALES")
# DEPENDENCIA
c.rect(15*mm, y-18*mm, 40*mm, 6*mm, fill=0, stroke=1)
c.rect(55*mm, y-18*mm, 85*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 6)
c.drawString(16*mm, y-16*mm, "DEPENDENCIA")
c.setFont("Helvetica", 6)
c.drawString(56*mm, y-16*mm, "GERENCIA DISTRITAL CHUQUISACA")
# QR
from reportlab.lib.utils import ImageReader
buf = qr_buf()
qr = ImageReader(buf)
c.drawImage(qr, W-15*mm-28*mm, y-18*mm, width=28*mm, height=28*mm)

# DATOS DE LA SOLICITUD
y = H-100*mm
c.setFillColor(GRAY_HEAD)
c.rect(15*mm, y, W-30*mm, 6*mm, fill=1, stroke=0)
c.setStrokeColor(GRAY_BORDER)
c.rect(15*mm, y, W-30*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 7)
c.drawCentredString(W/2, y+2*mm, "DATOS DE LA SOLICITUD")
# FECHA (28/08/2026)
c.rect(15*mm, y-6*mm, 30*mm, 6*mm, fill=0, stroke=1)
c.rect(45*mm, y-6*mm, 45*mm, 6*mm, fill=0, stroke=1)
c.rect(90*mm, y-6*mm, 35*mm, 6*mm, fill=0, stroke=1)
c.rect(125*mm, y-6*mm, W-30*mm-110*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 6)
c.drawString(16*mm, y-4*mm, "FECHA")
c.setFont("Helvetica", 6)
c.drawString(46*mm, y-4*mm, "28/08/2026")
c.setFont("Helvetica-Bold", 6)
c.drawString(91*mm, y-4*mm, "CÓDIGO DE SISTEMA")
c.setFont("Helvetica", 5.5)
c.drawString(126*mm, y-4*mm, "2287BE33538DCA637FBF7")
# SISTEMA
c.rect(15*mm, y-12*mm, 30*mm, 6*mm, fill=0, stroke=1)
c.rect(45*mm, y-12*mm, 45*mm, 6*mm, fill=0, stroke=1)
c.rect(90*mm, y-12*mm, 35*mm, 6*mm, fill=0, stroke=1)
c.rect(125*mm, y-12*mm, W-30*mm-110*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 6)
c.drawString(16*mm, y-10*mm, "SISTEMA")
c.setFont("Helvetica", 6)
c.drawString(46*mm, y-10*mm, "Factugest")
c.setFont("Helvetica-Bold", 6)
c.drawString(91*mm, y-10*mm, "TIPO DE SISTEMA")
c.setFont("Helvetica", 6)
c.drawString(126*mm, y-10*mm, "PROVEEDOR")
# VERSION
c.rect(15*mm, y-18*mm, 30*mm, 6*mm, fill=0, stroke=1)
c.rect(45*mm, y-18*mm, 45*mm, 6*mm, fill=0, stroke=1)
c.rect(90*mm, y-18*mm, 35*mm, 6*mm, fill=0, stroke=1)
c.rect(125*mm, y-18*mm, W-30*mm-110*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 6)
c.drawString(16*mm, y-16*mm, "VERSIÓN")
c.setFont("Helvetica", 6)
c.drawString(46*mm, y-16*mm, "1.0.9")
c.setFont("Helvetica-Bold", 6)
c.drawString(91*mm, y-16*mm, "MODALIDAD(ES)")
c.setFont("Helvetica", 5.5)
c.drawString(126*mm, y-16.5*mm, "COMPUTARIZADA EN LÍNEA")
c.drawString(126*mm, y-19.5*mm, "ELECTRÓNICA EN LÍNEA")

# CONSTANTES
y = H-128*mm
# ambientes
c.setFillColor(GRAY_HEAD)
c.rect(15*mm, y, 60*mm, 6*mm, fill=1, stroke=0)
c.setStrokeColor(GRAY_BORDER)
c.rect(15*mm, y, 60*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 6)
c.drawCentredString(15*mm+30*mm, y+2*mm, "CONSTANTES DE AMBIENTES")
c.rect(15*mm, y-6*mm, 22*mm, 6*mm, fill=0, stroke=1)
c.rect(37*mm, y-6*mm, 38*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 5.5)
c.drawCentredString(15*mm+11*mm, y-4*mm, "CÓDIGO")
c.drawCentredString(37*mm+19*mm, y-4*mm, "DESCRIPCIÓN")
c.rect(15*mm, y-12*mm, 22*mm, 6*mm, fill=0, stroke=1)
c.rect(37*mm, y-12*mm, 38*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica", 6)
c.drawCentredString(15*mm+11*mm, y-10*mm, "1")
c.drawCentredString(37*mm+19*mm, y-10*mm, "PRODUCCIÓN")
c.rect(15*mm, y-18*mm, 22*mm, 6*mm, fill=0, stroke=1)
c.rect(37*mm, y-18*mm, 38*mm, 6*mm, fill=0, stroke=1)
c.drawCentredString(15*mm+11*mm, y-16*mm, "2")
c.drawCentredString(37*mm+19*mm, y-16*mm, "PRUEBAS")
# modalidades
c.setFillColor(GRAY_HEAD)
c.rect(W-15*mm-65*mm, y, 65*mm, 6*mm, fill=1, stroke=0)
c.setStrokeColor(GRAY_BORDER)
c.rect(W-15*mm-65*mm, y, 65*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 6)
c.drawCentredString(W-15*mm-32.5*mm, y+2*mm, "CONSTANTES DE MODALIDADES")
c.rect(W-15*mm-65*mm, y-6*mm, 22*mm, 6*mm, fill=0, stroke=1)
c.rect(W-15*mm-43*mm, y-6*mm, 43*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 5.5)
c.drawCentredString(W-15*mm-54*mm, y-4*mm, "CÓDIGO")
c.drawCentredString(W-15*mm-21.5*mm, y-4*mm, "DESCRIPCIÓN")
c.rect(W-15*mm-65*mm, y-12*mm, 22*mm, 6*mm, fill=0, stroke=1)
c.rect(W-15*mm-43*mm, y-12*mm, 43*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica", 6)
c.drawCentredString(W-15*mm-54*mm, y-10*mm, "1")
c.drawCentredString(W-15*mm-21.5*mm, y-10*mm, "ELECTRÓNICA EN LÍNEA")
c.rect(W-15*mm-65*mm, y-18*mm, 22*mm, 6*mm, fill=0, stroke=1)
c.rect(W-15*mm-43*mm, y-18*mm, 43*mm, 6*mm, fill=0, stroke=1)
c.drawCentredString(W-15*mm-54*mm, y-16*mm, "2")
c.drawCentredString(W-15*mm-21.5*mm, y-16*mm, "COMPUTARIZADA EN LÍNEA")

# FUNCIONALIDADES
y = H-158*mm
c.setFillColor(GRAY_HEAD)
c.rect(15*mm, y, W-30*mm, 6*mm, fill=1, stroke=0)
c.setStrokeColor(GRAY_BORDER)
c.rect(15*mm, y, W-30*mm, 6*mm, fill=0, stroke=1)
c.setFont("Helvetica-Bold", 7)
c.drawCentredString(W/2, y+2*mm, "FUNCIONALIDADES REGISTRADAS")
rows = [
    ("CREACIÓN DE PUNTO DE VENTA", "DESCUENTO EN DETALLE"),
    ("DESCUENTO GLOBAL", "PAGO CON GIFT CARD"),
    ("EMISIÓN FUERA DE LINEA", "CÓDIGOS ESPECIALES"),
    ("MANUALES DE CONTINGENCIA", "REGISTRO DE COMPRAS"),
    ("FORMAS DE PAGO (TODOS)", "TIPOS DE MONEDA (TODOS)"),
    ("DOCUMENTOS DE IDENTIDAD (TODOS)", "TIPOS DE UNIDAD DE MEDIDA (TODOS)"),
    ("", ""),
]
for i,(l,r) in enumerate(rows):
    yy = y - (i+1)*6*mm
    c.rect(15*mm, yy, (W-30*mm)/2, 6*mm, fill=0, stroke=1)
    c.rect(15*mm+(W-30*mm)/2, yy, (W-30*mm)/2, 6*mm, fill=0, stroke=1)
    c.setFont("Helvetica", 6)
    if l.startswith("EMISIÓN") or l.startswith("FORMAS") or l.startswith("DOCUMENTOS"):
        c.setFont("Helvetica-Bold", 6)
    c.drawString(16*mm, yy+2*mm, l)
    c.setFont("Helvetica", 6)
    if r.startswith("TIPOS"):
        c.setFont("Helvetica-Bold", 6)
    c.drawString(15*mm+(W-30*mm)/2+2*mm, yy+2*mm, r)

# referencia
c.setFont("Helvetica", 6)
c.setFillColor(HexColor("#000000"))
c.drawString(15*mm, 28*mm, "Referencia tecnica:")
c.setFillColor(HexColor("#0000FF"))
c.setFont("Helvetica", 6)
c.drawString(38*mm, 28*mm, "https://siatinfo.impuestos.gob.bo/")
c.setFillColor(HexColor("#000000"))
c.setFont("Helvetica", 6)
c.drawRightString(W-15*mm-45*mm, 28*mm, "Soporte técnico:")
c.setFillColor(HexColor("#0000FF"))
c.drawString(W-15*mm-22*mm, 28*mm, "siat.facturacion@impuestos.gob.bo")

draw_footer(c)
c.showPage()

# ===== PAGINA 2 =====
draw_header(c)
# SERVICIOS / RUTAS
y = H-35*mm
c.setFillColor(GRAY_HEAD)
c.rect(15*mm, y, (W-30*mm)/2, 7*mm, fill=1, stroke=0)
c.rect(15*mm+(W-30*mm)/2, y, (W-30*mm)/2, 7*mm, fill=1, stroke=0)
c.setStrokeColor(GRAY_BORDER)
c.rect(15*mm, y, W-30*mm, 7*mm, fill=0, stroke=1)
c.setFillColor(HexColor("#000000"))
c.setFont("Helvetica-Bold", 7)
c.drawCentredString(15*mm+(W-30*mm)/4, y+2.5*mm, "SERVICIOS")
c.drawCentredString(15*mm+(W-30*mm)*0.75, y+2.5*mm, "RUTAS")
rows2 = [
    ("SERVICIO DE SINCRONIZACIÓN DE DATOS", "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl"),
    ("SERVICIO DE OPERACIONES", "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl"),
    ("SERVICIO DE OBTENCIÓN DE CÓDIGOS", "https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl"),
    ("NOTA CREDITO DEBITO ICE", "https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionDocumentoAjuste?wsdl"),
    ("FACTURA PRODUCTOS ALCANZADOS POR EL ICE", "https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionComputarizada?wsdl"),
    ("FACTURA PRODUCTOS ALCANZADOS POR EL ICE", "https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionElectronica?wsdl"),
]
for i,(s,r) in enumerate(rows2):
    yy = y - (i+1)*10*mm
    c.rect(15*mm, yy, (W-30*mm)/2, 10*mm, fill=0, stroke=1)
    c.rect(15*mm+(W-30*mm)/2, yy, (W-30*mm)/2, 10*mm, fill=0, stroke=1)
    c.setFont("Helvetica", 5.5)
    c.setFillColor(HexColor("#000000"))
    c.drawString(16*mm, yy+4*mm, s)
    c.setFillColor(HexColor("#0000FF"))
    c.setFont("Helvetica", 5.5)
    # partir ruta en 2 lineas si larga
    if len(r) > 55:
        c.drawString(15*mm+(W-30*mm)/2+2*mm, yy+6*mm, r[:55])
        c.drawString(15*mm+(W-30*mm)/2+2*mm, yy+3*mm, r[55:])
    else:
        c.drawString(15*mm+(W-30*mm)/2+2*mm, yy+4*mm, r)

c.setFillColor(HexColor("#000000"))
c.setFont("Helvetica", 6)
c.drawString(15*mm, 28*mm, "Referencia tecnica:")
c.setFillColor(HexColor("#0000FF"))
c.drawString(38*mm, 28*mm, "https://siatinfo.impuestos.gob.bo/")
c.setFillColor(HexColor("#000000"))
c.drawRightString(W-15*mm-45*mm, 28*mm, "Soporte técnico:")
c.setFillColor(HexColor("#0000FF"))
c.drawString(W-15*mm-22*mm, 28*mm, "siat.facturacion@impuestos.gob.bo")

draw_footer(c)
c.save()
print(f"Generado pixel-perfect: {OUT}")
# copia a descargas
import shutil
shutil.copy(OUT, OUT2)
print(f"Copiado a {OUT2}")
