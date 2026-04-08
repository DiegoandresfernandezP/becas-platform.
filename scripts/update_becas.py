import feedparser
import json
import os
from datetime import datetime

# Configuración
JSON_FILE = 'data/becas.json'
# Ejemplo de feeds públicos de oportunidades (puedes agregar más aquí)
RSS_FEEDS = [
    "https://www.scholarshippositions.com/feed/",
    "https://scholarshipdb.net/rss.xml"
    # Aquí irían los feeds de embajadas si estuvieran disponibles públicamente
]

def load_existing_becas():
    if os.path.exists(JSON_FILE):
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_becas(becas):
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(becas, f, indent=2, ensure_ascii=False)

def main():
    print("Iniciando actualización de becas...")
    existing_becas = load_existing_becas()
    existing_titles = {b['titulo'] for b in existing_becas}
    new_count = 0

    for feed_url in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:5]: # Revisamos las 5 más recientes de cada feed
                title = entry.title
                if title not in existing_titles:
                    # Crear nueva entrada básica
                    new_beca = {
                        "id": f"auto_{int(datetime.now().timestamp())}",
                        "titulo": title,
                        "institucion": entry.get('author', 'Fuente Externa'),
                        "pais": "Internacional",
                        "nivel": ["Todos"],
                        "area": ["General"],
                        "financiamiento": "Ver detalles",
                        "deadline": "Ver web oficial",
                        "url_convocatoria": entry.link,
                        "requisitos_idioma": ["Inglés"],
                        "documentos_sugeridos": ["CV", "Carta Motivación"],
                        "tags": ["Auto-Agregado", "RSS"]
                    }
                    existing_becas.append(new_beca)
                    existing_titles.add(title)
                    new_count += 1
                    print(f"Nueva beca encontrada: {title}")
        except Exception as e:
            print(f"Error leyendo feed {feed_url}: {e}")

    if new_count > 0:
        save_becas(existing_becas)
        print(f"Éxito: {new_count} nuevas becas agregadas.")
    else:
        print("No se encontraron nuevas becas en esta ejecución.")

if __name__ == "__main__":
    main()
