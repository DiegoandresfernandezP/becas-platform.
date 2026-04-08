import os
import json
import feedparser
import requests
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import re

# Configuración
JSON_FILE = 'data/becas.json'
OUTPUT_FILE = 'data/becas.json'
MAX_BECAS = 150  # Límite para no hacer el archivo gigante

# FUENTES DE MONITOREO (Embajadas, Organismos, Universidades Top)
# Nota: Usamos RSS donde hay, y URLs específicas para scraping básico si es necesario.
SOURCES = [
    # --- EUROPA ---
    {"name": "Erasmus Mundus", "url": "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en", "type": "web", "region": "Europa"},
    {"name": "DAAD (Alemania)", "url": "https://www.daad.de/en/study-and-research-in-germany/scholarships/feed/", "type": "rss", "region": "Alemania"},
    {"name": "Campus France", "url": "https://www.campusfrance.org/en/rss.xml", "type": "rss", "region": "Francia"},
    {"name": "Fundación Carolina (España)", "url": "https://www.fundacioncarolina.es/feed/", "type": "rss", "region": "España"},
    {"name": "Study in Italy", "url": "https://studyinitaly.esteri.it/en/news/rss", "type": "rss", "region": "Italia"},
    
    # --- AMÉRICAS ---
    {"name": "Fulbright (USA)", "url": "https://us.fulbrightonline.org/news/rss.xml", "type": "rss", "region": "USA"},
    {"name": "ICETEX (Colombia)", "url": "https://www.icetex.gov.co/es-co/home/rss.aspx", "type": "rss", "region": "Colombia"},
    {"name": "Ciencia sem Fronteiras / CAPES (Brasil)", "url": "http://www.capes.gov.br/noticias/rss", "type": "rss", "region": "Brasil"},
    {"name": "CONACYT (México)", "url": "https://conacyt.gob.mx/index.php/component/k2/itemlist.feed?format=raw", "type": "rss", "region": "México"},
    
    # --- ASIA & OTROS ---
    {"name": "MEXT (Japón)", "url": "https://www.studyinjapan.go.jp/en/news/", "type": "web", "region": "Japón"}, # Web scraping básico
    {"name": "GKS (Corea)", "url": "https://www.studyinkorea.go.kr/en/board/list.do?siteId=global&menuId=ENG_M01_A060100", "type": "web", "region": "Corea"},
    {"name": " CSC (China)", "url": "http://www.csc.edu.cn/laihua/ennews.shtml", "type": "web", "region": "China"},
    
    # --- UNIVERSIDADES TOP 50 (Ejemplos con feeds de noticias/admisiones) ---
    {"name": "MIT News", "url": "https://news.mit.edu/topic/mit-students-rss.xml", "type": "rss", "region": "USA"},
    {"name": "Stanford News", "url": "https://news.stanford.edu/feed/", "type": "rss", "region": "USA"},
    {"name": "ETH Zurich", "url": "https://ethz.ch/en/news-and-events/eth-news.news.html?format=rss", "type": "rss", "region": "Suiza"},
    {"name": "Cambridge", "url": "https://www.cam.ac.uk/research/news/rss.xml", "type": "rss", "region": "UK"},
    {"name": "Oxford", "url": "https://www.ox.ac.uk/news/rss.xml", "type": "rss", "region": "UK"},
]

def load_existing_becas():
    if os.path.exists(JSON_FILE):
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def parse_date(date_str):
    """Intenta convertir varios formatos de fecha a objeto datetime"""
    if not date_str:
        return None
    formats = [
        "%Y-%m-%d", "%d/%m/%Y", "%B %d, %Y", "%b %d, %Y", 
        "%Y-%m-%dT%H:%M:%SZ", "%a, %d %b %Y %H:%M:%S %Z"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    # Si no se puede parsear, asumimos fecha lejana (rolling deadline)
    return datetime.now() + timedelta(days=365)

def is_future_deadline(deadline_str):
    """Verifica si la fecha es futura o es 'rolling'"""
    if not deadline_str or "rolling" in deadline_str.lower() or "open" in deadline_str.lower():
        return True
    date_obj = parse_date(deadline_str)
    if not date_obj:
        return True # Si no hay fecha, asumimos que sigue abierta por seguridad
    return date_obj >= datetime.now()

def detect_type(title, summary):
    """Detecta el tipo de oportunidad basado en palabras clave"""
    text = (title + " " + summary).lower()
    
    if any(x in text for x in ["internship", "pasantía", "prácticas", "trainee"]):
        return "Internship"
    elif any(x in text for x in ["summer", "verano", "school", "camp"]):
        return "Verano"
    elif any(x in text for x in ["phd", "doctorado", "researcher"]):
        return "Doctorado"
    elif any(x in text for x in ["master", "maestría", "msc", "mba"]):
        return "Maestría"
    elif any(x in text for x in ["competition", "contest", "hackathon", "brandstorm", "challenge"]):
        return "Competencia"
    elif any(x in text for x in ["course", "curso", "workshop", "bootcamp", "training"]):
        return "Curso"
    elif any(x in text for x in ["fellowship", "beca", "scholarship", "grant"]):
        return "Beca"
    else:
        return "Otro"

def extract_info_from_entry(entry, source_name, region):
    """Extrae información estructurada incluyendo el Tipo"""
    title = entry.get('title', 'Sin título')
    link = entry.get('link', '#')
    published = entry.get('published', entry.get('updated', ''))
    summary = entry.get('summary', '')
    
    # --- DETECCIÓN DE TIPO ---
    tipo_oportunidad = detect_type(title, summary)
    
    # Detección de Nivel (se mantiene pero refinada)
    level = []
    if tipo_oportunidad == "Verano" or tipo_oportunidad == "Internship":
        level = ["Pregrado", "Maestría"] # Por defecto para estos tipos
    elif any(x in title.lower() for x in ["phd", "doctoral"]):
        level = ["Doctorado"]
    elif any(x in title.lower() for x in ["master", "maestría"]):
        level = ["Maestría"]
    elif any(x in title.lower() for x in ["high school", "secundaria", "teen"]):
        level = ["Secundaria"]
    else:
        level = ["Todos"]

    # Detección de Área
    area = ["Todas"]
    if any(x in title.lower() for x in ["cs", "computer", "ai", "data", "engineer", "robot"]):
        area = ["STEM", "Computer Science"]
    elif any(x in title.lower() for x in ["bio", "med", "health", "neuro"]):
        area = ["Salud", "Neurociencia"]
    elif any(x in title.lower() for x in ["business", "econ", "management"]):
        area = ["Negocios"]

    # Generar ID ESTABLE (Hash basado en contenido limpio)
    import hashlib
    clean_title = re.sub(r'\W+', '', title.lower())
    unique_string = f"{clean_title}_{source_name}_{region}"
    stable_id = "auto_" + hashlib.md5(unique_string.encode()).hexdigest()[:12]
    
    # Inferir Deadline (Lógica simple)
    deadline = "Verificar en web"
    # Aquí podrías agregar lógica para buscar fechas en el texto si el RSS las trae desordenadas
    
    return {
        "id": stable_id,
        "titulo": title,
        "institucion": source_name,
        "pais": region,
        "tipo": tipo_oportunidad,  # <--- NUEVO CAMPO
        "nivel": level,
        "area": area,
        "financiamiento": "Variable",
        "deadline": deadline,
        "url_convocatoria": link,
        "requisitos_idioma": ["Inglés"],
        "documentos_sugeridos": ["CV", "Carta Motivación"],
        "tags": [tipo_oportunidad, region],
        "source_type": "rss_auto"
    }

def check_and_update_becas():
    existing_becas = load_existing_becas()
    new_becas_found = []
    reactivated_becas = []
    
    print(f"Iniciando escaneo de {len(SOURCES)} fuentes...")
    
    # 1. Escanear nuevas fuentes RSS/Web
    for source in SOURCES:
        try:
            if source['type'] == 'rss':
                feed = feedparser.parse(source['url'])
                for entry in feed.entries[:5]: # Revisar últimas 5 noticias de cada fuente
                    info = extract_info_from_entry(entry, source['name'], source['region'])
                    
                    # Verificar si ya existe por título similar o URL
                    exists = any(
                        b['titulo'] == info['titulo'] or b['url_convocatoria'] == info['url_convocatoria'] 
                        for b in existing_becas
                    )
                    
                    if not exists:
                        # Validar si parece una beca real (filtro básico)
                        if any(k in info['titulo'].lower() for k in ["scholarship", "beca", "fellowship", "grant", "internship", "program"]):
                            new_becas_found.append(info)
                            print(f"✅ Nueva oportunidad detectada: {info['titulo']}")
            
            # Nota: El scraping web profundo (tipo 'web') requiere lógica específica por sitio
            # Por ahora, nos enfocamos en RSS que son más estables para automatización
            
        except Exception as e:
            print(f"⚠️ Error leyendo {source['name']}: {str(e)}")

    # 2. RE-VALIDACIÓN DE BECAS CERRADAS (Lógica Inteligente)
    print("\n🔄 Iniciando re-validación de becas existentes...")
    current_date = datetime.now()
    
    for i, beca in enumerate(existing_becas):
        deadline_str = beca.get('deadline', '')
        status = beca.get('status', 'active') # Asumimos activo por defecto si no hay campo
        
        # Si la beca tenía una fecha pasada
        if deadline_str and deadline_str != "Verificar en web":
            try:
                # Parsear fecha original
                # Formato esperado en JSON: YYYY-MM-DD
                if len(deadline_str) == 10: 
                    past_date = datetime.strptime(deadline_str, "%Y-%m-%d")
                    
                    # Si pasó hace menos de 60 días, verificamos si hubo actualización
                    days_diff = (current_date - past_date).days
                    
                    if 0 < days_diff < 90: # Ventana de 3 meses post-deadline
                        # Lógica de re-validación:
                        # 1. Revisar si el título contiene el año anterior (ej. 2025) y estamos en 2026
                        if str(past_date.year) in beca['titulo'] and str(current_date.year) in str(datetime.now().year):
                             # Podría ser una nueva edición, marcamos para revisión manual o actualizamos año
                             pass # En una versión avanzada, haríamos request a la URL para ver si cambia el año
                        
                        # 2. Si la URL sigue activa y el contenido tiene "2026" o "2027", reactivamos
                        # (Simulado aquí: si es una beca recurrente conocida como 'Erasmus' o 'Fulbright')
                        recurrent_keywords = ["erasmus", "fulbright", "chevening", "daad", "carolina", "oist", "gks"]
                        is_recurrent = any(k in beca['titulo'].lower() for k in recurrent_keywords)
                        
                        if is_recurrent:
                            # Actualizamos el año del deadline al siguiente ciclo (ej. +1 año)
                            new_deadline = deadline_str.replace(str(past_date.year), str(current_date.year))
                            # Si la nueva fecha también pasó, sumamos otro año
                            if datetime.strptime(new_deadline, "%Y-%m-%d") < current_date:
                                new_deadline = new_deadline.replace(str(current_date.year), str(current_date.year + 1))
                            
                            existing_becas[i]['deadline'] = new_deadline
                            existing_becas[i]['tags'].append("Re-Validada Auto")
                            reactivated_becas.append(beca['titulo'])
                            print(f"🔄 Becas reactivada (Ciclo nuevo): {beca['titulo']} -> {new_deadline}")

            except Exception as e:
                continue

    # 3. Fusionar y Guardar
    final_list = existing_becas + new_becas_found
    
    # Eliminar duplicados exactos por ID (por seguridad)
    unique_becas = []
    seen_ids = set()
    for b in final_list:
        if b['id'] not in seen_ids:
            seen_ids.add(b['id'])
            unique_becas.append(b)
            
    # Ordenar por deadline (más urgentes primero)
    # Nota: Requiere manejo de errores si hay fechas mal formateadas
    unique_becas.sort(key=lambda x: x.get('deadline', '9999-99-99'))

    # Guardar
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(unique_becas, f, indent=2, ensure_ascii=False)

    print(f"\n📊 Resumen:")
    print(f"   - Nuevas detectadas: {len(new_becas_found)}")
    print(f"   - Re-validadas (Ciclo nuevo): {len(reactivated_becas)}")
    print(f"   - Total en base de datos: {len(unique_becas)}")
    
    # Crear mensaje para el commit
    msg = f"Auto-update: {len(new_becas_found)} nuevas, {len(reactivated_becas)} re-validadas."
    with open(os.environ.get('GITHUB_OUTPUT', '/dev/null'), 'a') as gh_out:
        gh_out.write(f"commit_message={msg}\n")

if __name__ == "__main__":
    check_and_update_becas()
