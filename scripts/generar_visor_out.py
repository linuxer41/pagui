#!/usr/bin/env python3
import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
from reportlab.lib.colors import HexColor
import io, os

OUT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "visor_out.pdf")

# Colores SIAT
BLUE_DARK = HexColor("#1F4E89")
BLUE_MED = HexColor("#2A6CB6")
GRAY_HEAD = HexColor("#D9D9D9")
GRAY_BORDER = HexColor("#8A8A8A")
FOOTER_BLUE = HexColor("#0F4A7A")
FOOTER_LIGHT = HexColor("#1AA0D0")

PAGE_W, PAGE_H = A4

def qr_image(data="https://siatinfo.impuestos.gob.bo/ - 9636 - 7474483013"):
    qr = qrcode.QRCode(version=2, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=1)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

styles = getSampleStyleSheet()
st_normal = ParagraphStyle("normal", parent=styles["Normal"], fontName="Helvetica", fontSize=7, leading=8, textColor=colors.black)
st_small = ParagraphStyle("small", parent=st_normal, fontSize=6, leading=7, textColor=colors.HexColor("#333333"))
st_small_blue = ParagraphStyle("small_blue", parent=st_small, textColor=colors.HexColor("#2A6CB6"))
st_header_title = ParagraphStyle("htitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=11, leading=13, alignment=TA_CENTER, textColor=colors.black)
st_sub = ParagraphStyle("sub", parent=styles["Normal"], fontName="Helvetica", fontSize=6, leading=7, alignment=TA_CENTER, textColor=colors.HexColor("#555555"))
st_table_head = ParagraphStyle("th", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7, leading=8, alignment=TA_CENTER, textColor=colors.black)
st_table_cell = ParagraphStyle("td", parent=styles["Normal"], fontName="Helvetica", fontSize=7, leading=8, textColor=colors.black)
st_table_cell_bold = ParagraphStyle("tdb", parent=st_table_cell, fontName="Helvetica-Bold")
# Para footer
st_footer = ParagraphStyle("footer", parent=styles["Normal"], fontName="Helvetica", fontSize=6, leading=7, textColor=colors.HexColor("#444444"))

def p(text, style=st_table_cell):
    return Paragraph(text, style)

def header_table():
    # Fila superior: Fecha reporte / N solicitud
    fecha = '<font size=6><b>Fecha de reporte:</b>&nbsp;&nbsp;&nbsp;&nbsp;28/08/2026 4:20 PM</font>'
    usuario = '<font size=6><b>Usuario:</b>&nbsp;&nbsp;&nbsp;&nbsp;linuxer41@gmail.com</font>'
    # lado derecho: N SOLICITUD
    right_data = [
        [Paragraph('<font size=7><b>Nº SOLICITUD</b></font>', ParagraphStyle("r", parent=st_table_cell, alignment=TA_CENTER, fontName="Helvetica-Bold")),
         Paragraph('<font size=7>9636</font>', ParagraphStyle("r2", parent=st_table_cell, alignment=TA_CENTER))]
    ]
    right_tab = Table(right_data, colWidths=[28*mm, 15*mm])
    right_tab.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(0,0), GRAY_HEAD),
        ("BOX", (0,0),(-1,-1), 0.5, colors.white),
        ("INNERGRID", (0,0),(-1,-1), 0.3, colors.white),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),3),
        ("RIGHTPADDING",(0,0),(-1,-1),3),
        ("TOPPADDING",(0,0),(-1,-1),4),
        ("BOTTOMPADDING",(0,0),(-1,-1),4),
    ]))
    # siat logo simulado con texto
    siat_left = Table([
        [Paragraph('<font color="#1F4E89" size=18><b>siat</b></font> <font color="#1F4E89" size=6>◉◉◉</font>', st_normal)],
        [Paragraph('<font color="#1F4E89" size=6><b>IMPUESTOS NACIONALES</b> <font color="#F9C200">■</font><font color="#00A651">■</font><font color="#FF0000">■</font></font>', st_normal)],
    ], colWidths=[50*mm])
    siat_left.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),1)]))

    imp_nac_right = Paragraph('<font color="#1F4E89" size=7><b>IMPUESTOS NACIONALES</b></font> <font color="#1F4E89" size=10>◙</font>', ParagraphStyle("imp", parent=st_table_cell, alignment=TA_RIGHT, fontName="Helvetica-Bold", textColor=HexColor("#1F4E89")))

    top_row = Table([
        [siat_left, imp_nac_right]
    ], colWidths=[90*mm, 90*mm])
    top_row.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0)]))

    fecha_row = Table([
        [Paragraph(fecha, st_small), right_tab],
        [Paragraph(usuario, st_small), ""]
    ], colWidths=[135*mm, 45*mm])
    fecha_row.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0)]))
    return [top_row, Spacer(1,6*mm), fecha_row, Spacer(1,4*mm)]

def title_block():
    t = Paragraph("<b>SOLICITUD DE AUTORIZACIÓN<br/>DE SISTEMAS INFORMÁTICOS DE FACTURACIÓN</b>", st_header_title)
    sub = Paragraph("R-1359 -01", st_sub)
    return [t, Spacer(1,1*mm), sub, Spacer(1,4*mm)]

def datos_basicos_con_qr():
    # tabla datos básicos
    data = [
        [Paragraph('<b>DATOS BÁSICOS DEL CONTRIBUYENTE</b>', ParagraphStyle("h", parent=st_table_head, backColor=GRAY_HEAD)), ""],
    ]
    # header merge row simulated via colSpan handled in TableStyle
    rows = [
        [p("<b>NIT</b>", st_table_cell_bold), p("7474483013")],
        [p("<b>RAZÓN SOCIAL</b>", st_table_cell_bold), p("FRANCISCO OCHOA GONZALES")],
        [p("<b>DEPENDENCIA</b>", st_table_cell_bold), p("GERENCIA DISTRITAL CHUQUISACA")],
    ]
    # Build table with header merged
    # We create a 2-col table, first row spans both cols via SPAN
    tab_data = [
        [Paragraph('<b>DATOS BÁSICOS DEL CONTRIBUYENTE</b>', ParagraphStyle("headc", parent=st_table_head, alignment=TA_CENTER)), ""],
    ] + rows
    tab = Table(tab_data, colWidths=[45*mm, 75*mm])
    tab.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,0), GRAY_HEAD),
        ("SPAN", (0,0),(-1,0)),
        ("ALIGN",(0,0),(-1,0),"CENTER"),
        ("BOX",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("INNERGRID",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),4),
        ("RIGHTPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",(0,0),(-1,-1),3),
        ("BOTTOMPADDING",(0,0),(-1,-1),3),
    ]))
    # QR
    qr_buf = qr_image("7474483013|FRANCISCO OCHOA GONZALES|9636|28/08/2026")
    qr_img = Image(qr_buf, width=28*mm, height=28*mm)
    # layout: tabla + qr lado a lado
    outer = Table([[tab, qr_img]], colWidths=[120*mm, 35*mm])
    outer.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),2),
        ("RIGHTPADDING",(0,0),(-1,-1),2),
        ("ALIGN",(1,0),(1,0),"CENTER"),
    ]))
    return outer

def datos_solicitud():
    # FECHA 28/08/2026 (cambiada)
    rows = [
        [p("<b>FECHA</b>", st_table_cell_bold), p("28/08/2026"), p("<b>CÓDIGO DE SISTEMA</b>", st_table_cell_bold), p("2287BE33538DCA637FBF7", ParagraphStyle("mono", parent=st_table_cell, fontName="Helvetica", fontSize=6))],
        [p("<b>SISTEMA</b>", st_table_cell_bold), p("Factugest"), p("<b>TIPO DE SISTEMA</b>", st_table_cell_bold), p("PROVEEDOR")],
        [p("<b>VERSIÓN</b>", st_table_cell_bold), p("1.0.9"), p("<b>MODALIDAD(ES)</b>", st_table_cell_bold), p("COMPUTARIZADA EN LÍNEA<br/>ELECTRÓNICA EN LÍNEA", st_table_cell)],
    ]
    head = [[Paragraph('<b>DATOS DE LA SOLICITUD</b>', ParagraphStyle("headc", parent=st_table_head, alignment=TA_CENTER)), "", "", ""]]
    data = head + rows
    tab = Table(data, colWidths=[28*mm, 42*mm, 34*mm, 76*mm])
    tab.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0), GRAY_HEAD),
        ("SPAN",(0,0),(-1,0)),
        ("ALIGN",(0,0),(-1,0),"CENTER"),
        ("BOX",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("INNERGRID",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),4),
        ("RIGHTPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",(0,0),(-1,-1),3),
        ("BOTTOMPADDING",(0,0),(-1,-1),3),
    ]))
    return tab

def constantes():
    t1_data = [
        [Paragraph('<b>CONSTANTES DE AMBIENTES</b>', ParagraphStyle("h", parent=st_table_head, alignment=TA_CENTER)), ""],
        [Paragraph('<b>CÓDIGO</b>', ParagraphStyle("th2", parent=st_table_head, fontSize=6)), Paragraph('<b>DESCRIPCIÓN</b>', ParagraphStyle("th2", parent=st_table_head, fontSize=6))],
        [p("1", ParagraphStyle("c", parent=st_table_cell, alignment=TA_CENTER)), p("PRODUCCIÓN", ParagraphStyle("c2", parent=st_table_cell, alignment=TA_CENTER))],
        [p("2", ParagraphStyle("c", parent=st_table_cell, alignment=TA_CENTER)), p("PRUEBAS", ParagraphStyle("c2", parent=st_table_cell, alignment=TA_CENTER))],
    ]
    # fix first header span
    t1 = Table(t1_data, colWidths=[22*mm, 38*mm])
    t1.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0), GRAY_HEAD),
        ("SPAN",(0,0),(-1,0)),
        ("BACKGROUND",(0,1),(-1,1), colors.white),
        ("FONTNAME",(0,1),(-1,1),"Helvetica-Bold"),
        ("BOX",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("INNERGRID",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("ALIGN",(0,0),(-1,-1),"CENTER"),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("TOPPADDING",(0,0),(-1,-1),3),
        ("BOTTOMPADDING",(0,0),(-1,-1),3),
    ]))
    t2_data = [
        [Paragraph('<b>CONSTANTES DE MODALIDADES</b>', ParagraphStyle("h", parent=st_table_head, alignment=TA_CENTER)), ""],
        [Paragraph('<b>CÓDIGO</b>', ParagraphStyle("th2", parent=st_table_head, fontSize=6)), Paragraph('<b>DESCRIPCIÓN</b>', ParagraphStyle("th2", parent=st_table_head, fontSize=6))],
        [p("1", ParagraphStyle("c", parent=st_table_cell, alignment=TA_CENTER)), p("ELECTRÓNICA EN LÍNEA", ParagraphStyle("c2", parent=st_table_cell, alignment=TA_CENTER))],
        [p("2", ParagraphStyle("c", parent=st_table_cell, alignment=TA_CENTER)), p("COMPUTARIZADA EN LÍNEA", ParagraphStyle("c2", parent=st_table_cell, alignment=TA_CENTER))],
    ]
    t2 = Table(t2_data, colWidths=[22*mm, 45*mm])
    t2.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0), GRAY_HEAD),
        ("SPAN",(0,0),(-1,0)),
        ("BOX",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("INNERGRID",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("ALIGN",(0,0),(-1,-1),"CENTER"),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("TOPPADDING",(0,0),(-1,-1),3),
        ("BOTTOMPADDING",(0,0),(-1,-1),3),
    ]))
    outer = Table([[t1, "", t2]], colWidths=[60*mm, 12*mm, 67*mm])
    outer.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"), ("LEFTPADDING",(0,0),(-1,-1),0), ("RIGHTPADDING",(0,0),(-1,-1),0)]))
    return outer

def funcionalidades():
    rows = [
        [p("CREACIÓN DE PUNTO DE VENTA"), p("DESCUENTO EN DETALLE")],
        [p("DESCUENTO GLOBAL"), p("PAGO CON GIFT CARD")],
        [p("<b>EMISIÓN FUERA DE LINEA</b>", st_table_cell_bold), p("CÓDIGOS ESPECIALES")],
        [p("MANUALES DE CONTINGENCIA"), p("REGISTRO DE COMPRAS")],
        [p("<b>FORMAS DE PAGO (TODOS)</b>", st_table_cell_bold), p("<b>TIPOS DE MONEDA (TODOS)</b>", st_table_cell_bold)],
        [p("<b>DOCUMENTOS DE IDENTIDAD (TODOS)</b>", st_table_cell_bold), p("<b>TIPOS DE UNIDAD DE MEDIDA (TODOS)</b>", st_table_cell_bold)],
        [p(""), p("")],
    ]
    head = [[Paragraph('<b>FUNCIONALIDADES REGISTRADAS</b>', ParagraphStyle("headc", parent=st_table_head, alignment=TA_CENTER)), ""]]
    data = head + rows
    # need last row span? last row col 0 blank
    tab = Table(data, colWidths=[92*mm, 88*mm])
    tab.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0), GRAY_HEAD),
        ("SPAN",(0,0),(-1,0)),
        ("ALIGN",(0,0),(-1,0),"CENTER"),
        ("BOX",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("INNERGRID",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),4),
        ("RIGHTPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",(0,0),(-1,-1),3),
        ("BOTTOMPADDING",(0,0),(-1,-1),3),
    ]))
    return tab

def servicios_rutas():
    # header
    head = [[Paragraph('<b>SERVICIOS</b>', ParagraphStyle("headc", parent=st_table_head, alignment=TA_CENTER)),
             Paragraph('<b>RUTAS</b>', ParagraphStyle("headc", parent=st_table_head, alignment=TA_CENTER))]]
    rows = [
        [p("SERVICIO DE SINCRONIZACIÓN DE DATOS"), p('<link href="https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion?wsdl">https://pilotosiatservicios.impuestos.gob.<br/>bo/v2/FacturacionSincronizacion?wsdl</link>', ParagraphStyle("link", parent=st_small_blue, fontSize=6, leading=7))],
        [p("SERVICIO DE OPERACIONES"), p('<link href="https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionOperaciones?wsdl">https://pilotosiatservicios.impuestos.gob.<br/>bo/v2/FacturacionOperaciones?wsdl</link>', ParagraphStyle("link", parent=st_small_blue, fontSize=6, leading=7))],
        [p("SERVICIO DE OBTENCIÓN DE CÓDIGOS"), p('<link href="https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionCodigos?wsdl">https://pilotosiatservicios.impuestos.gob.<br/>bo/v2/FacturacionCodigos?wsdl</link>', ParagraphStyle("link", parent=st_small_blue, fontSize=6, leading=7))],
        [p("NOTA CREDITO DEBITO ICE"), p('<link href="https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionDocumentoAjuste?wsdl">https://pilotosiatservicios.impuestos.gob.<br/>bo/v2/ServicioFacturacionDocumentoAjuste?wsdl</link>', ParagraphStyle("link", parent=st_small_blue, fontSize=6, leading=7))],
        [p("FACTURA PRODUCTOS ALCANZADOS POR EL ICE"), p('<link href="https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionComputarizada?wsdl">https://pilotosiatservicios.impuestos.gob.<br/>bo/v2/ServicioFacturacionComputarizada?wsdl</link>', ParagraphStyle("link", parent=st_small_blue, fontSize=6, leading=7))],
        [p("FACTURA PRODUCTOS ALCANZADOS POR EL ICE"), p('<link href="https://pilotosiatservicios.impuestos.gob.bo/v2/ServicioFacturacionElectronica?wsdl">https://pilotosiatservicios.impuestos.gob.<br/>bo/v2/ServicioFacturacionElectronica?wsdl</link>', ParagraphStyle("link", parent=st_small_blue, fontSize=6, leading=7))],
    ]
    data = head + rows
    # Add spacing rows to fill page similar to original (empty area)
    tab = Table(data, colWidths=[92*mm, 88*mm])
    tab.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0), GRAY_HEAD),
        ("BOX",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("INNERGRID",(0,0),(-1,-1),0.4, GRAY_BORDER),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),4),
        ("RIGHTPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",(0,0),(-1,-1),4),
        ("BOTTOMPADDING",(0,0),(-1,-1),6),
    ]))
    return tab

def build():
    doc = SimpleDocTemplate(
        OUT,
        pagesize=A4,
        leftMargin=14*mm, rightMargin=14*mm, topMargin=10*mm, bottomMargin=10*mm,
        title="SIAT - Solicitud 9636 - 28/08/2026",
        author="linuxer41@gmail.com",
    )
    story = []
    for el in header_table():
        story.append(el)
    for el in title_block():
        story.append(el)
    story.append(datos_basicos_con_qr())
    story.append(Spacer(1,4*mm))
    story.append(datos_solicitud())
    story.append(Spacer(1,4*mm))
    story.append(constantes())
    story.append(Spacer(1,4*mm))
    story.append(funcionalidades())
    story.append(Spacer(1,6*mm))
    # referencia tecnica linea
    ref_row = Table([
        [Paragraph('Referencia tecnica: <link href="https://siatinfo.impuestos.gob.bo/"><font color="#2A6CB6">https://siatinfo.impuestos.gob.bo/</font></link>', st_small),
         Paragraph('Soporte técnico: <link href="mailto:siat.facturacion@impuestos.gob.bo"><font color="#2A6CB6">siat.facturacion@impuestos.gob.bo</font></link>', ParagraphStyle("right", parent=st_small, alignment=TA_RIGHT))]
    ], colWidths=[90*mm, 90*mm])
    ref_row.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"), ("LEFTPADDING",(0,0),(-1,-1),0), ("RIGHTPADDING",(0,0),(-1,-1),0)]))
    story.append(ref_row)
    story.append(PageBreak())
    # Página 2
    story.append(servicios_rutas())
    # push footer area to bottom via spacer with remaining height
    story.append(Spacer(1, 95*mm))
    ref_row2 = Table([
        [Paragraph('Referencia tecnica: <link href="https://siatinfo.impuestos.gob.bo/"><font color="#2A6CB6">https://siatinfo.impuestos.gob.bo/</font></link>', st_small),
         Paragraph('Soporte técnico: <link href="mailto:siat.facturacion@impuestos.gob.bo"><font color="#2A6CB6">siat.facturacion@impuestos.gob.bo</font></link>', ParagraphStyle("right", parent=st_small, alignment=TA_RIGHT))]
    ], colWidths=[90*mm, 90*mm])
    ref_row2.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"), ("LEFTPADDING",(0,0),(-1,-1),0)]))
    story.append(ref_row2)

    # footer se dibuja en cada página via onPage
    def footer_canvas(canvas, doc):
        canvas.saveState()
        # barra azul inferior
        y = 12*mm
        canvas.setFillColor(FOOTER_BLUE)
        canvas.rect(0, y-2*mm, PAGE_W, 12*mm, stroke=0, fill=1)
        # triangulo decorativo claro
        canvas.setFillColor(FOOTER_LIGHT)
        # dibujar forma simple barra
        # texto sumamos
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 10)
        canvas.drawString(14*mm, y+4*mm, "✔ Sumamos")
        canvas.setFont("Helvetica", 6)
        canvas.drawString(14*mm, y+1*mm, "calidad a nuestros servicios  ISO 9001:2015")
        canvas.setFont("Helvetica", 6)
        canvas.setFillColor(colors.white)
        canvas.drawRightString(PAGE_W - 14*mm, y+4*mm, "Línea gratuita: 800-10-3444")
        canvas.drawRightString(PAGE_W - 14*mm, y+1*mm, "www.impuestos.gob.bo")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    print(f"Generado: {OUT}")

if __name__ == "__main__":
    build()
