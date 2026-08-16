try:
    from weasyprint import HTML
    print("WeasyPrint: Available")
except Exception as e:
    print(f"WeasyPrint: Unavailable - {e}")

try:
    from xhtml2pdf import pisa
    print("xhtml2pdf: Available")
except Exception as e:
    print(f"xhtml2pdf: Unavailable - {e}")
