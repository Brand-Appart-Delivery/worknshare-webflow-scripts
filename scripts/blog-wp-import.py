"""
Migration du blog WordPress (workandshare.com) vers le CMS Webflow — étape 1 :
lecture des articles (API WordPress), nettoyage du contenu Divi et préparation
des fiches. Usage :
    python3 scripts/blog-wp-import.py <dossier de travail>
Le dossier doit contenir posts1.json (wp-json/wp/v2/posts) et covers.json
(image de couverture de chaque article, trouvée dans la liste du blog).
Produit articles.json (fiches prêtes) et images.json (images à télécharger).
"""
import html, json, math, re, sys
from html.parser import HTMLParser

DIR = sys.argv[1]
posts = json.load(open(f"{DIR}/posts1.json"))
covers = json.load(open(f"{DIR}/covers.json"))
slugs = {p["slug"] for p in posts}

# Rubriques Webflow
RUBRIQUES = {
    "nouveaux-espaces": "6ae913e99a2a76a53ebef3b3",
    "evenementiel": "6ae913e99a2a76a53ebef3b5",
    "coulisses": "6ae913e99a2a76a53ebef3b7",
    "facons-de-travailler": "6ae913e99a2a76a53ebef3b1",
    "immobilier-de-bureau": "6ae913e99a2a76a53ebef3af",
}
WP_CATS = {60: "nouveaux-espaces", 63: "evenementiel", 61: "coulisses", 1: "coulisses"}
IMMO = re.compile(r"immobilier|marche|accessibilit", re.I)
AUTEUR = "6ae913eb9a2a76a53ebef5b3"  # Nejma Hadef

# Pages de l'ancien site citées dans les articles -> pages du nouveau site
OLD_PAGES = {
    "": "/",
    "bureaux-flexibles-suresnes": "/espaces/suresnes",
    "bureaux-flexibles-villejuif": "/espaces/villejuif",
    "espace-coworking-val-de-fontenay": "/espaces/val-de-fontenay",
    "evenementiel-evenements-d-entreprise": "/evenementiel",
    "nous-contacter": "/nous-contacter",
}


def rubrique(p):
    cat = p["categories"][0] if p["categories"] else 1
    if cat == 62:  # Entreprise et RH
        return RUBRIQUES["immobilier-de-bureau" if IMMO.search(p["slug"]) else "facons-de-travailler"]
    return RUBRIQUES[WP_CATS.get(cat, "coulisses")]


def original(url):
    """Image d'origine WordPress (sans le suffixe de taille -400x284)."""
    return re.sub(r"-\d+x\d+(\.\w+)$", r"\1", url.split("?")[0])


def text(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def block(s, start):
    """Contenu d'un <div> ouvert à `start` (compte des div imbriqués)."""
    i = s.index(">", start) + 1
    depth, j = 1, i
    for m in re.finditer(r"<(/?)div\b", s[i:]):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return s[i : i + m.start()], i + m.end()
    return s[i:], len(s)


class Clean(HTMLParser):
    """Garde p, titres, listes, citations, gras, italique, liens, br."""

    KEEP = {"p", "ul", "ol", "li", "blockquote", "strong", "em", "a", "br", "h1", "h2", "h3", "h4", "h5", "h6"}
    MAP = {"b": "strong", "i": "em"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []

    def handle_starttag(self, tag, attrs):
        tag = self.MAP.get(tag, tag)
        if tag not in self.KEEP:
            return
        if tag == "a":
            href = dict(attrs).get("href", "")
            m = re.match(r"https?://(?:www\.)?workandshare\.com/?([^/?#]*)/?(#.*)?$", href)
            if m:
                page = m.group(1)
                if page in slugs:
                    href = f"/blog/{page}"
                elif page in OLD_PAGES:
                    href = OLD_PAGES[page]
            self.out.append(f'<a href="{html.escape(href, quote=True)}">')
        elif tag == "br":
            self.out.append("<br>")
        else:
            self.out.append(f"<{tag}>")

    def handle_endtag(self, tag):
        tag = self.MAP.get(tag, tag)
        if tag in self.KEEP and tag != "br":
            self.out.append(f"</{tag}>")

    def handle_data(self, data):
        self.out.append(html.escape(data, quote=False))


def clean(fragment):
    c = Clean()
    c.feed(fragment)
    s = "".join(c.out)
    # balises vides (plusieurs passes : imbrications)
    for _ in range(4):
        s = re.sub(r"<(p|h\d|strong|em|li|blockquote|ul|ol)>\s*(?:&nbsp;| )?\s*</\1>", "", s)
    # titre entièrement en gras : le gras ne sert à rien
    s = re.sub(r"<(h\d)>\s*<strong>(.*?)</strong>\s*</\1>", r"<\1>\2</\1>", s)
    return re.sub(r"\s{2,}", " ", s).strip()


def from_shortcodes(c):
    """Articles restés en codes Divi bruts ([et_pb_text]…) : convertis en HTML."""
    if "[et_pb_" not in c:
        return c
    # guillemets typographiques de WordPress autour des valeurs
    c = re.sub(r"=[ \u00a0]*»", '="', c)
    c = re.sub(r"[ \u00a0]*»", '"', c)
    c = c.replace("&Prime;", '"').replace("″", '"')
    c = re.sub(r"<p>\s*(\[/?et_pb_[^\]]*\])", r"\1", c)
    c = re.sub(r"(\[/?et_pb_[^\]]*\])\s*</p>", r"\1", c)
    attr = lambda tag, name: (re.search(name + r'="([^"]*)"', tag) or [None, ""])[1]
    c = re.sub(r"\[et_pb_text[^\]]*\]", '<div class="et_pb_text_inner">', c)
    c = c.replace("[/et_pb_text]", "</div>")
    c = re.sub(
        r"\[et_pb_image([^\]]*)\]\s*\[/et_pb_image\]",
        lambda m: f'<div class="et_pb_module et_pb_image"><img src="{attr(m.group(1), "src")}" alt="{attr(m.group(1), "alt") or attr(m.group(1), "title_text")}"></div>',
        c,
    )
    c = re.sub(
        r"\[et_pb_accordion_item([^\]]*)\]",
        lambda m: f'<div class="et_pb_accordion_item"><h5 class="et_pb_toggle_title">{attr(m.group(1), "title")}</h5><div class="et_pb_toggle_content">',
        c,
    )
    c = c.replace("[/et_pb_accordion_item]", "</div></div>")
    return re.sub(r"\[/?et_pb_[^\]]*\]", "", c)


articles, images = [], {}
for p in posts:
    c = from_shortcodes(p["content"]["rendered"])
    parts, faq = [], []
    pos = 0
    pattern = re.compile(r'<div class="(et_pb_text_inner|et_pb_module et_pb_image[^"]*|[^"]*et_pb_accordion_item[^"]*)"')
    for m in pattern.finditer(c):
        if m.start() < pos:
            continue
        inner, pos = block(c, m.start())
        kind = m.group(1)
        if kind == "et_pb_text_inner":
            parts.append(("html", clean(inner)))
        elif "et_pb_image" in kind:
            img = re.search(r"<img[^>]*>", inner)
            if img:
                tag = img.group(0)
                found = re.search(r'(?:data-src|src)="([^"]+)"', tag)
                if not found:
                    continue
                src = found.group(1)
                alt = (re.search(r'alt="([^"]*)"', tag) or [None, ""])[1] or (re.search(r'title="([^"]*)"', tag) or [None, ""])[1]
                parts.append(("img", original(src), html.unescape(alt)))
        else:
            q = re.search(r'<h5 class="et_pb_toggle_title">(.*?)</h5>', inner, re.S)
            a = re.search(r'<div class="et_pb_toggle_content[^"]*">(.*)', inner, re.S)
            if q and a:
                faq.append({"question": text(q.group(1)), "reponse": clean(a.group(1))})

    # titre de la FAQ (« On répond à vos questions ! ») : la FAQ a sa propre section
    if faq:
        parts = [x for x in parts if not (x[0] == "html" and re.fullmatch(r"\s*<h\d>[^<]*question[^<]*</h\d>\s*", x[1], re.I))]
    body = "".join(x[1] if x[0] == "html" else f"\x00IMG{len(images)}\x00" for x in parts)
    # titres : les niveaux utilisés deviennent h2 puis h3
    levels = sorted({int(l) for l in re.findall(r"<h(\d)>", body)})
    for i, lvl in enumerate(levels):
        new = 2 if i == 0 else 3
        body = body.replace(f"<h{lvl}>", f"<H{new}>").replace(f"</h{lvl}>", f"</H{new}>")
    body = body.replace("<H", "<h").replace("</H", "</h")

    # chapeau = premier paragraphe (retiré du corps)
    first = re.match(r"\s*<p>(.*?)</p>", body, re.S)
    chapeau = text(first.group(1)) if first else ""
    if first:
        body = body[first.end():]
    else:
        y0 = p.get("yoast_head_json") or {}
        chapeau = y0.get("description") or text(p["excerpt"]["rendered"])[:200]

    cover = original(covers.get(p["slug"], ""))
    images[cover] = {"role": "cover", "alt": text(p["title"]["rendered"])}
    # images du corps (sauf la couverture, déjà en tête d'article)
    k = 0
    for x in parts:
        if x[0] != "img":
            continue
        marker = f"\x00IMG{len(images) if False else 0}\x00"
    figs = [x for x in parts if x[0] == "img"]
    idx = [m.start() for m in re.finditer("\x00IMG", body)]
    pieces = re.split(r"\x00IMG\d+\x00", body)
    rebuilt = pieces[0]
    for fig, rest in zip(figs[: len(pieces) - 1], pieces[1:]):
        if fig[1] != cover:
            images.setdefault(fig[1], {"role": "body", "alt": fig[2]})
            rebuilt += f"\x01{fig[1]}\x01{fig[2]}\x01"
        rebuilt += rest
    body = rebuilt

    y = p.get("yoast_head_json") or {}
    words = len(text(body).split()) + len(chapeau.split())
    articles.append(
        {
            "slug": p["slug"],
            "name": text(p["title"]["rendered"]),
            "chapeau": chapeau,
            "extrait": (y.get("description") or text(p["excerpt"]["rendered"]))[:220],
            "seo-titre": text(y.get("title") or p["title"]["rendered"]),
            "seo-description": y.get("description") or "",
            "date": p["date_gmt"] + "Z",
            "rubrique": rubrique(p),
            "auteur": AUTEUR,
            "temps": max(1, math.ceil(words / 200)),
            "cover": cover,
            "corps": body,
            "faq": faq,
            "wp_link": p["link"],
        }
    )

# --- Corrections de contenu venues du WordPress ---
FILENAME = re.compile(r"(?:^|\s)(?:img|dsc|nic|0m5a|image|capture|ws|ok|se|bp)[\s_-]*\d|_|\d{4,}", re.I)
from collections import Counter

desc_count = Counter(a["seo-description"] for a in articles if a["seo-description"])
for a in articles:
    # Images dont le texte alternatif est un nom de fichier : titre de l'article
    def alt_fix(m):
        alt = m.group(2)
        if not alt.strip() or FILENAME.search(alt):
            alt = a["name"]
        return f"\x01{m.group(1)}\x01{alt}\x01"
    a["corps"] = re.sub("\x01(.*?)\x01(.*?)\x01", alt_fix, a["corps"])
    # Description SEO copiée d'un autre article : on prend l'extrait de l'article
    d = a["seo-description"]
    GENERIC = {"work", "share", "espace", "espaces", "nouvel", "nouveau", "bureau", "bureaux", "entreprise"}
    own = [w for w in a["slug"].split("-") if len(w) > 4 and w not in GENERIC]
    if not d or (desc_count[d] > 1 and not any(w in d.lower() for w in own)):
        exc = text([p for p in posts if p["slug"] == a["slug"]][0]["excerpt"]["rendered"])
        exc = exc[:200].rsplit(" ", 1)[0].rstrip(",;:") + "…" if len(exc) > 200 else exc
        a["seo-description"] = a["extrait"] = exc
    # Mentions isolées hors paragraphe (« Credit photo : … ») : dans un <p>
    a["corps"] = re.sub(r"(^|</p>|</h\d>|</ul>|</ol>|</blockquote>|\x01)\s*((?:<em>|<strong>)[^<]*(?:</em>|</strong>))\s*(?=<p>|<h\d>|<ul>|<ol>|\x01|$)", r"\1<p>\2</p>", a["corps"])

json.dump(articles, open(f"{DIR}/articles.json", "w"), ensure_ascii=False, indent=1)
json.dump(images, open(f"{DIR}/images.json", "w"), ensure_ascii=False, indent=1)
print(f"{len(articles)} articles, {len(images)} images, {sum(len(a['faq']) for a in articles)} questions FAQ")
for a in articles[:3]:
    print("—", a["name"], "|", a["temps"], "min |", a["chapeau"][:80])
