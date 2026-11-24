#!/usr/bin/env python3
"""Référencement : recopie le contenu de content/*.json dans le HTML statique.

Google lit d'abord index.html tel quel (sans JavaScript) : ce script y écrit le titre,
la description, les balises de partage, les données structurées (JSON-LD), le nom en
en-tête et la liste des projets, à partir de content/infos.json et content/projets.json.
Il fait de même pour l'en-tête de contact.html (titre, description, partage, JSON-LD
ContactPage) et met à jour sitemap.xml (accueil + page contact). Lancé automatiquement par
.github/workflows/referencement.yml à chaque modification de content/ (Pages CMS).

Sans dépendance (Python 3 standard). En cas de problème, il s'arrête sans rien écrire :
le site continue de fonctionner, contenu.js refabrique tout dans le navigateur.
Usage : python3 .github/seo/generer.py [dossier du site]
"""
import datetime
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

URL = 'https://victoiregrd.github.io/Portfolio/'
URL_CONTACT = URL + 'contact.html'
IMAGE_PARTAGE = URL + 'assets/partage.jpg'
IMAGE_PORTRAIT = URL + 'assets/emoji/victoire-paix.png'

racine = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()


def lire(nom):
    try:
        return json.loads((racine / 'content' / f'{nom}.json').read_text(encoding='utf-8'))
    except FileNotFoundError:
        return {}


def esc(s):
    return html.escape(str(s if s is not None else ''), quote=True)


def liste(v):
    return [x for x in v if x is not None and x != ''] if isinstance(v, list) else []


def slug(s):
    s = unicodedata.normalize('NFD', str(s or ''))
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r'^-+|-+$', '', re.sub(r'[^a-z0-9]+', '-', s))[:40]


def lien_contact(v, site):
    """Même règle que main.js : pseudo, @pseudo, adresse sans https ou lien complet."""
    v = str(v or '').strip()
    if not v:
        return ''
    if re.match(r'^https?://', v, re.I):
        return v
    if re.match(r'^[\w.-]+\.[a-z]{2,}/', v, re.I):
        return 'https://' + v
    return site + re.sub(r'^@', '', v) + '/'


def version_remplie(v):
    return isinstance(v, dict) and bool(
        v.get('titreCarte') or v.get('texte') or liste(v.get('textes')) or v.get('grille') or v.get('vignette')
        or any(isinstance(f, dict) and f.get('image') for f in liste(v.get('figures')))
        or any(isinstance(f, dict) and f.get('image') for f in liste(v.get('bandes'))))


def entrees_projets(blocs):
    """Même découpage que preparerProjets() dans contenu.js : une entrée par carte de l'orbite."""
    pris, entrees = set(), []

    def unique(id_, titre, i):
        base = str(id_) if re.match(r'^[a-z][a-z0-9-]*$', str(id_ or ''), re.I) else ''
        if not base:
            base = 'projet-' + (slug(titre) or str(i + 1))
        v, k = base, 2
        while v in pris:
            v, k = f'{base}-{k}', k + 1
        pris.add(v)
        return v

    tous = [b for b in liste(blocs) if isinstance(b, dict)]
    if not tous:
        tous = [{'modele': 'projet', 'titre': 'Projets à venir'}]
    for i, b in enumerate(tous):
        if b.get('modele') == 'kaathoon':
            versions = [(n, v) for n, v in (('1', b.get('v1')), ('2', b.get('v2'))) if version_remplie(v)]
            if not versions:
                versions = [('1', b.get('v1') if isinstance(b.get('v1'), dict) else {})]
            for k, (n, v) in enumerate(versions):
                titre = v.get('titreCarte') or f"{b.get('titre') or ''} V{n}"
                entrees.append({'id': unique(v.get('id') or ('' if k else b.get('id')), titre, i),
                                'titre': titre, 'sousTitre': v.get('sousTitre') or ''})
            continue
        entrees.append({'id': unique(b.get('id'), b.get('titre'), i),
                        'titre': b.get('titre') or 'Projet', 'sousTitre': b.get('sousTitre') or ''})
    for n, e in enumerate(entrees, 1):
        e['num'] = f'{n:02d}'
    return entrees


def remplacer(texte, motif, nouveau, nom):
    """Remplace exactement une zone ; sinon arrêt sans rien écrire."""
    resultat, n = re.subn(motif, lambda m: m.group(1) + nouveau + m.group(2), texte, count=1, flags=re.S)
    if n != 1:
        sys.exit(f'Zone introuvable dans index.html : {nom} (rien n’a été modifié)')
    return resultat


def main():
    infos, projets = lire('infos'), lire('projets')
    contact = infos.get('contact') if isinstance(infos.get('contact'), dict) else {}
    nom = str(infos.get('nom') or 'Victoire Giroard').strip()
    metier = str(infos.get('metier') or 'designer graphique').strip()
    annee = str(infos.get('annee') or '').strip()
    titre = str(infos.get('titreOnglet') or f'{nom} — Designer graphique · Portfolio').strip()
    description = str(infos.get('description') or f'Portfolio de {nom}, {metier}.').strip()
    entrees = entrees_projets(projets.get('projets') if isinstance(projets, dict) else None)
    nb = len(entrees)
    nb_txt = f"{nb} projet{'s' if nb > 1 else ''}"
    reseaux = [u for u in (lien_contact(contact.get('instagram'), 'https://www.instagram.com/'),
                           lien_contact(contact.get('linkedin'), 'https://www.linkedin.com/in/')) if u]

    moyens = [m for m, v in (('e-mail', contact.get('email')), ('LinkedIn', contact.get('linkedin')),
                             ('Instagram', contact.get('instagram')), ('téléphone', contact.get('telephone')))
              if isinstance(v, (str, int, float)) and str(v).strip()]

    # données structurées : la page de profil de Victoire (Person) et le site (WebSite)
    personne = {'@type': 'Person', '@id': URL + '#personne', 'name': nom,
                'jobTitle': metier[:1].upper() + metier[1:], 'url': URL, 'image': IMAGE_PORTRAIT,
                'knowsAbout': ['Design graphique', 'Affiche', 'Identité visuelle', 'Packaging']}
    if reseaux:
        personne['sameAs'] = reseaux
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'ProfilePage', '@id': URL + '#page', 'url': URL, 'name': titre, 'description': description,
         'inLanguage': 'fr-FR', 'isPartOf': {'@id': URL + '#site'}, 'mainEntity': {'@id': URL + '#personne'},
         'primaryImageOfPage': IMAGE_PARTAGE},
        {'@type': 'WebSite', '@id': URL + '#site', 'url': URL, 'name': f'{nom} — Portfolio',
         'inLanguage': 'fr-FR', 'author': {'@id': URL + '#personne'}},
        personne]}
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=1).replace('</', '<\\/')

    alt_partage = f'{nom}, {metier} : portfolio'
    tete = f'''
<title>{esc(titre)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{URL}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="profile">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="{esc(nom)}">
<meta property="og:url" content="{URL}">
<meta property="og:title" content="{esc(titre)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:image" content="{IMAGE_PARTAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(alt_partage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(titre)}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{IMAGE_PARTAGE}">
<meta name="twitter:image:alt" content="{esc(alt_partage)}">
<script type="application/ld+json">
{ld_txt}
</script>
'''
    meta_entete = ' · '.join(x for x in (metier, f'portfolio {annee}' if annee else 'portfolio') if x)
    lignes = '\n    '.join(
        f'<li><a href="#{esc(e["id"])}" data-projet="{esc(e["id"])}"><span class="num">{e["num"]}</span>'
        f'<span class="nom">{esc(e["titre"])}</span><span class="tag">{esc(e["sousTitre"])}</span></a></li>'
        for e in entrees)

    fichier = racine / 'index.html'
    avant = fichier.read_text(encoding='utf-8')
    t = remplacer(avant, r'(<!-- seo:debut[^>]*-->).*?(<!-- seo:fin -->)', tete, 'en-tête (seo:debut / seo:fin)')
    t = remplacer(t, r'(id="entete-nom">).*?(</a></h1>)', f'{esc(nom)} <span>{esc(meta_entete)}</span>', 'nom en en-tête')
    t = remplacer(t, r'(<p class="sr-only" id="presentation">).*?(</p>)', esc(description), 'présentation')
    t = remplacer(t, r'(<h2 id="liste-titre">).*?(</h2>)', f'Les {nb_txt}', 'titre de la liste')
    t = remplacer(t, r'(<ol class="liste-projets">).*?(</ol>)', f'\n    {lignes}\n  ', 'liste des projets')
    t = remplacer(t, r'(<ul class="orbite" id="orbite" aria-label=")[^"]*(")', f'Les {nb_txt}, en orbite autour de la boule', 'orbite')
    t = remplacer(t, r'(<nav class="index-projets" id="index-projets" aria-label=")[^"]*(")', f'Index des {nb_txt}', 'index')

    # page contact : seulement son en-tête (le reste est lu dans content/infos.json par la page elle-même).
    # Fichier absent ou sans repères seo:debut / seo:fin : on la laisse telle quelle, sans bloquer l'accueil.
    fichier_c = racine / 'contact.html'
    avant_c = t_c = fichier_c.read_text(encoding='utf-8') if fichier_c.exists() else ''
    etat_c = 'absente'
    if avant_c:
        titre_c = f'Contact — {nom}'
        if moyens:
            liste_m = moyens[0] if len(moyens) == 1 else ', '.join(moyens[:-1]) + ' et ' + moyens[-1]
            description_c = f'Contacter {nom}, {metier} : {liste_m}. Clique sur une adresse pour la copier.'
        else:
            description_c = f'Page contact de {nom}, {metier} : les coordonnées arrivent bientôt.'
        ld_c = {'@context': 'https://schema.org', '@graph': [
            {'@type': 'ContactPage', '@id': URL_CONTACT + '#page', 'url': URL_CONTACT, 'name': titre_c,
             'description': description_c, 'inLanguage': 'fr-FR', 'isPartOf': {'@id': URL + '#site'},
             'about': {'@id': URL + '#personne'}, 'mainEntity': {'@id': URL + '#personne'},
             'primaryImageOfPage': IMAGE_PARTAGE},
            personne]}
        ld_c_txt = json.dumps(ld_c, ensure_ascii=False, indent=1).replace('</', '<\\/')
        tete_c = f'''
<title>{esc(titre_c)}</title>
<meta name="description" content="{esc(description_c)}">
<link rel="canonical" href="{URL_CONTACT}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="{esc(nom)}">
<meta property="og:url" content="{URL_CONTACT}">
<meta property="og:title" content="{esc(titre_c)}">
<meta property="og:description" content="{esc(description_c)}">
<meta property="og:image" content="{IMAGE_PARTAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(alt_partage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(titre_c)}">
<meta name="twitter:description" content="{esc(description_c)}">
<meta name="twitter:image" content="{IMAGE_PARTAGE}">
<meta name="twitter:image:alt" content="{esc(alt_partage)}">
<script type="application/ld+json">
{ld_c_txt}
</script>
'''
        t_c, n = re.subn(r'(<!-- seo:debut[^>]*-->).*?(<!-- seo:fin -->)', lambda m: m.group(1) + tete_c + m.group(2),
                         avant_c, count=1, flags=re.S)
        etat_c = 'sans repères seo (laissée telle quelle)' if n != 1 else ('mise à jour' if t_c != avant_c else 'inchangée')

    # sitemap : une entrée par page ; chaque date ne change que si sa page change (pas de commit inutile pour un sticker)
    plan = racine / 'sitemap.xml'
    ancien_plan = plan.read_text(encoding='utf-8') if plan.exists() else ''
    dates = dict(re.findall(r'<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>', ancien_plan))
    aujourdhui = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    pages = [(URL, t != avant)] + ([(URL_CONTACT, t_c != avant_c)] if avant_c else [])
    entrees_plan = ''.join(f'''
  <url>
    <loc>{u}</loc>
    <lastmod>{aujourdhui if change or u not in dates else dates[u]}</lastmod>
  </url>''' for u, change in pages)
    nouveau_plan = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entrees_plan}
</urlset>
'''
    if t != avant:
        fichier.write_text(t, encoding='utf-8')
    if t_c != avant_c:
        fichier_c.write_text(t_c, encoding='utf-8')
    if nouveau_plan != ancien_plan:
        plan.write_text(nouveau_plan, encoding='utf-8')
    print(f'{nom} · {nb_txt} · réseaux : {len(reseaux)} · index.html {"mis à jour" if t != avant else "inchangé"}'
          f' · contact.html {etat_c} · sitemap {"mis à jour" if nouveau_plan != ancien_plan else "inchangé"}')


if __name__ == '__main__':
    main()
