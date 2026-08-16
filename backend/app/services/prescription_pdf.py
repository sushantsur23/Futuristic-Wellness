import os
import base64
import logging
import traceback
from jinja2 import Environment, FileSystemLoader
from backend.app.core.config import settings

logger = logging.getLogger("prescription_pdf")

# Set up Jinja2 environment pointing at the templates/ directory
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "templates")
jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

# Global flag: check if WeasyPrint is importable (requires GTK/Pango on Windows)
WEASYPRINT_AVAILABLE = False
try:
    from weasyprint import HTML as WeasyHTML
    WEASYPRINT_AVAILABLE = True
    logger.info("[PDF Engine] WeasyPrint loaded successfully — will use as primary renderer.")
except Exception as e:
    logger.info(f"[PDF Engine] WeasyPrint unavailable ({e}). Falling back to xhtml2pdf.")

# xhtml2pdf is always our safe fallback
try:
    from xhtml2pdf import pisa
    XHTML2PDF_AVAILABLE = True
except ImportError:
    XHTML2PDF_AVAILABLE = False
    logger.warning("[PDF Engine] xhtml2pdf is also unavailable. PDF generation will fail!")


def _signature_to_data_uri(signature_url: str | None) -> str | None:
    """
    Convert a local file path to an inline base64 data URI so that both
    WeasyPrint and xhtml2pdf can embed the signature image in the PDF.

    If signature_url is already a data URI (starts with 'data:') or is a
    remote http(s) URL, it is returned as-is.
    Returns None if the file cannot be read.
    """
    if not signature_url:
        return None

    # Already a data URI — use as-is
    if signature_url.startswith("data:"):
        return signature_url

    # Remote URL — WeasyPrint can fetch it; xhtml2pdf usually cannot, but we
    # let the caller decide.
    if signature_url.startswith("http://") or signature_url.startswith("https://"):
        return signature_url

    # Local file path — resolve relative to the project root (CWD at startup)
    local_path = signature_url
    if not os.path.isabs(local_path):
        local_path = os.path.join(os.getcwd(), local_path)

    if not os.path.exists(local_path):
        logger.warning(f"[PDF Signature] File not found at '{local_path}' — signature will be omitted.")
        return None

    # Detect mime type from extension
    ext = os.path.splitext(local_path)[1].lower()
    mime_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp"}
    mime = mime_map.get(ext, "image/png")

    with open(local_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")

    return f"data:{mime};base64,{encoded}"


def generate_prescription_pdf(prescription_data: dict, output_filepath: str) -> str:
    """
    Render a prescription into a binary PDF file using the Jinja2 HTML template.

    Steps:
      1. Convert signature_url → inline base64 data URI (for embedded rendering)
      2. Render prescription.html template with all variables
      3. Try WeasyPrint (best CSS fidelity) → fallback to xhtml2pdf
      4. Write binary PDF to output_filepath

    Returns the absolute path to the generated PDF file.
    Raises RuntimeError if neither engine is available.
    """
    # --- 1. Signature conversion ---
    raw_sig = prescription_data.get("signature_data_uri")
    prescription_data = dict(prescription_data)  # Don't mutate caller's dict
    prescription_data["signature_data_uri"] = _signature_to_data_uri(raw_sig)

    # --- 2. Render Jinja2 template ---
    template = jinja_env.get_template("prescription.html")
    rendered_html = template.render(**prescription_data)

    # --- 3. Ensure output directory exists ---
    output_dir = os.path.dirname(os.path.abspath(output_filepath))
    os.makedirs(output_dir, exist_ok=True)

    # --- 4. WeasyPrint (primary, better CSS rendering) ---
    if WEASYPRINT_AVAILABLE:
        try:
            WeasyHTML(string=rendered_html, base_url=os.getcwd()).write_pdf(output_filepath)
            logger.info(f"[PDF] WeasyPrint generated PDF → {output_filepath}")
            return output_filepath
        except Exception as e:
            logger.warning(f"[PDF] WeasyPrint failed ({e}); trying xhtml2pdf fallback.")
            logger.debug(traceback.format_exc())

    # --- 5. xhtml2pdf fallback ---
    if XHTML2PDF_AVAILABLE:
        with open(output_filepath, "wb") as pdf_file:
            pisa_status = pisa.CreatePDF(rendered_html, dest=pdf_file)
            if pisa_status.err:
                logger.error(f"[PDF] xhtml2pdf errors: {pisa_status.err}")
            else:
                logger.info(f"[PDF] xhtml2pdf generated PDF → {output_filepath}")
        return output_filepath

    raise RuntimeError(
        "No PDF engine available. Install 'xhtml2pdf' or 'weasyprint'."
    )
