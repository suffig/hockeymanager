# -*- coding: utf-8 -*-
"""Stempelt eine Fassungsnummer auf alle Bausteine.

Warum das noetig ist
--------------------
Die Seite laedt ihre Bausteine unter festen Adressen: assets/style.css,
assets/game.js und so weiter. Aendert sich der Inhalt, bleibt die
Adresse gleich - und der Browser beantwortet die Anfrage aus seinem
eigenen Zwischenspeicher, ohne nachzufragen. Gemessen: nach einer
Aenderung lieferte er 101002 statt 102310 Bytes, und der
Offlinespeicher sah die Anfrage nicht einmal.

Fuer Nutzer heisst das: nach einer Aktualisierung trifft frisches HTML
auf alten Programmcode. Das laesst sich nicht mit Kopfzeilen loesen,
solange die Seite ohne eigenen Server ausgeliefert wird.

Also bekommt jede Adresse einen Stempel: assets/game.js?v=a3f19c2b.
Aendert sich der Inhalt, aendert sich der Stempel, und damit die
Adresse - dann kann kein Zwischenspeicher mehr etwas Altes liefern.

Aufruf
------
    python werkzeug/stempel.py

Nach jeder Aenderung an assets/ ausfuehren und mitcommitten.
"""

import hashlib
import io
import os
import re
import sys

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Was gestempelt wird. Bilder und Schriften bleiben aussen vor: sie
# aendern sich praktisch nie und wuerden den Stempel bei jedem Lauf
# unnoetig verschieben.
BAUSTEINE = re.compile(r'^assets/[A-Za-z0-9_.-]+\.(?:js|css)$')

VERWEIS = re.compile(
    r'(?P<attr>(?:href|src)=")(?P<pfad>assets/[A-Za-z0-9_.-]+\.(?:js|css))'
    r'(?:\?v=[0-9a-f]+)?(?P<rest>")'
)


def dateien():
    ordner = os.path.join(WURZEL, 'assets')
    for name in sorted(os.listdir(ordner)):
        pfad = 'assets/' + name
        if BAUSTEINE.match(pfad):
            yield pfad


def stempel():
    """Ein kurzer Fingerabdruck ueber alle Bausteine zusammen.

    Bewusst ein gemeinsamer Stempel statt einer je Datei: die Dateien
    haengen voneinander ab (game.js ruft UI.rollenKarte in ui.js). Ein
    gemeinsamer Stand kann nie halb alt und halb neu sein.
    """
    h = hashlib.sha256()
    for pfad in dateien():
        with open(os.path.join(WURZEL, pfad), 'rb') as f:
            h.update(f.read())
    return h.hexdigest()[:8]


def main():
    marke = stempel()
    geaendert = []
    for name in sorted(os.listdir(WURZEL)):
        if not name.endswith('.html'):
            continue
        pfad = os.path.join(WURZEL, name)
        alt = io.open(pfad, encoding='utf-8').read()
        neu = VERWEIS.sub(
            lambda m: m.group('attr') + m.group('pfad') + '?v=' + marke + m.group('rest'),
            alt)
        if neu != alt:
            io.open(pfad, 'w', encoding='utf-8', newline='').write(neu)
            geaendert.append(name)

    # Der Offlinespeicher legt dieselben Adressen ab - sonst haelt er
    # weiter die ungestempelten Fassungen vor.
    swPfad = os.path.join(WURZEL, 'sw.js')
    alt = io.open(swPfad, encoding='utf-8').read()
    neu = re.sub(r"'(\./assets/[A-Za-z0-9_.-]+\.(?:js|css))(?:\?v=[0-9a-f]+)?'",
                 lambda m: "'" + m.group(1) + '?v=' + marke + "'", alt)
    neu = re.sub(r"const VERSION = 'eiszeit-[^']*';",
                 "const VERSION = 'eiszeit-" + marke + "';", neu)
    if neu != alt:
        io.open(swPfad, 'w', encoding='utf-8', newline='').write(neu)
        geaendert.append('sw.js')

    print('Stempel: ' + marke)
    print('Angepasst: ' + (', '.join(geaendert) if geaendert else 'nichts (schon aktuell)'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
