#!/usr/bin/env python3
"""
בונה את assets/search-index.json מתוך תוכן האתר.
מריצים ידנית אחרי כל שינוי תוכן (שאלות, עצים, גזעים, עמודים) —
אין build אוטומטי לאתר הזה, זה קובץ סטטי.

שימוש: python3 tools/build_search_index.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def strip_tags(s):
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace('&quot;', '"').replace('&amp;', '&').replace('&#39;', "'")
    return re.sub(r'\s+', ' ', s).strip()


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


def build_qa():
    html = read('qa/index.html')
    items = []
    # group by preceding <h2>
    parts = re.split(r'<h2>(.*?)</h2>', html)
    # parts alternates: [pre, h2_1, after_1, h2_2, after_2, ...]
    for i in range(1, len(parts), 2):
        group = strip_tags(parts[i])
        body = parts[i + 1]
        for m in re.finditer(
            r'<details class="qa" id="(qa\d+)"><summary>(.*?)</summary>'
            r'<div class="qa-body">(.*?)</div></details>',
            body, re.S,
        ):
            qid, summary, qa_body = m.groups()
            first_p = re.search(r'<p>(.*?)</p>', qa_body, re.S)
            snippet = strip_tags(first_p.group(1)) if first_p else ''
            items.append({
                'type': 'qa',
                'title': strip_tags(summary),
                'group': group,
                'snippet': snippet[:160],
                'url': f'qa/#{qid}',
            })
    return items


PAGE_TITLES = {
    'signals': 'לקרוא כלב', 'learning': 'איך כלב לומד', 'household': 'מה בני הבית עושים לכלב',
    'routine': 'לחיות עם כלב', 'barking': 'הכלב שלי נובח', 'aggression': 'הכלב שלי תוקפני',
    'separation': 'חרדת נטישה', 'puppy': 'גור חדש בבית', 'world': 'לנוע בעולם',
    'lifespan': 'לאורך החיים', 'cases': 'שלושה מקרים', 'guide': 'מה קרה לכלב שלי',
    'profile': 'פרטי הכלב שלי',
}


def build_pages():
    items = []
    for slug, title in PAGE_TITLES.items():
        html = read(f'{slug}/index.html')
        m = re.search(r'<meta name="description" content="(.*?)">', html)
        snippet = strip_tags(m.group(1)) if m else ''
        items.append({
            'type': 'page', 'title': title, 'group': 'עמודים',
            'snippet': snippet[:160], 'url': f'{slug}/',
        })
    return items


def build_trees():
    js = read('assets/trees.js')
    items = []
    for m in re.finditer(
        r"(\w+):\s*\{\s*title:\s*'((?:[^'\\]|\\.)*)',\s*intro:\s*'((?:[^'\\]|\\.)*)',",
        js,
    ):
        key, title, intro = m.groups()
        title = title.replace("\\'", "'")
        intro = intro.replace("\\'", "'")
        items.append({
            'type': 'tree', 'title': title, 'group': 'מה קרה לכלב שלי',
            'snippet': intro[:160], 'url': f'guide/?tree={key}',
        })
    return items


def build_breeds():
    js = read('assets/breeds.js')
    items = []
    for m in re.finditer(
        r"'(\w+)':\s*\{\s*he:\s*'((?:[^'\\]|\\.)*)',\s*en:\s*'((?:[^'\\]|\\.)*)',",
        js,
    ):
        key, he, en = m.groups()
        he = he.replace("\\'", "'")
        en = en.replace("\\'", "'")
        note_m = re.search(
            r"'" + re.escape(key) + r"':\s*\{.*?note:\s*'((?:[^'\\]|\\.)*)'",
            js, re.S,
        )
        note = note_m.group(1).replace("\\'", "'") if note_m else ''
        items.append({
            'type': 'breed', 'title': f'{he} · {en}', 'group': 'גזעים',
            'snippet': note[:160], 'url': f'profile/?breed={key}',
        })
    return items


def main():
    index = build_qa() + build_pages() + build_trees() + build_breeds()
    out_path = os.path.join(ROOT, 'assets', 'search-index.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, separators=(',', ':'))
    print(f'wrote {len(index)} entries to {out_path}')
    by_type = {}
    for it in index:
        by_type[it['type']] = by_type.get(it['type'], 0) + 1
    print(by_type)


if __name__ == '__main__':
    main()
