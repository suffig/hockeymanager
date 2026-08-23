# Eiszeit – Datenbank

Läuft auf **Supabase** (gehostetes PostgreSQL). Die Seite selbst bleibt
statisch: Der Browser spricht direkt mit Supabase, ein eigener Server ist
nicht nötig. Die Zugriffsrechte liegen deshalb in der Datenbank, nicht im
JavaScript – dort könnte sie jeder umgehen.

## Einrichten

Im Supabase-Dashboard unter **SQL Editor** nacheinander ausführen:

1. `01_schema.sql` – Tabellen, Trigger, Freigabefunktionen
2. `02_rls.sql` – Zugriffsrechte und die Ansicht für die Bestenliste

Danach registrierst du dich einmal ganz normal über die Seite. Dein
Profil steht dann auf `wartet`, wie alle anderen auch. Weil es noch
keinen Admin gibt, der freigeben könnte, schaltest du dich einmalig von
Hand frei – am Ende von `02_rls.sql` steht das fertige Kommando, du musst
nur deine E-Mail eintragen.

Ab da läuft alles über den Adminbereich.

## Wie die Freigabe wirkt

| Status | Bedeutung | Darf speichern |
|---|---|---|
| `wartet` | frisch registriert | nein |
| `frei` | von dir freigegeben | ja |
| `gesperrt` | abgelehnt oder entzogen | nein |

Die Sperre steckt nicht in der Oberfläche, sondern in den
Schreibregeln der Tabellen `karriere` und `ziel_erreicht`: Beide
verlangen `ist_frei()`. Ein wartendes Profil kann sich anmelden und
seinen Status sehen, aber nichts ablegen – auch nicht, wenn jemand die
Seite umbaut oder direkt die API anspricht.

Status und Adminrecht kann niemand an sich selbst ändern. Die Regel für
das eigene Profil erlaubt nur den Benutzernamen; Freigeben und Sperren
laufen über zwei Funktionen, die das Adminrecht selbst prüfen.

## Tabellen

- **profile** – ein Eintrag je Konto, mit Status und Adminrecht. Entsteht
  automatisch bei der Registrierung.
- **karriere** – eine Zeile je abgeschlossener Laufbahn, mit denselben
  Feldern, die der Pokalraum bisher lokal gehalten hat, samt
  Jahrgangsplatz, Erzählsträngen und Wendepunkt.
- **ziel_erreicht** – welches Langzeitziel wann erreicht wurde. Eigene
  Tabelle, weil Ziele über alle Karrieren hinweg gelten.
- **bestenliste** – Ansicht über Karrieren freigegebener Profile,
  beschränkt auf die Spalten, die angezeigt werden sollen.

## Was ohne Konto passiert

Spielen bleibt ohne Anmeldung möglich, gespeichert wird dann wie bisher
lokal im Browser. Ein Konto bringt gerätübergreifende Speicherung und
die Bestenliste.
