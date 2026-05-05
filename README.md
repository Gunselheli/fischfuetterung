# Fischfuetterung

Statische Web-App zur Verwaltung von Chargen, Becken, Fuetterung, Mortalitaet, Sortierung und Schlachtung.

Die App speichert Daten zuerst im Browser per `localStorage` und synchronisiert sie zusaetzlich mit Supabase, sobald die Tabelle `app_state` angelegt ist.

Oeffentliche Seite:

https://gunselheli.github.io/fischfuetterung/

## Futtertabelle

Die App enthaelt eine Alltech-Coppens-Catfish-Futterempfehlung fuer Grow-out und Fry-Protokoll. Die Werte stammen aus `DE-CATFISH-2026.pdf` beziehungsweise der offiziellen Catfish-Broschuere 2025-2026, Seite 4-5.

## Supabase

Fuer die zentrale Mehrgeraete-Speicherung muss im Supabase SQL Editor einmalig `supabase-schema.sql` ausgefuehrt werden. Danach verwenden alle Browser denselben Datensatz `app_state/main`.

Aktuelles Projekt:

```text
https://dkgwiozbqnbxfdcrgrvv.supabase.co
```
