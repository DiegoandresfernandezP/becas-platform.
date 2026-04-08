import json
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
import os

# Configuración
JSON_FILE = 'data/becas.json'
# Lista de fuentes RSS reales de embajadas y organismos (Ejemplos públicos)
RSS_FEEDS = [
    "https://www.daad.de/de/information/stipendium/news/feed/", # DAAD Alemania (Ejemplo)
    "https://campusfrance.org/fr/rss.xml", # Campus France (Ejemplo genérico)
    # Aquí puedes agregar más URLs de feeds RSS de embajadas cuando las identifiques
]

def load_existing_becas():
    if not os.path.exists(JSON_FILE):
        return []
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_becas(becas):
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(becas, f, indent=2, ensure_ascii=False)

def parse_rss_feed(url):
    nuevas_becas = []
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            channel = root.find('channel')
            if channel:
                for item in channel.findall('item'):
                    title = item.find('title').text if item.find('title') is not None else "Sin título"
                    link = item.find('link').text if item.find('link') is not None else "#"
                    desc = item.find('description').text if item.find('description') is not None else ""
                    pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ""
                    
                    # Lógica simple para detectar si es beca (palabras clave)
                    if any(x in title.lower() for x in ['scholarship', 'beca', 'stipend', 'grant', 'fellowship']):
                        # Generar ID único basado en el link
                        bec_id = f"rss_{abs(hash(link))}"
                        
                        nuevas_becas.append({
                            "id": bec_id,
                            "titulo": title,
                            "institucion": "Actualización Automática",
                            "pais": "Internacional",
                            "nivel": ["Todos"],
                            "area": ["Todas"],
                            "financiamiento": "Ver detalles",
                            "deadline": "Ver web oficial",
                            "url_convocatoria": link,
                            "requisitos_idioma": ["Inglés"],
                            "documentos_sugeridos": ["CV", "Carta Motivación"],
                            "tags": ["RSS", "Automático", "Nuevo"]
                        })
    except Exception as e:
        print(f"Error leyendo {url}: {e}")
    return nuevas_becas

def main():
    print("Iniciando actualización automática...")
    existing_becas = load_existing_becas()
    existing_ids = {b['id'] for b in existing_becas}
    
    count_new = 0
    
    for feed_url in RSS_FEEDS:
        print(f"Leyendo feed: {feed_url}")
        nuevos_items = parse_rss_feed(feed_url)
        
        for item in nuevos_items:
            if item['id'] not in existing_ids:
                existing_becas.append(item)
                existing_ids.add(item['id'])
                count_new += 1
                print(f"Nueva beca encontrada: {item['titulo']}")
    
    if count_new > 0:
        save_becas(existing_becas)
        print(f"Éxito: {count_new} nuevas becas agregadas.")
        # Crear archivo marcador para que GitHub Actions sepa que hubo cambios
        with open('changes_detected.txt', 'w') as f:
            f.write(f"{count_new} nuevas becas agregadas el {datetime.now()}")
    else:
        print("No se encontraron nuevas becas en esta ejecución.")

if __name__ == "__main__":
    main()import json
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
import os

# Configuración
JSON_FILE = 'data/becas.json'
# Lista de fuentes RSS reales de embajadas y organismos (Ejemplos públicos)
RSS_FEEDS = [
    "https://www.daad.de/de/information/stipendium/news/feed/", # DAAD Alemania (Ejemplo)
    "https://campusfrance.org/fr/rss.xml", # Campus France (Ejemplo genérico)
    # Aquí puedes agregar más URLs de feeds RSS de embajadas cuando las identifiques
]

def load_existing_becas():
    if not os.path.exists(JSON_FILE):
        return []
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_becas(becas):
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(becas, f, indent=2, ensure_ascii=False)

def parse_rss_feed(url):
    nuevas_becas = []
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            channel = root.find('channel')
            if channel:
                for item in channel.findall('item'):
                    title = item.find('title').text if item.find('title') is not None else "Sin título"
                    link = item.find('link').text if item.find('link') is not None else "#"
                    desc = item.find('description').text if item.find('description') is not None else ""
                    pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ""
                    
                    # Lógica simple para detectar si es beca (palabras clave)
                    if any(x in title.lower() for x in ['scholarship', 'beca', 'stipend', 'grant', 'fellowship']):
                        # Generar ID único basado en el link
                        bec_id = f"rss_{abs(hash(link))}"
                        
                        nuevas_becas.append({
                            "id": bec_id,
                            "titulo": title,
                            "institucion": "Actualización Automática",
                            "pais": "Internacional",
                            "nivel": ["Todos"],
                            "area": ["Todas"],
                            "financiamiento": "Ver detalles",
                            "deadline": "Ver web oficial",
                            "url_convocatoria": link,
                            "requisitos_idioma": ["Inglés"],
                            "documentos_sugeridos": ["CV", "Carta Motivación"],
                            "tags": ["RSS", "Automático", "Nuevo"]
                        })
    except Exception as e:
        print(f"Error leyendo {url}: {e}")
    return nuevas_becas

def main():
    print("Iniciando actualización automática...")
    existing_becas = load_existing_becas()
    existing_ids = {b['id'] for b in existing_becas}
    
    count_new = 0
    
    for feed_url in RSS_FEEDS:
        print(f"Leyendo feed: {feed_url}")
        nuevos_items = parse_rss_feed(feed_url)
        
        for item in nuevos_items:
            if item['id'] not in existing_ids:
                existing_becas.append(item)
                existing_ids.add(item['id'])
                count_new += 1
                print(f"Nueva beca encontrada: {item['titulo']}")
    
    if count_new > 0:
        save_becas(existing_becas)
        print(f"Éxito: {count_new} nuevas becas agregadas.")
        # Crear archivo marcador para que GitHub Actions sepa que hubo cambios
        with open('changes_detected.txt', 'w') as f:
            f.write(f"{count_new} nuevas becas agregadas el {datetime.now()}")
    else:
        print("No se encontraron nuevas becas en esta ejecución.")

if __name__ == "__main__":
    main()import json
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
import os

# Configuración
JSON_FILE = 'data/becas.json'
# Lista de fuentes RSS reales de embajadas y organismos (Ejemplos públicos)
RSS_FEEDS = [
    "https://www.daad.de/de/information/stipendium/news/feed/", # DAAD Alemania (Ejemplo)
    "https://campusfrance.org/fr/rss.xml", # Campus France (Ejemplo genérico)
    # Aquí puedes agregar más URLs de feeds RSS de embajadas cuando las identifiques
]

def load_existing_becas():
    if not os.path.exists(JSON_FILE):
        return []
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_becas(becas):
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(becas, f, indent=2, ensure_ascii=False)

def parse_rss_feed(url):
    nuevas_becas = []
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            channel = root.find('channel')
            if channel:
                for item in channel.findall('item'):
                    title = item.find('title').text if item.find('title') is not None else "Sin título"
                    link = item.find('link').text if item.find('link') is not None else "#"
                    desc = item.find('description').text if item.find('description') is not None else ""
                    pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ""
                    
                    # Lógica simple para detectar si es beca (palabras clave)
                    if any(x in title.lower() for x in ['scholarship', 'beca', 'stipend', 'grant', 'fellowship']):
                        # Generar ID único basado en el link
                        bec_id = f"rss_{abs(hash(link))}"
                        
                        nuevas_becas.append({
                            "id": bec_id,
                            "titulo": title,
                            "institucion": "Actualización Automática",
                            "pais": "Internacional",
                            "nivel": ["Todos"],
                            "area": ["Todas"],
                            "financiamiento": "Ver detalles",
                            "deadline": "Ver web oficial",
                            "url_convocatoria": link,
                            "requisitos_idioma": ["Inglés"],
                            "documentos_sugeridos": ["CV", "Carta Motivación"],
                            "tags": ["RSS", "Automático", "Nuevo"]
                        })
    except Exception as e:
        print(f"Error leyendo {url}: {e}")
    return nuevas_becas

def main():
    print("Iniciando actualización automática...")
    existing_becas = load_existing_becas()
    existing_ids = {b['id'] for b in existing_becas}
    
    count_new = 0
    
    for feed_url in RSS_FEEDS:
        print(f"Leyendo feed: {feed_url}")
        nuevos_items = parse_rss_feed(feed_url)
        
        for item in nuevos_items:
            if item['id'] not in existing_ids:
                existing_becas.append(item)
                existing_ids.add(item['id'])
                count_new += 1
                print(f"Nueva beca encontrada: {item['titulo']}")
    
    if count_new > 0:
        save_becas(existing_becas)
        print(f"Éxito: {count_new} nuevas becas agregadas.")
        # Crear archivo marcador para que GitHub Actions sepa que hubo cambios
        with open('changes_detected.txt', 'w') as f:
            f.write(f"{count_new} nuevas becas agregadas el {datetime.now()}")
    else:
        print("No se encontraron nuevas becas en esta ejecución.")

if __name__ == "__main__":
    main()
