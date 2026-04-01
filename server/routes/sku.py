from flask import Blueprint, request, jsonify, send_file
from ..models.product import Product
from ..db.database import db
import io
import re
import pandas as pd

sku_bp = Blueprint('sku', __name__)

CATEGORY_RULES = [
    {'code': '04', 'name': 'Blanket Barring', 'type': 'Barring', 'keywords': ['blanket barring', 'barring', 'barred blanket', 'bar blanket']},
    {'code': '02', 'name': 'Metalback Blankets', 'type': 'Metalback Blanket', 'keywords': ['metalback blanket', 'metal back blanket', 'metalback', 'metal back']},
    {'code': '03', 'name': 'Underlay Blanket', 'type': 'Underlay Blanket', 'keywords': ['underlay blanket']},
    {'code': '05', 'name': 'Calibrated Underpacking Paper', 'type': 'Underpacking Paper', 'keywords': ['calibrated underpacking paper', 'underpacking paper', 'packing paper']},
    {'code': '06', 'name': 'Calibrated Underpacking Film', 'type': 'Underpacking Film', 'keywords': ['calibrated underpacking film', 'underpacking film', 'packing film', 'polyester film', 'mylar film']},
    {'code': '07', 'name': 'Creasing Matrix', 'type': 'Matrix', 'keywords': ['creasing matrix', 'matrix']},
    {'code': '10', 'name': 'Litho Perforation Rules', 'type': 'Perforation Rule', 'keywords': ['litho perforation rule', 'perforation rule', 'perf rule', 'micro perf']},
    {'code': '08', 'name': 'Cutting Rules', 'type': 'Cutting Rule', 'keywords': ['cutting rule', 'cut rule']},
    {'code': '09', 'name': 'Creasing Rules', 'type': 'Creasing Rule', 'keywords': ['creasing rule', 'crease rule', 'scoring rule']},
    {'code': '11', 'name': 'Cutting String', 'type': 'String', 'keywords': ['cutting string', 'cut string']},
    {'code': '12', 'name': 'Ejection Rubber', 'type': 'Ejection Rubber', 'keywords': ['ejection rubber', 'ejection']},
    {'code': '13', 'name': 'Strip Plate', 'type': 'Strip Plate', 'keywords': ['strip plate']},
    {'code': '14', 'name': 'Anti Marking Film', 'type': 'Anti Marking Film', 'keywords': ['anti marking film', 'anti-marking film']},
    {'code': '15', 'name': 'Ink Duct Foil', 'type': 'Foil', 'keywords': ['ink duct foil', 'ink fountain foil']},
    {'code': '16', 'name': 'Productive Foil', 'type': 'Foil', 'keywords': ['productive foil', 'protective foil']},
    {'code': '17', 'name': 'Presspahn Sheets', 'type': 'Sheet', 'keywords': ['presspahn', 'presspahn sheet']},
    {'code': '18', 'name': 'Washing Solutions', 'type': 'Washing Solution', 'keywords': ['washing solution', 'wash solution', 'wash', 'cleaner']},
    {'code': '19', 'name': 'Fountain Solutions', 'type': 'Fountain Solution', 'keywords': ['fountain solution']},
    {'code': '20', 'name': 'Plate Care Products', 'type': 'Plate Care', 'keywords': ['plate care', 'plate cleaner', 'plate gum', 'plate conditioner']},
    {'code': '21', 'name': 'Roller Care Products', 'type': 'Roller Care', 'keywords': ['roller care', 'roller wash', 'roller cleaner', 'roller conditioner']},
    {'code': '22', 'name': 'Blanket Maintenance Products', 'type': 'Blanket Maintenance', 'keywords': ['blanket maintenance', 'blanket cleaner', 'blanket wash', 'blanket paste']},
    {'code': '23', 'name': 'Auto Wash Cloth', 'type': 'Wash Cloth', 'keywords': ['auto wash cloth', 'autowash cloth', 'wash cloth']},
    {'code': '24', 'name': 'ICP Paper', 'type': 'Paper', 'keywords': ['icp paper']},
    {'code': '25', 'name': 'Spray Powder', 'type': 'Powder', 'keywords': ['spray powder']},
    {'code': '26', 'name': 'Sponges', 'type': 'Sponge', 'keywords': ['sponge', 'sponges']},
    {'code': '27', 'name': 'Dampening Hose', 'type': 'Hose', 'keywords': ['dampening hose', 'damping hose']},
    {'code': '28', 'name': 'Tesamol Tape', 'type': 'Tape', 'keywords': ['tesamol', 'tesa tape', 'tesamol tape']},
    {'code': '01', 'name': 'Rubber Blankets', 'type': 'Rubber Blanket', 'keywords': ['rubber blanket', 'blanket']},
]

SIZE_PATTERN = re.compile(
    r'(\d+(?:\.\d+)?\s*(?:x|X)\s*\d+(?:\.\d+)?(?:\s*(?:x|X)\s*\d+(?:\.\d+)?)?\s*(?:mm|cm|m|mtr|mic|micron|gsm|inch|in)?)'
)
UNIT_PATTERN = re.compile(r'(\d+(?:\.\d+)?\s*(?:mm|cm|m|mtr|mic|micron|gsm|kg|g|ltr|l|ml|inch|in))')
BRAND_STOPWORDS = {
    'rubber', 'blanket', 'blankets', 'metalback', 'metal', 'back', 'underlay', 'underpacking',
    'paper', 'film', 'matrix', 'creasing', 'cutting', 'rules', 'rule', 'litho', 'perforation',
    'string', 'ejection', 'strip', 'plate', 'anti', 'marking', 'ink', 'duct', 'foil', 'productive',
    'protective', 'presspahn', 'sheets', 'washing', 'solutions', 'solution', 'fountain', 'care',
    'products', 'roller', 'maintenance', 'auto', 'wash', 'cloth', 'icp', 'spray', 'powder',
    'sponges', 'sponge', 'dampening', 'hose', 'tesamol', 'tape'
}

_ALLOWED_BRANDS = [
    'MTech',
    'SAVA',
    'Image',
    'B4P',
    'Conti',
    'Thompson',
    'HS Boyd',
    'M3Z',
    'Policrom',
    'MPack',
]

_BRAND_ALIASES = {
    'mtech': 'MTech',
    'm tech': 'MTech',
    'sava': 'SAVA',
    'image': 'Image',
    'b4p': 'B4P',
    'conti': 'Conti',
    'continental': 'Conti',
    'thompson': 'Thompson',
    'boyd': 'HS Boyd',
    'hs boyd': 'HS Boyd',
    'h s boyd': 'HS Boyd',
    'm3z': 'M3Z',
    'marks 3 zet': 'M3Z',
    'marks3zet': 'M3Z',
    'polipack': 'Policrom',
    'policrom': 'Policrom',
    'policrom screens': 'Policrom',
    'mpack': 'MPack',
    'm pack': 'MPack',
}


def _clean_text(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ''
    return re.sub(r'\s+', ' ', str(value)).strip()


def _normalize_text(value):
    return re.sub(r'[^a-z0-9]+', ' ', _clean_text(value).lower()).strip()


def _extract_size(name, description, product_format):
    combined = ' | '.join(filter(None, [_clean_text(name), _clean_text(description), _clean_text(product_format)]))
    matches = SIZE_PATTERN.findall(combined) + UNIT_PATTERN.findall(combined)
    cleaned = []
    seen = set()
    for match in matches:
        value = re.sub(r'\s+', ' ', match).strip(' ,;/-')
        if value and value.lower() not in seen:
            seen.add(value.lower())
            cleaned.append(value)
    return ', '.join(cleaned[:3])


def _extract_brand(name, description):
    source = _clean_text(name) or _clean_text(description)
    if not source:
        return ''

    source = re.split(r'[\(|,/]', source, maxsplit=1)[0]
    source = re.sub(r'\b\d+(?:\.\d+)?(?:\s*(?:x|X)\s*\d+(?:\.\d+)?)*\b', ' ', source)
    source = re.sub(r'[^A-Za-z0-9\- ]+', ' ', source)
    tokens = [token for token in source.split() if token]

    brand_tokens = []
    for token in tokens:
        normalized = token.lower().strip('-')
        if normalized in BRAND_STOPWORDS:
            continue
        if re.fullmatch(r'\d+(?:\.\d+)?', normalized):
            break
        if len(brand_tokens) >= 3:
            break
        brand_tokens.append(token)

    return ' '.join(brand_tokens)


def _normalize_brand(extracted_brand, name, description, product_format):
    combined = ' '.join(filter(None, [
        _normalize_text(extracted_brand),
        _normalize_text(name),
        _normalize_text(description),
        _normalize_text(product_format),
    ]))

    best_brand = ''
    best_pos = None
    for alias, canonical in _BRAND_ALIASES.items():
        if alias in combined:
            pos = combined.find(alias)
            if best_pos is None or pos < best_pos:
                best_pos = pos
                best_brand = canonical

    if best_brand in _ALLOWED_BRANDS:
        return best_brand

    return ''


def _extract_specification(name, description, product_format, size_value, brand_value):
    format_value = _clean_text(product_format)
    if format_value:
        return format_value

    combined = ' '.join(filter(None, [_clean_text(name), _clean_text(description)]))
    if brand_value:
        combined = re.sub(re.escape(brand_value), ' ', combined, flags=re.IGNORECASE)
    if size_value:
        combined = re.sub(re.escape(size_value), ' ', combined, flags=re.IGNORECASE)
    combined = re.sub(r'\s+', ' ', combined).strip(' ,;-')
    return combined[:120]


def _extract_product_name(name, brand_value):
    value = _clean_text(name)
    if not value:
        return ''

    value = re.split(r'\s*[\(|\[]', value, maxsplit=1)[0]
    value = re.sub(r'\b(?:ALUB|STLB)\b', ' ', value, flags=re.IGNORECASE)
    value = re.sub(r'\b\d+(?:\.\d+)?\s*(?:x|X)\s*\d+(?:\.\d+)?(?:\s*(?:x|X)\s*\d+(?:\.\d+)?)?\s*(?:mm|cm|m|mtr|mic|micron|gsm|inch|in)\b', ' ', value, flags=re.IGNORECASE)
    value = re.sub(r'\b\d+(?:\.\d+)?\s*(?:mm|cm|m|mtr|mic|micron|gsm|inch|in)\b', ' ', value, flags=re.IGNORECASE)
    if brand_value:
        value = re.sub(rf'^\s*{re.escape(brand_value)}\b', ' ', value, flags=re.IGNORECASE)
    value = re.sub(r'\s+', ' ', value).strip(' ,;/-')
    return value


def _extract_first_three_units(name, description, product_format):
    combined = ' '.join(filter(None, [_clean_text(name), _clean_text(description), _clean_text(product_format)])).lower()
    matches = re.findall(r'\b\d+(?:\.\d+)?\s*(mm|m)\b', combined)
    return matches[:3]


def _match_type_by_rules(brand_value, name, description, product_format):
    normalized_combined = ' '.join(filter(None, [
        _normalize_text(name),
        _normalize_text(description),
        _normalize_text(product_format),
    ]))

    has_bar = any(keyword in normalized_combined for keyword in ['alub', 'stlb'])
    if 'sponge' in normalized_combined:
        return 'Sponge Pieces'

    if brand_value == 'B4P' and has_bar:
        return 'Barring Pieces'

    units = _extract_first_three_units(name, description, product_format)

    if brand_value == 'M3Z':
        if has_bar:
            return 'Underpacking - Bar Cut format'
        if units == ['mm', 'mm', 'mm']:
            return 'Underpacking - Cut Format'
        if units == ['m', 'mm', 'mm']:
            return 'Underpacking - Roll Format'
        return 'Underpacking'

    if brand_value:
        if has_bar:
            return 'Rubber Blanket - Bar Cut format'
        if units == ['mm', 'mm', 'mm']:
            return 'Rubber Blanket - Cut Format'
        if units == ['mm', 'm', 'mm']:
            return 'Rubber Blanket - Roll Format'
        return 'Rubber Blanket'

    return ''


def _match_category(name, description, product_format):
    normalized_name = _normalize_text(name)
    normalized_description = _normalize_text(description)
    normalized_format = _normalize_text(product_format)
    normalized_combined = ' '.join(filter(None, [normalized_name, normalized_description, normalized_format]))

    best_rule = None
    best_score = 0

    for rule in CATEGORY_RULES:
        score = 0
        for keyword in rule['keywords']:
            keyword_value = _normalize_text(keyword)
            if not keyword_value:
                continue
            if keyword_value in normalized_name:
                score += 6
            elif keyword_value in normalized_description:
                score += 4
            elif keyword_value in normalized_format:
                score += 5
            elif keyword_value in normalized_combined:
                score += 2

        if rule['code'] == '01':
            if any(blocker in normalized_combined for blocker in ['metalback', 'metal back', 'underlay', 'barring']):
                score = 0
        if rule['code'] == '18' and 'blanket' in normalized_combined:
            score -= 1

        if score > best_score:
            best_score = score
            best_rule = rule

    if best_rule and best_score > 0:
        return f"{best_rule['code']} - {best_rule['name']}", best_rule['type']

    return '', ''

@sku_bp.route('/sku/generate', methods=['POST'])
def generate_sku():
    data = request.get_json()
    
    required_fields = ['companyShortform', 'brandShortform', 'importedCode', 'specifications']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    try:
        # Convert text to numeric (A=1, B=2, etc.)
        def text_to_numeric(text):
            if not text:
                return ''
            result = ''
            for char in text.upper():
                if 'A' <= char <= 'Z':
                    result += str(ord(char) - ord('A') + 1).zfill(2)
                elif char.isdigit():
                    result += char
            return result
        
        company_numeric = text_to_numeric(data['companyShortform'])
        brand_numeric = text_to_numeric(data['brandShortform'])
        
        # Build spec suffix: thickness-length-width-bar(if any)
        specs = data['specifications']
        spec_parts = []
        if specs.get('thickness'):
            spec_parts.append(str(specs['thickness']))
        if specs.get('length'):
            spec_parts.append(str(specs['length']))
        if specs.get('width'):
            spec_parts.append(str(specs['width']))
        if specs.get('barring') == 'yes' and specs.get('barNumber'):
            spec_parts.append(str(specs['barNumber']))
        
        spec_suffix = '-'.join(spec_parts) if spec_parts else '0000'
        
        # Generate SKU: COMPANY_NUMERIC-BRAND_NUMERIC-IMPORTED_CODE-SPEC_SUFFIX
        sku = f"{company_numeric}-{brand_numeric}-{data['importedCode']}-{spec_suffix}"
        
        # Create new product
        product_data = {
            'name': data.get('brandName', ''),
            'category': 'imported',
            'sku': sku,
            'company': data.get('companyName', ''),
            'companyCode': data.get('company', ''),
            'brandShortform': data['brandShortform'],
            'companyShortform': data['companyShortform'],
            'importedCode': data['importedCode'],
            'specifications': data['specifications'],
            'stock': 0,
            'imported': True,
            'createdAt': None,
            'lastUpdated': None
        }
        
        result = db.products.insert_one(product_data)
        
        return jsonify({
            'message': 'SKU generated successfully',
            'sku': sku,
            'productId': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sku_bp.route('/sku/companies', methods=['GET'])
def get_companies():
    try:
        companies = list(db.companies.find({}, {'_id': 0}))
        return jsonify(companies), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sku_bp.route('/sku/check-duplicate', methods=['POST'])
def check_duplicate():
    data = request.get_json()
    product_name = data.get('productName')
    
    if not product_name:
        return jsonify({'error': 'Product name is required'}), 400
    
    try:
        existing_product = db.products.find_one({'name': product_name})
        if existing_product:
            return jsonify({
                'exists': True,
                'sku': existing_product.get('sku', 'N/A'),
                'productId': str(existing_product['_id'])
            }), 200
        else:
            return jsonify({'exists': False}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sku_bp.route('/sku/analyze-excel', methods=['POST'])
def analyze_excel():
    try:
        if 'excel-file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['excel-file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            return jsonify({'error': 'Invalid file format. Please upload an Excel file.'}), 400

        df = pd.read_excel(file, dtype=str)

        # Normalize incoming headers so uploads do not fail on minor naming differences.
        column_lookup = {}
        for original in df.columns:
            normalized = re.sub(r'[^a-z0-9]+', ' ', str(original).strip().lower()).strip()
            if normalized:
                column_lookup[normalized] = original

        required_aliases = {
            'name': ['name', 'item name', 'product name', 'itemname', 'productname'],
            'description': ['description', 'desc', 'item description', 'product description'],
            'product_format': ['product format', 'product form', 'format', 'pack size', 'size format'],
        }

        resolved_columns = {}
        missing_columns = []
        for logical_name, aliases in required_aliases.items():
            found_column = None
            for alias in aliases:
                normalized_alias = re.sub(r'[^a-z0-9]+', ' ', alias.strip().lower()).strip()
                if normalized_alias in column_lookup:
                    found_column = column_lookup[normalized_alias]
                    break
            if found_column:
                resolved_columns[logical_name] = found_column
            else:
                missing_columns.append(logical_name)

        if missing_columns:
            expected = 'name/item name/product name, description, product format/product form'
            return jsonify({
                'error': f"Missing required column(s): {', '.join(missing_columns)}. Expected headers include: {expected}"
            }), 400

        product_names = []
        brands = []
        sizes = []
        types = []
        categories = []
        categorized_rows = 0

        for _, row in df.iterrows():
            name = row.get(resolved_columns['name'], '')
            description = row.get(resolved_columns['description'], '')
            product_format = row.get(resolved_columns['product_format'], '')

            size_value = _extract_size(name, description, product_format)
            extracted_brand = _extract_brand(name, description)
            brand_value = _normalize_brand(extracted_brand, name, description, product_format)
            product_name_value = _extract_product_name(name, brand_value)

            type_value = _match_type_by_rules(brand_value, name, description, product_format)
            category_value, fallback_type = _match_category(name, description, product_format)
            if not type_value:
                type_value = fallback_type

            if category_value:
                categorized_rows += 1

            product_names.append(product_name_value)
            brands.append(brand_value)
            sizes.append(size_value)
            types.append(type_value)
            categories.append(category_value)

        result_df = df.copy()
        result_df['Product Name'] = product_names
        result_df['Brand'] = brands
        result_df['Size'] = sizes
        result_df['Type'] = types
        result_df['Category'] = categories

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            result_df.to_excel(writer, index=False, sheet_name='Analyzed SKU')

        output.seek(0)
        filename_root = re.sub(r'\.(xlsx|xls)$', '', file.filename, flags=re.IGNORECASE)
        download_name = f'{filename_root}_analyzed.xlsx'

        response = send_file(
            output,
            as_attachment=True,
            download_name=download_name,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response.headers['X-Processed-Rows'] = str(len(result_df.index))
        response.headers['X-Categorized-Rows'] = str(categorized_rows)
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500
