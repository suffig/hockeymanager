/* ==========================================================
   Eiszeit – Karriereereignisse

   Momente, die eine Laufbahn erzählen: Kabine, Presse, Trainer,
   Privatleben, Spielsituationen. Jede Option hat eine Erfolgs-
   chance – gelingt sie, bringt sie etwas, misslingt sie, kostet
   sie. Die Texte sind eigens geschrieben.
   ========================================================== */

const EREIGNISSE = (() => {

  /* Wirkungen einer Option:
     attr   – Attributänderung { schuss:+2 }
     ruf    – Ansehen bei Klub und Presse
     moral  – Stimmung in der Kabine (wirkt auf Teamerfolg)
     form   – Bonus/Malus auf die kommende Saison
     trait  – dauerhafte Eigenschaft { playoff:+4 }
     risiko – zusätzliches Verletzungsrisiko in Prozentpunkten     */

  const LISTE = [
    /* ---------- Kabine ---------- */
    { id:'kabine1', kat:'kabine', szene:'kabine', tag:'Der Neue in der Kabine',
      titel:'Dein Platz ist der schlechteste im Raum',
      text:'Der Haken neben der Tür, direkt am Durchgang. Jeder streift dich, wenn er '
         + 'zum Eis geht. Der Zeugwart zuckt mit den Schultern: So läuft das eben bei Neuen. '
         + 'Zwei Plätze weiter hängt eine Ausrüstung, deren Besitzer letzte Woche abgegeben wurde.',
      bedingung: st => st.klubJahre === 0 && st.age >= 19,
      optionen:[
        { t:'Den freien Platz einfach nehmen', chance:55, hinweis:'Selbstbewusst oder anmaßend – die Kabine entscheidet',
          gut:{ ruf:3, moral:4, text:'Niemand sagt etwas. Am nächsten Tag hängt dein Name über dem Haken.' },
          schlecht:{ moral:-6, text:'Ein Routinier räumt deine Sachen wortlos zurück an die Tür.' } },
        { t:'Am Türhaken bleiben', chance:85, hinweis:'Unauffällig, aber niemand vergisst es',
          gut:{ moral:3, text:'Du sagst nichts. Genau das fällt positiv auf.' },
          schlecht:{ ruf:-2, text:'Du wirst zum Mann am Durchgang – und bleibst es lange.' } },
        { t:'Den Kapitän direkt fragen', chance:65, hinweis:'Mut zur Ansprache',
          gut:{ ruf:4, moral:5, attr:{ nerven:2 }, text:'Er lacht, klopft dir auf die Schulter und regelt es.' },
          schlecht:{ moral:-3, text:'Er mustert dich kurz. „Verdien es dir." Mehr sagt er nicht.' } }
      ] },

    { id:'kabine2', kat:'kabine', szene:'kabine', tag:'Nach der Niederlage',
      titel:'Der Trainer wirft einen Stuhl gegen die Wand',
      text:'Vierter Kabinenwurf dieser Saison, aber der erste, bei dem er dabei deinen Namen sagt. '
         + 'Die Reihe hat drei Gegentore in acht Minuten kassiert. Der Raum ist so still, '
         + 'dass man das Eis in den Getränkeflaschen knacken hört.',
      bedingung: (st, s) => s && !s.playoffs && st.age >= 21,
      optionen:[
        { t:'Widersprechen', chance:35, hinweis:'Riskant – aber Rückgrat wird gesehen',
          gut:{ ruf:6, moral:6, attr:{ nerven:3 }, text:'Er hält inne. Am Ende nickt er. Ihr habt euch verstanden.' },
          schlecht:{ ruf:-6, moral:-8, form:-0.08, text:'Du sitzt die nächsten drei Spiele auf der Bank.' } },
        { t:'Die Schuld auf dich nehmen', chance:70, hinweis:'Schützt die Reihe, kostet dich',
          gut:{ moral:8, ruf:2, text:'Deine Mitspieler wissen, was du gerade getan hast.' },
          schlecht:{ ruf:-4, text:'Der Trainer nimmt dich beim Wort. Ab jetzt bist du der Schuldige.' } },
        { t:'Stumm bleiben', chance:80, hinweis:'Nichts gewinnen, nichts verlieren',
          gut:{ form:0.02, text:'Der Sturm zieht vorbei. Nächste Woche redet niemand mehr davon.' },
          schlecht:{ moral:-2, text:'Dein Schweigen wird als Gleichgültigkeit gelesen.' } }
      ] },

    /* ---------- Presse ---------- */
    { id:'presse1', kat:'presse', szene:'presse', tag:'Vor laufender Kamera',
      titel:'Ein Reporter fragt nach dem Wechselgerücht',
      text:'Mixed Zone, halb zwölf nachts, du hast noch die Schlittschuhe an. '
         + 'Er hält das Mikrofon zu tief und lächelt zu freundlich. Die Frage klingt harmlos, '
         + 'aber jede Antwort wird morgen eine Überschrift sein.',
      bedingung: st => st.age >= 22 && st.ruf > 70,
      optionen:[
        { t:'Klare Treuebekundung', chance:70, hinweis:'Bindet dich – auch wenn du gehen willst',
          gut:{ ruf:5, moral:5, text:'Die Fans feiern das Zitat wochenlang auf Spruchbändern.' },
          schlecht:{ ruf:-3, text:'Zwei Monate später wechselst du doch. Man erinnert sich.' } },
        { t:'Ausweichen', chance:85, hinweis:'Langweilig, aber sicher',
          gut:{ text:'Die Schlagzeile fällt aus. Genau das war der Plan.' },
          schlecht:{ ruf:-2, text:'„Er wollte sich nicht festlegen" steht am nächsten Tag da.' } },
        { t:'Offen über Ambitionen sprechen', chance:45, hinweis:'Ehrlichkeit mit Nebenwirkung',
          gut:{ ruf:7, text:'Größere Klubs lesen mit. Dein Marktwert zieht an.' },
          schlecht:{ moral:-7, ruf:-4, text:'In der Kabine wird es kühl. Du hast dich selbst über das Team gestellt.' } }
      ] },

    /* ---------- Trainer ---------- */
    { id:'trainer1', kat:'trainer', szene:'buero', tag:'Im Büro des Trainers',
      titel:'Er will dich auf einer neuen Position ausprobieren',
      text:'Auf dem Whiteboard hinter ihm klebt ein Magnet dort, wo du noch nie gespielt hast. '
         + 'Er redet zwanzig Minuten über Systeme, Räume und Verantwortung. '
         + 'Am Ende ist es keine Frage, sondern eine Ansage mit Fragezeichen.',
      bedingung: st => st.age >= 20 && st.klubJahre >= 1,
      optionen:[
        { t:'Zusagen und lernen', folgt:'trainerpakt', chance:60, hinweis:'Breite statt Spezialisierung',
          gut:{ attr:{ uebersicht:3, defensive:3 }, ruf:3, text:'Die neue Rolle macht dich vielseitig – Trainer mögen das.' },
          schlecht:{ form:-0.06, text:'Du findest dich nie richtig zurecht und verlierst Eiszeit.' } },
        { t:'Höflich ablehnen', chance:65, hinweis:'Bleib bei dem, was du kannst',
          gut:{ form:0.05, text:'Er akzeptiert es. Du spielst weiter dort, wo du stark bist.' },
          schlecht:{ ruf:-5, moral:-4, text:'Er merkt sich das. Deine Eiszeit sinkt spürbar.' } }
      ] },

    { id:'trainer2', kat:'trainer', szene:'eis', tag:'Zusatzschicht',
      titel:'Um sechs Uhr morgens brennt schon Licht in der Halle',
      text:'Der Torwarttrainer ist da, sonst niemand. Er nickt dir zu, als hätte er dich erwartet. '
         + 'Draußen ist es dunkel, die Bande kalt, das Eis frisch gemacht und noch niemand '
         + 'hat eine Spur hineingezogen.',
      bedingung: st => st.age <= 26,
      optionen:[
        { t:'Jeden Morgen wiederkommen', chance:65, hinweis:'Fortschritt gegen Verschleiß',
          gut:{ attr:{ praezision:3, reflexe:3 }, text:'Nach drei Monaten sitzt eine Bewegung, die vorher nie saß.' },
          schlecht:{ risiko:6, text:'Der Körper macht die Doppelbelastung nicht lange mit.' } },
        { t:'Zweimal die Woche', chance:85, hinweis:'Vernünftiges Maß',
          gut:{ attr:{ puck:2 }, text:'Kleiner, aber stetiger Fortschritt ohne Risiko.' },
          schlecht:{ text:'Es bringt nicht viel, aber es schadet auch nicht.' } },
        { t:'Lieber regenerieren', chance:75, hinweis:'Der Körper dankt es',
          gut:{ trait:{ robust:4 }, text:'Du kommst frischer durch die Saison als alle anderen.' },
          schlecht:{ ruf:-2, text:'Der Trainerstab hätte dich lieber öfter gesehen.' } }
      ] },

    /* ---------- Spielsituationen ---------- */
    { id:'spiel1', kat:'spiel', szene:'eis', tag:'Letzte Minute',
      titel:'Der Torhüter ist draußen, ihr liegt einen Treffer zurück',
      /* Der laengste Ereignistext im Spiel - mit vier Optionen sprengte
         er auf dem Telefon den Schirm. Eine Zeile kuerzer, dasselbe Bild. */
      text:'Sechs gegen fünf, achtundfünfzig Sekunden. Der Puck kommt an die blaue Linie, '
         + 'und du hast ihn. Links ein Mitspieler in besserer Position, rechts eine Lücke, '
         + 'die vielleicht keine ist.',
      bedingung: st => st.age >= 20,
      optionen:[
        { t:'Selbst abziehen', chance:40, hinweis:'Ruhm oder Vorwurf',
          gut:{ ruf:8, attr:{ schuss:2, nerven:2 }, moral:5, text:'Der Puck geht durch. Die Halle explodiert.' },
          schlecht:{ ruf:-4, moral:-3, text:'Geblockt. Konter. Zwei Treffer Rückstand.' } },
        { t:'Querpass in die Mitte', chance:60, hinweis:'Die richtige Entscheidung – meistens',
          gut:{ attr:{ pass:3, uebersicht:2 }, moral:4, text:'Der Ausgleich fällt, dein Name steht bei der Vorlage.' },
          schlecht:{ moral:-2, text:'Der Pass wird abgefangen. Immerhin war es die richtige Wahl.' } },
        { t:'Halten und Zeit gewinnen', chance:75, hinweis:'Kein Risiko, kein Ertrag',
          gut:{ attr:{ puck:2 }, text:'Ihr bekommt noch zwei Chancen. Keine davon sitzt.' },
          schlecht:{ text:'Die Uhr läuft ab, während du den Puck an der Bande sicherst.' } }
      ] },

    { id:'spiel2', kat:'spiel', szene:'eis', tag:'Nach dem Check',
      titel:'Dein Mitspieler liegt und steht nicht auf',
      text:'Der Check kam von hinten, drei Meter vor der Bande. Der Schiedsrichter hat den Arm oben, '
         + 'aber das interessiert gerade niemanden. Der Gegner steht zwei Meter entfernt '
         + 'und schaut dich an, als würde er auf etwas warten.',
      bedingung: st => st.age >= 19,
      optionen:[
        { t:'Sofort hinstellen', chance:55, hinweis:'Die Kabine sieht alles',
          gut:{ moral:9, ruf:4, attr:{ zweikampf:2 }, text:'Ab diesem Abend ist die Mannschaft deine Mannschaft.' },
          schlecht:{ risiko:5, moral:3, text:'Fünf Minuten plus Spieldauer – aber sie haben es gesehen.' } },
        { t:'Zum Verletzten gehen', chance:80, hinweis:'Menschlich statt martialisch',
          gut:{ moral:6, text:'Du bleibst bei ihm, bis die Trage kommt. Er vergisst das nicht.' },
          schlecht:{ moral:-2, text:'Andere übernehmen die Auseinandersetzung. Manche fragen sich, wo du warst.' } },
        { t:'Es im nächsten Wechsel zurückzahlen', chance:45, hinweis:'Kalt serviert',
          gut:{ moral:7, attr:{ zweikampf:3 }, text:'Ein sauberer, harter Check. Niemand kann etwas sagen.' },
          schlecht:{ risiko:8, ruf:-5, text:'Du triffst falsch und wirst für drei Spiele gesperrt.' } }
      ] },

    /* ---------- Privat ---------- */
    { id:'privat1', kat:'privat', szene:'stadt', tag:'Zwischen den Spielen',
      titel:'Ein Anruf von zu Hause mitten in der Saison',
      text:'Dein Vater klingt anders als sonst. Nichts Dramatisches, sagt er, nur Routine, '
         + 'nur ein Termin. Das nächste Auswärtsspiel ist siebenhundert Kilometer entfernt, '
         + 'der Bus fährt in vier Stunden.',
      bedingung: st => st.age >= 23,
      optionen:[
        { t:'Hinfahren, Spiel verpassen', chance:70, hinweis:'Der Mensch vor dem Profi',
          gut:{ trait:{ langlebig:3 }, moral:3, text:'Der Klub trägt es mit. Du kommst mit klarem Kopf zurück.' },
          schlecht:{ ruf:-4, text:'Der Trainer sagt nichts – und stellt dich zwei Wochen nicht auf.' } },
        { t:'Bleiben und spielen', chance:60, hinweis:'Profi bis zum Schluss',
          gut:{ ruf:4, attr:{ nerven:3 }, text:'Du machst zwei Tore und rufst danach eine Stunde lang an.' },
          schlecht:{ form:-0.07, text:'Du bist mit den Gedanken woanders und findest die Saison über nicht zurück.' } }
      ] },

    { id:'privat2', kat:'privat', szene:'stadt', tag:'Angebot außerhalb des Eises',
      titel:'Eine Sportmarke will deinen Namen auf einem Schläger',
      text:'Der Vertrag liegt in einer Ledermappe auf dem Tisch, daneben ein Kugelschreiber, '
         + 'der teurer aussieht als dein erstes Auto. Der Betrag ist ordentlich. '
         + 'Die Termine im Kleingedruckten sind es weniger.',
      bedingung: st => st.ruf > 82 && st.age >= 24,
      optionen:[
        { t:'Unterschreiben', chance:65, hinweis:'Geld und Aufmerksamkeit',
          gut:{ ruf:6, text:'Dein Gesicht hängt in jedem Fachgeschäft des Landes.' },
          schlecht:{ form:-0.05, text:'Die Werbetermine fressen genau die Tage, die du zur Erholung bräuchtest.' } },
        { t:'Ablehnen', chance:80, hinweis:'Ruhe statt Rampenlicht',
          gut:{ form:0.04, trait:{ robust:2 }, text:'Du bleibst unbehelligt und kommst top erholt in die Playoffs.' },
          schlecht:{ text:'Ein Mitspieler unterschreibt stattdessen. Er wirkt danach ziemlich zufrieden.' } }
      ] },

    /* ---------- Führung ---------- */
    { id:'fuehrung1', kat:'kabine', szene:'kabine', tag:'Vor dem entscheidenden Spiel',
      titel:'Der Kapitän ist verletzt – jemand muss reden',
      text:'Siebtes Spiel der Serie, gleich geht es raus. Der Raum wartet, aber der, '
         + 'der sonst spricht, sitzt im Anzug auf der Tribüne. Zwanzig Augenpaare wandern '
         + 'durch die Kabine und bleiben irgendwann bei dir hängen.',
      bedingung: (st, s) => s && s.playoffs && st.age >= 24,
      optionen:[
        { t:'Aufstehen und sprechen', folgt:'wortfuehrer', chance:55, hinweis:'Große Bühne, großes Risiko',
          gut:{ moral:10, ruf:6, trait:{ playoff:5 }, attr:{ nerven:3 },
                text:'Was du sagst, wird Jahre später noch in Interviews zitiert.' },
          schlecht:{ moral:-5, text:'Die Worte kommen nicht an. Man sieht es an den Gesichtern.' } },
        { t:'Auf dem Eis vorangehen', chance:70, hinweis:'Taten statt Worte',
          gut:{ moral:6, form:0.06, text:'Dein erster Wechsel setzt den Ton für die ganze Serie.' },
          schlecht:{ risiko:5, text:'Du willst zu viel und übernimmst dich schon im ersten Drittel.' } },
        { t:'Einem Älteren den Vortritt lassen', chance:85, hinweis:'Bescheiden, unauffällig',
          gut:{ moral:3, text:'Ein Routinier übernimmt. Es funktioniert auch so.' },
          schlecht:{ moral:-3, text:'Niemand steht auf. Ihr geht schweigend raus und verliert.' } }
      ] }
,

    /* ---------- Konkurrenz ---------- */
    { id:'rivale1', kat:'kabine', szene:'eis', tag:'Zwei für einen Platz',
      titel:'Der Neue trainiert auf deiner Position – und er ist gut',
      text:'Er ist drei Jahre jünger, kam im Sommer aus dem Nachwuchs und macht im Training '
         + 'Dinge, die du mit zwanzig nicht konntest. Der Trainer stellt euch in der Vorbereitung '
         + 'abwechselnd auf. Nur einer wird die Saison in der ersten Reihe beginnen.',
      bedingung: st => st.age >= 24 && st.klubJahre >= 1,
      optionen:[
        { t:'Ihm alles beibringen, was du weißt', chance:60, hinweis:'Großzügig – und riskant',
          gut:{ moral:9, ruf:5, attr:{ uebersicht:2 }, text:'Ihr werdet die beste Reihe der Liga. Er nennt dich später seinen Lehrmeister.' },
          schlecht:{ form:-0.06, text:'Er überholt dich schneller, als dir lieb ist.' } },
        { t:'Im Training kompromisslos gegenhalten', folgt:'rivalitaet', chance:55, hinweis:'Platzhirsch sein',
          gut:{ form:0.07, attr:{ zweikampf:3 }, text:'Du gewinnst das Duell und spielst die beste Vorbereitung deiner Karriere.' },
          schlecht:{ moral:-6, risiko:4, text:'Ein überharter Zweikampf im Training – die Kabine ist gespalten.' } },
        { t:'Den Trainer um ein klärendes Gespräch bitten', chance:70, hinweis:'Sachlich bleiben',
          gut:{ ruf:4, form:0.03, text:'Er legt dir offen dar, was er von dir erwartet. Das hilft.' },
          schlecht:{ ruf:-3, text:'„Das entscheidet sich auf dem Eis." Mehr bekommst du nicht.' } }
      ] },

    /* ---------- Vertrag ---------- */
    { id:'berater1', kat:'privat', szene:'buero', tag:'Am Verhandlungstisch',
      titel:'Dein Berater will mehr herausholen, als der Klub bieten kann',
      text:'Er redet von Marktwert, Vergleichsgehältern und davon, dass man Härte zeigen müsse. '
         + 'Der Sportdirektor hat dir gestern noch persönlich gesagt, wie wichtig du für den Umbau bist. '
         + 'Zwei Wahrheiten, ein Stift.',
      bedingung: st => st.age >= 25 && st.vertragJahre <= 1,
      optionen:[
        { t:'Hart verhandeln lassen', chance:50, hinweis:'Mehr Geld oder verbrannte Erde',
          gut:{ ruf:5, text:'Der Klub zahlt. Der Sportdirektor lächelt beim Handschlag etwas dünn.' },
          schlecht:{ moral:-8, ruf:-5, text:'Die Verhandlung platzt öffentlich. Die Fans stellen sich hinter den Klub.' } },
        { t:'Selbst mit dem Sportdirektor sprechen', chance:70, hinweis:'Direkt und ohne Zwischenstufe',
          gut:{ ruf:6, moral:6, attr:{ nerven:2 }, text:'Ihr einigt euch in zwanzig Minuten. Beide Seiten fühlen sich fair behandelt.' },
          schlecht:{ text:'Es bleibt beim ersten Angebot. Immerhin ohne Streit.' } },
        { t:'Gehalt senken für eine längere Laufzeit', chance:75, hinweis:'Sicherheit statt Maximum',
          gut:{ moral:7, trait:{ langlebig:3 }, text:'Der Klub baut um dich herum. Diese Ruhe ist Gold wert.' },
          schlecht:{ ruf:-2, text:'Zwei Jahre später ist der Vertrag ein Klotz am Bein.' } }
      ] },

    /* ---------- Verletzung ---------- */
    { id:'comeback1', gewicht:3.5, mehrfach:true, kat:'spiel', szene:'kabine', tag:'Nach der Verletzung',
      titel:'Der Arzt gibt dir grünes Licht – dein Knie sieht das anders',
      text:'Die Untersuchung ist unauffällig, die Werte gut, alle nicken. Nur du weißt, wie es sich '
         + 'anfühlt, wenn du in der letzten Kurve vor der Bande abbremst. In elf Tagen ist '
         + 'Saisonauftakt, und die Reihe braucht dich.',
      /* Suchte vorher einen Ereignistext, der mit "Verletzung" beginnt.
         Keine der zwoelf Verletzungen heisst so - sie heissen
         Kreuzbandriss oder Jochbeinbruch. Das Ereignis ist deshalb nie
         erschienen. Die Saison traegt die Verletzung als eigenes Feld. */
      bedingung: (st, s) => !!(s && s.verletzung && s.verletzung.schwere >= 1),
      optionen:[
        { t:'Sofort zurückkommen', chance:45, hinweis:'Die Serie ruft',
          gut:{ moral:8, ruf:6, trait:{ playoff:4 }, text:'Du spielst die Serie deines Lebens auf einem Bein.' },
          schlecht:{ risiko:12, form:-0.08, text:'Nach zwei Spielen ist es schlimmer als vorher.' } },
        { t:'Zwei Wochen dranhängen', chance:80, hinweis:'Vernunft vor Heldentum',
          gut:{ trait:{ robust:4 }, text:'Du kommst spät, aber schmerzfrei zurück – und hältst noch Jahre.' },
          schlecht:{ moral:-4, ruf:-3, text:'Die Serie ist vorbei, bevor du wieder fit bist.' } }
      ] },

    /* ---------- Fans ---------- */
    { id:'fans1', kat:'presse', szene:'stadt', tag:'Vor der Halle',
      titel:'Ein Kind wartet seit zwei Stunden im Regen auf ein Autogramm',
      text:'Der Bus steht mit laufendem Motor, ihr habt gerade zu Hause verloren, und niemand '
         + 'hat Lust zu reden. Am Absperrgitter steht ein durchnässtes Trikot mit deiner Nummer, '
         + 'darüber ein Gesicht, das seit dem Schlusspfiff wartet.',
      bedingung: st => st.ruf > 72,
      optionen:[
        { t:'Anhalten und Zeit nehmen', chance:85, hinweis:'Kostet zehn Minuten',
          gut:{ ruf:6, moral:4, text:'Das Foto geht durch die halbe Stadt. Man vergisst so etwas nie.' },
          schlecht:{ text:'Der Bus wartet. Der Trainer sagt nichts, schaut aber auf die Uhr.' } },
        { t:'Einsteigen', chance:60, hinweis:'Kopf ist woanders',
          gut:{ form:0.03, text:'Du brauchst den Abend für dich. Am Mittwoch machst du zwei Tore.' },
          schlecht:{ ruf:-6, text:'Ein Video davon macht die Runde. Der Klub muss sich äußern.' } }
      ] },

    /* ---------- Mentor ---------- */
    { id:'mentor1', kat:'kabine', szene:'kabine', tag:'Der Junge aus dem Nachwuchs',
      titel:'Ein Sechzehnjähriger sitzt neben dir und traut sich nichts zu fragen',
      text:'Er wurde für zwei Spiele hochgezogen, hat die falsche Ausrüstung dabei und weiß nicht, '
         + 'wo er sich hinsetzen soll. Vor zehn Jahren saß da jemand anderes an derselben Stelle, '
         + 'und du erinnerst dich genau, wer damals mit dir geredet hat – und wer nicht.',
      bedingung: st => st.age >= 28,
      optionen:[
        { t:'Ihn unter die Fittiche nehmen', folgt:'ziehvater', chance:80, hinweis:'Zahlt sich nicht sofort aus',
          gut:{ moral:8, ruf:4, text:'Er wird Stammspieler und erzählt in jedem Interview von dir.' },
          schlecht:{ text:'Er schafft es nicht. Trotzdem war es richtig.' } },
        { t:'Ihn erst einmal machen lassen', chance:65, hinweis:'Jeder muss da alleine durch',
          gut:{ text:'Er beißt sich durch. Härte hat auch ihren Wert.' },
          schlecht:{ moral:-4, text:'Er geht im Sommer zu einem anderen Klub und sagt, er habe sich nie willkommen gefühlt.' } }
      ] },

    /* ---------- Trainerwechsel ---------- */
    { id:'trainer3', kat:'trainer', szene:'buero', tag:'Neuer Mann an der Bande',
      titel:'Der neue Trainer hat ein System, das nicht zu dir passt',
      text:'Er kommt aus einer anderen Liga und bringt einen Ordner mit, in dem jede Situation '
         + 'geregelt ist. In seinem System läuft alles über die Außen, und du bist seit zwölf '
         + 'Jahren jemand, der durch die Mitte kommt.',
      bedingung: st => st.klubJahre >= 2 && st.age >= 26,
      optionen:[
        { t:'Dich komplett umstellen', folgt:'trainerpakt', chance:55, hinweis:'Neu lernen mit dreißig',
          gut:{ attr:{ skating:3, pass:3 }, ruf:4, text:'Du wirst im neuen System besser als im alten.' },
          schlecht:{ form:-0.09, text:'Du findest dich nie zurecht und spielst deine schwächste Saison.' } },
        { t:'Bei deinem Spiel bleiben', chance:50, hinweis:'Wer erfolgreich ist, hat recht',
          gut:{ form:0.08, ruf:5, text:'Deine Tore geben dir recht. Er passt das System an dich an.' },
          schlecht:{ ruf:-6, moral:-5, text:'Du wirst zum Sonderfall, den man lieber loswerden würde.' } }
      ] },

    /* ---------- Serie ---------- */
    { id:'krise1', gewicht:3.5, kat:'kabine', szene:'eis', tag:'Sechs Niederlagen in Folge',
      titel:'Der Mannschaftsrat trifft sich ohne den Trainerstab',
      text:'Zwanzig Uhr, Hotelzimmer 412, niemand hat eingeladen und trotzdem sind alle da. '
         + 'Die Stimmung ist irgendwo zwischen Trotz und Ratlosigkeit. Irgendwann sagt jemand, '
         + 'man müsse jetzt eine Entscheidung treffen.',
      bedingung: (st, s) => s && !s.playoffs && st.age >= 25 && st.moral < 60,
      optionen:[
        { t:'Für den Trainer eintreten', folgt:'trainerpakt', chance:60, hinweis:'Loyalität nach oben',
          gut:{ ruf:7, moral:6, text:'Die Wende kommt zwei Spiele später. Er weiß, wem er das verdankt.' },
          schlecht:{ moral:-7, text:'Die Kabine sieht dich ab jetzt als verlängerten Arm der Bank.' } },
        { t:'Für einen Wechsel plädieren', chance:45, hinweis:'Riskant, aber ehrlich',
          gut:{ moral:8, form:0.06, text:'Der Trainer geht, der Nachfolger dreht die Saison.' },
          schlecht:{ ruf:-8, text:'Es dringt nach außen, wer die Sitzung angestoßen hat.' } },
        { t:'Zuhören und schweigen', chance:80, hinweis:'Nicht deine Schlacht',
          gut:{ text:'Andere übernehmen das Risiko. Du konzentrierst dich aufs Spielen.' },
          schlecht:{ moral:-3, text:'Man erwartet in solchen Momenten eine Meinung von dir.' } }
      ] },

    /* ---------- Ritual ---------- */
    { id:'ritual1', kat:'privat', szene:'kabine', tag:'Vor dem Spiel',
      titel:'Dein Schläger ist gebrochen – der, mit dem alles begann',
      text:'Sechzehn Tore in dieser Saison, alle mit demselben Holz. Jetzt liegt er in zwei Teilen '
         + 'in der Kabine, und der Zeugwart hält einen neuen hoch, exakt baugleich, frisch aus dem Karton. '
         + 'In vierzig Minuten geht es raus.',
      bedingung: st => st.age >= 21,
      optionen:[
        { t:'Den neuen nehmen und nicht drüber nachdenken', chance:75, hinweis:'Nüchtern bleiben',
          gut:{ attr:{ nerven:3 }, text:'Zwei Tore im ersten Drittel. Es lag nie am Schläger.' },
          schlecht:{ form:-0.04, text:'Der Griff fühlt sich den ganzen Abend falsch an.' } },
        { t:'Die Teile in der Tasche behalten', chance:70, hinweis:'Aberglaube hat auch Kraft',
          gut:{ trait:{ playoff:3 }, moral:3, text:'Es wird dein Talisman. Die halbe Kabine hat bald so etwas.' },
          schlecht:{ text:'Es ändert nichts. Aber es beruhigt dich.' } }
      ] }
,

    /* ---------- Nationalmannschaft ---------- */
    { id:'nat1', kat:'trainer', szene:'buero', tag:'Der Verband ruft an',
      titel:'Die Nominierung kommt mitten in deiner schlechtesten Phase',
      text:'Drei Wochen ohne Punkt, der Trainer redet kaum mit dir, und jetzt liegt eine '
         + 'Einladung zum Lehrgang auf dem Tisch. Zwei Wochen weg vom Klub, zwei Wochen '
         + 'weg von der Chance, dich zurückzukämpfen.',
      bedingung: st => st.natDebuet && st.age >= 22,
      optionen:[
        { t:'Zusagen', chance:65, hinweis:'Das Trikot geht vor',
          gut:{ ruf:7, attr:{ nerven:3 }, text:'Zwei Tore im Lehrgang – und plötzlich läuft es auch im Klub wieder.' },
          schlecht:{ form:-0.06, text:'Du kommst müde zurück und findest die Form nie ganz wieder.' } },
        { t:'Absagen und im Klub arbeiten', chance:60, hinweis:'Kurzfristig richtig, langfristig teuer',
          gut:{ form:0.07, text:'Zwei Wochen Sonderschichten bringen dich zurück in die erste Reihe.' },
          schlecht:{ text:'Der Verband streicht dich für ein Jahr von der Liste.' } }
      ] },

    /* ---------- Rivalitaet ---------- */
    { id:'derby1', kat:'spiel', szene:'eis', tag:'Derbywoche', mehrfach:true,
      titel:'Der Gegner hat in der Presse deinen Namen genannt',
      text:'Er hat gesagt, du seist überbewertet, und die Zeitung hat es fett gedruckt. '
         + 'In der Kabine liegt das Blatt aufgeschlagen auf deinem Platz, und niemand '
         + 'gibt zu, es dorthin gelegt zu haben.',
      bedingung: st => st.age >= 21,
      optionen:[
        { t:'Auf dem Eis antworten', chance:55, hinweis:'Die einzige Währung, die zählt',
          gut:{ ruf:7, moral:6, attr:{ schuss:2, nerven:2 }, text:'Zwei Tore, kein Kommentar danach. Perfekt.' },
          schlecht:{ risiko:5, ruf:-3, text:'Du willst zu viel, spielst überhastet und siehst schlecht aus.' } },
        { t:'Öffentlich zurückschießen', chance:45, hinweis:'Schlagzeilen garantiert',
          gut:{ ruf:8, text:'Dein Konter ist besser als sein Angriff. Die Liga amüsiert sich.' },
          schlecht:{ ruf:-6, moral:-4, text:'Der Klub muss sich für dich entschuldigen.' } },
        { t:'Ignorieren', chance:80, hinweis:'Souverän, aber unspektakulär',
          gut:{ attr:{ nerven:2 }, text:'Du sagst nichts. Nach dem Spiel sucht er dich – nicht umgekehrt.' },
          schlecht:{ moral:-2, text:'Manche in der Kabine hätten sich mehr Feuer gewünscht.' } }
      ] },

    /* ---------- Schiedsrichter ---------- */
    { id:'schiri1', kat:'spiel', szene:'eis', tag:'Strittige Entscheidung', mehrfach:true,
      titel:'Das Tor zählt nicht – und niemand weiß genau, warum',
      text:'Der Videobeweis läuft vier Minuten. Die Halle pfeift, die Bank tobt, '
         + 'der Schiedsrichter fährt an die Bande und erklärt etwas, das niemand hört. '
         + 'Du stehst zehn Meter entfernt und siehst sein Gesicht.',
      bedingung: st => st.age >= 20,
      optionen:[
        { t:'Ruhig nachfragen', chance:75, hinweis:'Respekt zahlt sich langfristig aus',
          gut:{ ruf:4, attr:{ nerven:3 }, text:'Er erklärt es dir sachlich. In der Rückrunde bekommst du zwei knappe Entscheidungen.' },
          schlecht:{ text:'Er winkt ab. Immerhin gab es keine Strafe.' } },
        { t:'Lautstark protestieren', chance:35, hinweis:'Die Kabine liebt es, der Schiri nicht',
          gut:{ moral:7, text:'Die Mannschaft wacht auf und dreht das Spiel.' },
          schlecht:{ ruf:-4, moral:-2, text:'Zehn Minuten Disziplinarstrafe. Ihr verliert in Unterzahl.' } }
      ] },

    /* ---------- Aberglaube ---------- */
    { id:'aber1', kat:'privat', szene:'kabine', tag:'Vor dem Spiel', mehrfach:true,
      titel:'Der Zeugwart hat deine Ausrüstung gewaschen',
      text:'Vierzehn Spiele ungeschlagen, vierzehn Spiele ungewaschene Unterwäsche. '
         + 'Jetzt riecht alles nach Weichspüler, ordentlich gefaltet, mit einem freundlichen '
         + 'Zettel obendrauf. In zwei Stunden geht es raus.',
      bedingung: st => st.age >= 20,
      optionen:[
        { t:'Kurz durchatmen und spielen', chance:75, hinweis:'Es ist nur Wäsche',
          gut:{ attr:{ nerven:3 }, text:'Du spielst dein bestes Spiel der Saison. So viel zum Aberglauben.' },
          schlecht:{ form:-0.03, text:'Der ganze Abend fühlt sich falsch an. Serie beendet.' } },
        { t:'Ein Ersatzstück aus der Tasche kramen', chance:65, hinweis:'Kleiner Kompromiss',
          gut:{ moral:3, text:'Halb so wild. Die Serie hält noch drei Spiele.' },
          schlecht:{ text:'Es hilft nichts, aber du fühlst dich besser dabei.' } }
      ] },

    /* ---------- Ausruestung ---------- */
    { id:'material1', kat:'trainer', szene:'kabine', tag:'Materialfrage',
      titel:'Ein Hersteller will, dass du auf neue Kufen umsteigst',
      text:'Sie sind leichter, steifer und angeblich zwei Prozent schneller. '
         + 'Du fährst seit elf Jahren dasselbe Modell und weißt bei jeder Kurve genau, '
         + 'wo die Kante greift.',
      bedingung: st => st.age >= 23,
      optionen:[
        { t:'Umsteigen', chance:55, hinweis:'Fortschritt mit Eingewöhnung',
          gut:{ attr:{ skating:4, antritt:3 }, text:'Nach vier Wochen fragst du dich, warum du gewartet hast.' },
          schlecht:{ form:-0.05, risiko:3, text:'Du knickst zweimal um, bevor du zurückwechselst.' } },
        { t:'Beim Alten bleiben', chance:80, hinweis:'Was funktioniert, funktioniert',
          gut:{ attr:{ nerven:2 }, text:'Kein Risiko, keine Umstellung, keine Probleme.' },
          schlecht:{ text:'Die Konkurrenz wird schneller, du bleibst gleich.' } }
      ] },

    /* ---------- Soziales ---------- */
    { id:'sozial1', kat:'privat', szene:'stadt', tag:'Abseits des Eises',
      titel:'Eine Klinik fragt, ob du zu den Kindern auf die Station kommst',
      text:'Kein Fototermin, keine Presse, kein Klubvertreter. Nur ein Anruf von einer '
         + 'Schwester, die sagt, ein Junge auf Zimmer sieben trage seit drei Wochen dein Trikot '
         + 'unter dem Krankenhemd.',
      bedingung: st => st.ruf > 75,
      optionen:[
        { t:'Hingehen, ohne es jemandem zu sagen', chance:90, hinweis:'Nichts davon zählt in der Tabelle',
          gut:{ moral:5, ruf:3, attr:{ nerven:3 }, text:'Es kommt nie in die Zeitung. Du denkst trotzdem jahrelang daran.' },
          schlecht:{ text:'Der Termin platzt. Du schickst ein signiertes Trikot.' } },
        { t:'Den Klub die Presse mitbringen lassen', chance:60, hinweis:'Gute Tat mit Reichweite',
          gut:{ ruf:8, text:'Die Aktion wird zur Klubtradition und trägt bis heute deinen Namen.' },
          schlecht:{ ruf:-5, text:'Es wirkt inszeniert. Die Kommentarspalten sind grausam.' } }
      ] },

    /* ---------- Kabinenkultur ---------- */
    { id:'musik1', kat:'kabine', szene:'kabine', tag:'Kleinkrieg', mehrfach:true,
      titel:'Streit um die Kabinenmusik eskaliert',
      text:'Die junge Fraktion will Bässe, die Routiniers wollen Ruhe. Seit drei Wochen '
         + 'wird die Box heimlich lauter und leiser gedreht. Heute hat jemand das Kabel '
         + 'gezogen, und plötzlich geht es nicht mehr um Musik.',
      bedingung: st => st.age >= 24,
      optionen:[
        { t:'Eine Regel durchsetzen', folgt:'wortfuehrer', chance:65, hinweis:'Jemand muss es entscheiden',
          gut:{ moral:7, ruf:3, text:'Zwei Lieder pro Person, Reihenfolge nach Punkten. Alle akzeptieren es.' },
          schlecht:{ moral:-5, text:'Jetzt sind beide Lager gegen dich.' } },
        { t:'Rausgehen und Kaffee holen', chance:70, hinweis:'Nicht dein Problem',
          gut:{ text:'Als du zurückkommst, ist es geklärt. Manchmal löst sich alles von selbst.' },
          schlecht:{ moral:-3, text:'Der Streit schwelt bis in die Playoffs.' } }
      ] },

    /* ---------- Wechselgeruecht ---------- */
    { id:'transfer1', kat:'presse', szene:'stadt', tag:'Der Anruf',
      titel:'Ein Klub aus einer stärkeren Liga meldet sich direkt bei dir',
      text:'Nicht über den Berater, nicht über den Sportdirektor. Eine unbekannte Nummer, '
         + 'ein höflicher Mann, ein Gespräch, das es offiziell nicht gibt. '
         + 'Dein aktueller Vertrag läuft noch anderthalb Jahre.',
      bedingung: st => st.ruf > 80 && st.vertragJahre >= 1,
      optionen:[
        { t:'Zuhören und nichts versprechen', chance:80, hinweis:'Informationen kosten nichts',
          gut:{ ruf:5, text:'Du weißt jetzt, was du wert bist. Das hilft bei der nächsten Verhandlung.' },
          schlecht:{ moral:-4, text:'Jemand hat euch zusammen gesehen. Die Gerüchte laufen.' } },
        { t:'Sofort dem Klub melden', chance:75, hinweis:'Volle Offenheit',
          gut:{ moral:8, ruf:5, text:'Der Sportdirektor rechnet es dir hoch an – und bessert deinen Vertrag nach.' },
          schlecht:{ ruf:-2, text:'Man dankt dir, ändert aber nichts.' } },
        { t:'Auflegen', chance:70, hinweis:'Keine Ablenkung',
          gut:{ form:0.05, text:'Kopf frei, beste Rückrunde deiner Karriere.' },
          schlecht:{ text:'Sie melden sich nie wieder. Vielleicht war es die Chance.' } }
      ] },

    /* ---------- Sprache ---------- */
    { id:'sprache1', kat:'privat', szene:'stadt', tag:'Im neuen Land',
      titel:'Nach drei Monaten verstehst du in der Kabine immer noch nichts',
      text:'Die Taktikbesprechung läuft auf Englisch, alles andere nicht. '
         + 'Beim Essen sitzt du bei den zwei anderen Ausländern, und beim Lachen '
         + 'lachst du eine halbe Sekunde zu spät mit.',
      bedingung: st => st.klubJahre <= 1 && st.age >= 21,
      optionen:[
        { t:'Sprachunterricht nehmen', chance:70, hinweis:'Kostet Zeit, öffnet Türen',
          gut:{ moral:9, ruf:4, text:'Nach einem halben Jahr hältst du die Kabinenansprache in ihrer Sprache.' },
          schlecht:{ form:-0.03, text:'Die Stunden fressen Zeit, die dir zur Erholung fehlt.' } },
        { t:'Beim Englisch bleiben', chance:65, hinweis:'Auf dem Eis reicht es',
          gut:{ text:'Es funktioniert. Freunde findest du woanders.' },
          schlecht:{ moral:-6, text:'Du bleibst außen vor – und wirst als Erster aussortiert.' } }
      ] },

    /* ---------- Finanzen ---------- */
    { id:'geld1', kat:'privat', szene:'buero', tag:'Ein Freund mit einer Idee',
      titel:'Ein alter Bekannter will, dass du in sein Restaurant investierst',
      text:'Er hat den Businessplan dabei, spricht schnell und lacht viel. '
         + 'Ihr kennt euch seit der Jugend, damals hat er dich zu jedem Training mitgenommen. '
         + 'Die Summe ist genau so hoch, dass sie wehtun würde.',
      bedingung: st => st.age >= 26 && st.lauf.gehalt > 8,
      optionen:[
        { t:'Investieren', chance:45, hinweis:'Freundschaft und Geld',
          gut:{ ruf:5, moral:3, text:'Das Lokal läuft. Nach der Karriere hast du etwas, das dir gehört.' },
          schlecht:{ form:-0.05, text:'Es geht schief, und die Freundschaft geht mit.' } },
        { t:'Freundlich ablehnen', chance:70, hinweis:'Trennung von Beruf und Privatem',
          gut:{ text:'Er versteht es. Ihr sitzt trotzdem jeden Sommer zusammen.' },
          schlecht:{ moral:-4, text:'Er meldet sich nicht mehr. Manche Dinge kann man nicht reparieren.' } }
      ] },

    /* ---------- Alter ---------- */
    { id:'alter1', gewicht:2.5, kat:'trainer', szene:'buero', tag:'Das Gespräch',
      titel:'Der Sportdirektor fragt, wie lange du noch spielen willst',
      text:'Er formuliert es freundlich, fast beiläufig, zwischen zwei anderen Themen. '
         + 'Auf seinem Bildschirm ist ein Kaderplan offen, in dem hinter deinem Namen '
         + 'ein Fragezeichen steht.',
      bedingung: st => st.age >= 32,
      optionen:[
        { t:'Noch zwei, drei Jahre ansagen', chance:55, hinweis:'Selbstbewusst nach vorn',
          gut:{ trait:{ langlebig:6 }, ruf:4, text:'Er nickt und plant mit dir. Du hältst dein Wort.' },
          schlecht:{ ruf:-4, text:'Er hatte auf eine andere Antwort gehofft.' } },
        { t:'Ehrlich sagen, dass du es nicht weißt', chance:75, hinweis:'Offenheit schafft Vertrauen',
          gut:{ moral:6, ruf:3, text:'Ihr vereinbart, jedes Jahr neu zu entscheiden. Das nimmt Druck.' },
          schlecht:{ text:'Er sucht vorsichtshalber einen Nachfolger.' } },
        { t:'Nach einer Rolle im Klub danach fragen', chance:60, hinweis:'Über das Karriereende hinaus',
          gut:{ moral:7, trait:{ langlebig:4 }, text:'Man bietet dir einen Platz im Nachwuchs an. Das beruhigt ungemein.' },
          schlecht:{ moral:-3, text:'Die Frage wirkt, als hättest du schon abgeschlossen.' } }
      ] },

    /* ---------- Netzwerke ---------- */
    { id:'netz1', kat:'presse', szene:'presse', tag:'Nach dem Fehlpass', mehrfach:true,
      titel:'Ein Ausrutscher von dir läuft seit drei Tagen im Netz',
      text:'Zwölf Sekunden, aus schlechtem Winkel gefilmt, mit einer Musik unterlegt, '
         + 'die es noch schlimmer macht. Zwei Millionen Aufrufe. Dein Sohn hat es '
         + 'in der Schule gezeigt bekommen.',
      bedingung: st => st.age >= 23,
      optionen:[
        { t:'Selbst darüber lachen', chance:75, hinweis:'Den Wind aus den Segeln nehmen',
          gut:{ ruf:6, moral:4, text:'Dein eigener Beitrag dazu bekommt mehr Aufrufe als das Original.' },
          schlecht:{ ruf:-3, text:'Es wirkt bemüht. Der Spott geht weiter.' } },
        { t:'Alles ignorieren und offline gehen', chance:70, hinweis:'Ruhe bewahren',
          gut:{ form:0.04, text:'Nach zehn Tagen redet niemand mehr davon. Du hast nichts davon mitbekommen.' },
          schlecht:{ moral:-3, text:'Das Schweigen wird als Beleidigtsein ausgelegt.' } }
      ] },

    /* ---------- Wetter und Reise ---------- */
    { id:'reise1', kat:'spiel', szene:'stadt', tag:'Auswärtsfahrt', mehrfach:true,
      titel:'Der Bus steckt seit fünf Stunden im Schnee fest',
      text:'Anpfiff wäre in zwei Stunden, ihr steht auf einer Landstraße hinter '
         + 'zwei Lastwagen. Die Heizung fällt aus, das Essen ist alle, '
         + 'und irgendjemand hat angefangen, Karten zu spielen.',
      bedingung: st => st.age >= 19,
      optionen:[
        { t:'Die Stimmung hochhalten', chance:70, hinweis:'Aus der Not eine Kabinennacht machen',
          gut:{ moral:9, text:'Ihr gewinnt am nächsten Tag. Über diese Fahrt wird zehn Jahre geredet.' },
          schlecht:{ form:-0.03, text:'Ihr kommt zerknautscht an und verliert deutlich.' } },
        { t:'Schlafen und Energie sparen', chance:75, hinweis:'Profi bleiben',
          gut:{ attr:{ nerven:2 }, text:'Du bist der Einzige, der ausgeruht aufs Eis geht – und triffst zweimal.' },
          schlecht:{ moral:-3, text:'Die anderen fanden es unkameradschaftlich.' } }
      ] },

    /* ---------- Nachwuchs ---------- */
    { id:'jugend2', kat:'kabine', szene:'eis', tag:'Zurück am Anfang',
      titel:'Dein Jugendverein bittet dich um ein Training mit den Kleinen',
      text:'Dieselbe Halle, dieselbe zugige Umkleide, derselbe Geruch. '
         + 'Vierzig Kinder in zu großen Helmen stehen an der Bande und schauen dich an, '
         + 'als wärst du aus dem Fernsehen gestiegen.',
      bedingung: st => st.age >= 27 && st.ruf > 78,
      optionen:[
        { t:'Einen ganzen Tag bleiben', chance:85, hinweis:'Kostet einen freien Tag',
          gut:{ moral:6, ruf:6, text:'Der Verein benennt später die Nachwuchshalle nach dir.' },
          schlecht:{ text:'Es wird spät und anstrengend – aber es war schön.' } },
        { t:'Eine Stunde vorbeischauen', chance:80, hinweis:'Kompromiss',
          gut:{ ruf:3, text:'Kurz, aber alle haben ein Foto.' },
          schlecht:{ ruf:-2, text:'Man hatte mit mehr gerechnet.' } }
      ] }
,

    /* ---------- Aberglaube und Kabine ---------- */
    { id:'bart1', kat:'kabine', szene:'kabine', tag:'Playoff-Ritual', mehrfach:true,
      titel:'Die halbe Mannschaft rasiert sich seit sechs Wochen nicht',
      text:'Es fing als Witz an und ist längst keiner mehr. Wer gewinnt, lässt stehen. '
         + 'Deine Partnerin hat eine Meinung dazu, der Sponsor auch, und in der Kabine '
         + 'schaut man beim Frühstück, wer noch mitmacht.',
      bedingung: (st, s) => s && s.playoffs && st.age >= 21,
      optionen:[
        { t:'Mitmachen bis zum Schluss', folgt:'weggefaehrte', chance:75, hinweis:'Gemeinschaft vor Eitelkeit',
          gut:{ moral:8, text:'Das Mannschaftsfoto danach hängt heute noch im Klubmuseum.' },
          schlecht:{ text:'Ihr scheidet aus. Der Bart bleibt trotzdem drei Tage.' } },
        { t:'Nicht mitmachen', chance:60, hinweis:'Dein Gesicht, deine Regeln',
          gut:{ form:0.04, text:'Du fühlst dich wohler und spielst befreiter.' },
          schlecht:{ moral:-6, text:'Es wird nicht ausgesprochen, aber es fällt allen auf.' } }
      ] },

    /* ---------- Auslandserfahrung ---------- */
    { id:'olympia1', kat:'trainer', szene:'eis', tag:'Vor dem Turnier',
      titel:'Zwei Wochen Olympia oder zwei Wochen Regeneration',
      text:'Die Liga pausiert, der Verband ruft, und dein Rücken meldet sich seit Januar '
         + 'jeden Morgen zuerst. Der Klubarzt sagt nichts Verbindliches, aber er sagt es '
         + 'auf eine Art, die man versteht.',
      bedingung: st => st.natDebuet && st.age >= 26 && st.verletzungsjahre >= 1,
      optionen:[
        { t:'Fahren', chance:60, hinweis:'So eine Chance kommt alle vier Jahre',
          gut:{ ruf:8, moral:5, trait:{ playoff:5 },
                text:'Du kommst mit einer Medaille und neuem Selbstvertrauen zurück.' },
          schlecht:{ risiko:11, form:-0.07, text:'Der Rücken hält zwei Spiele. Danach ist die Saison gelaufen.' } },
        { t:'Absagen und behandeln lassen', chance:80, hinweis:'Der Klub zahlt dein Gehalt',
          gut:{ trait:{ robust:5 }, form:0.06, text:'Schmerzfrei zurück – und die stärkste Rückrunde deiner Karriere.' },
          schlecht:{ ruf:-6, text:'Der Verband ist verstimmt, die Presse noch mehr.' } }
      ] },

    /* ---------- Jugendsünde ---------- */
    { id:'nacht1', kat:'privat', szene:'stadt', tag:'Nach dem Sieg', mehrfach:true,
      titel:'Die Mannschaft zieht los, morgen ist Training um neun',
      text:'Ein Heimsieg gegen den Tabellenführer, die Stadt ist wach, und irgendjemand '
         + 'hat schon einen Tisch reserviert. Der Trainer hat nichts verboten. '
         + 'Er hat auch nichts erlaubt.',
      bedingung: st => st.age <= 27,
      optionen:[
        { t:'Mitgehen und früh raus', chance:65, hinweis:'Zwei Stunden, dann Schluss',
          gut:{ moral:7, text:'Genau die richtige Dosis. Die Kabine schweißt so etwas zusammen.' },
          schlecht:{ form:-0.04, text:'Aus zwei Stunden wurden fünf. Das Training am nächsten Tag war eine Qual.' } },
        { t:'Direkt nach Hause', chance:80, hinweis:'Professionell, aber einsam',
          gut:{ attr:{ nerven:2 }, text:'Ausgeruht, konzentriert, am Mittwoch der Beste auf dem Eis.' },
          schlecht:{ moral:-4, text:'„Der ist halt so." Man gewöhnt sich daran, dich nicht mehr zu fragen.' } }
      ] },

    /* ---------- Vereinskrise ---------- */
    { id:'insolvenz1', kat:'presse', szene:'buero', tag:'Schlechte Nachrichten',
      titel:'Dem Klub fehlt das Geld für die nächste Lizenz',
      text:'Die Gehälter kamen diesen Monat drei Tage zu spät, beim letzten Mal war es eine Woche. '
         + 'In der Kabine reden alle darüber und niemand offiziell. Dein Berater rät, '
         + 'sich still nach etwas anderem umzusehen.',
      bedingung: st => st.klubJahre >= 1 && st.age >= 23,
      optionen:[
        { t:'Bleiben und auf Gehalt verzichten', chance:55, hinweis:'Loyalität mit Preisschild',
          gut:{ moral:14, ruf:11, text:'Der Klub übersteht es. Du bist ab heute unantastbar.' },
          schlecht:{ text:'Es reicht trotzdem nicht. Am Ende stehst du ohne Verein und ohne Geld da.' } },
        { t:'Freigabe verlangen', chance:75, hinweis:'Vernünftig, aber unpopulär',
          gut:{ text:'Du wechselst geordnet und ohne Verluste.' },
          schlecht:{ ruf:-7, moral:-8, text:'„Der Erste, der von Bord ging" – das haftet.' } },
        { t:'Abwarten und spielen', chance:60, hinweis:'Keine Entscheidung ist auch eine',
          gut:{ form:0.05, text:'Du blendest alles aus und lieferst die konstanteste Saison seit Jahren.' },
          schlecht:{ moral:-5, form:-0.05, text:'Die Unsicherheit frisst sich in jedes Spiel.' } }
      ] },

    /* ---------- Technik ---------- */
    { id:'video1', kat:'trainer', szene:'buero', tag:'Videoanalyse',
      titel:'Die Analysten haben eine Schwäche in deinem Spiel gefunden',
      text:'Vierzehn Sequenzen, alle gleich: Du drehst bei Druck immer über dieselbe Schulter. '
         + 'Drei Gegner haben es bereits kopiert. Auf der Leinwand sieht es peinlich offensichtlich aus.',
      bedingung: st => st.age >= 22 && st.klubJahre >= 1,
      optionen:[
        { t:'Bewegungsmuster umlernen', chance:55, hinweis:'Monate an Arbeit gegen einen Reflex',
          gut:{ attr:{ puck:5, skating:4 }, text:'Nach einem halben Jahr greift der neue Reflex – und niemand kann dich mehr lesen.' },
          schlecht:{ form:-0.06, text:'Du denkst zu viel nach und verlierst dein natürliches Spiel.' } },
        { t:'Die Schwäche zur Falle machen', chance:45, hinweis:'Erwartung ausnutzen',
          gut:{ attr:{ uebersicht:6, praezision:4 }, ruf:6,
                text:'Sie erwarten die Drehung – und du spielst genau dann den Pass. Herrlich.' },
          schlecht:{ text:'Klingt schlau, funktioniert aber selten. Es bleibt beim Alten.' } },
        { t:'Ignorieren', chance:70, hinweis:'Was bisher funktioniert hat',
          gut:{ form:0.03, text:'Deine Stärken überdecken die Schwäche weiterhin.' },
          schlecht:{ form:-0.05, text:'Die Liga stellt sich darauf ein. Deine Werte sinken spürbar.' } }
      ] },

    /* ---------- Familie ---------- */
    { id:'kind1', kat:'privat', szene:'stadt', tag:'Zu Hause',
      titel:'Dein Kind kommt in die Schule – in einer Stadt, in der ihr vielleicht nicht bleibt',
      text:'Die Anmeldung liegt seit zwei Wochen auf dem Küchentisch. Dein Vertrag läuft '
         + 'noch ein Jahr, das Angebot aus dem Ausland liegt daneben, und im Nebenzimmer '
         + 'wird gerade ein Schulranzen anprobiert.',
      bedingung: st => st.age >= 27,
      optionen:[
        { t:'Sesshaft werden', chance:75, hinweis:'Ruhe im Rücken',
          gut:{ moral:8, trait:{ langlebig:5 }, text:'Zum ersten Mal seit Jahren fühlt sich ein Ort wie zu Hause an.' },
          schlecht:{ text:'Ein Jahr später wirst du trotzdem abgegeben. So ist das Geschäft.' } },
        { t:'Flexibel bleiben', chance:55, hinweis:'Die Karriere zuerst',
          gut:{ ruf:5, form:0.05, text:'Der Wechsel bringt die beste Phase deiner Laufbahn.' },
          schlecht:{ moral:-8, form:-0.05, text:'Zu Hause wird es still. Das nimmst du mit aufs Eis.' } }
      ] },

    /* ---------- Rekordjagd ---------- */
    { id:'rekord1', gewicht:2.5, kat:'spiel', szene:'eis', tag:'Auf Rekordkurs',
      titel:'Dir fehlt ein Punkt zum Vereinsrekord – und das Spiel ist längst entschieden',
      text:'Fünf Tore Vorsprung, viereinhalb Minuten übrig, und der Trainer hat die vierte Reihe '
         + 'draußen. Du sitzt auf der Bank und weißt genau, wie viele Punkte dir fehlen. '
         + 'Ein Blick würde reichen.',
      bedingung: st => st.klubJahre >= 3 && st.age >= 26,
      optionen:[
        { t:'Um einen Wechsel bitten', chance:45, hinweis:'Persönliches vor Mannschaft',
          gut:{ ruf:9, attr:{ praezision:3 }, text:'Der Rekord fällt, die Halle tobt, der Trainer lacht.' },
          schlecht:{ moral:-8, ruf:-4, text:'Er lässt dich draußen. Alle haben gehört, was du gefragt hast.' } },
        { t:'Sitzen bleiben', chance:85, hinweis:'Der Rekord läuft nicht weg',
          gut:{ moral:8, attr:{ nerven:3 }, text:'Zwei Wochen später fällt er ohnehin – im vollen Haus.' },
          schlecht:{ text:'Die Saison endet mit einem Punkt Rückstand auf den Rekord.' } }
      ] },

    /* ---------- Trainingslager ---------- */
    { id:'lager1', kat:'trainer', szene:'eis', tag:'Vorbereitung', mehrfach:true,
      titel:'Das Trainingslager ist brutal, und ein Mitspieler bricht zusammen',
      text:'Dritter Tag, zweite Einheit, achtunddreißig Grad in der Halle. '
         + 'Der Konditionstrainer zählt weiter, während zwei Betreuer den Jungen '
         + 'von der Bande wegtragen. Niemand sagt etwas.',
      bedingung: st => st.age >= 22,
      optionen:[
        { t:'Die Einheit abbrechen lassen', chance:50, hinweis:'Gegen den Trainerstab',
          gut:{ moral:12, ruf:6, text:'Der Klub überarbeitet danach sein ganzes Konzept. Man dankt es dir.' },
          schlecht:{ ruf:-8, text:'„Wer nicht mitzieht, spielt nicht." Du bekommst das zu spüren.' } },
        { t:'Durchziehen', chance:70, hinweis:'Härte hat auch ihren Wert',
          gut:{ trait:{ robust:6 }, form:0.06, text:'Du startest fitter in die Saison als je zuvor.' },
          schlecht:{ risiko:9, text:'Dein Körper zahlt die Rechnung im November.' } }
      ] },

    /* ---------- Nachwuchsförderung ---------- */
    { id:'stiftung1', kat:'privat', szene:'stadt', tag:'Nach der Karriere denken',
      titel:'Man bietet dir an, eine Nachwuchsstiftung zu gründen',
      text:'Ein Anwalt, ein Steuerberater und ein alter Weggefährte sitzen dir gegenüber. '
         + 'Es geht um Kinder, die sich die Ausrüstung nicht leisten können, und um '
         + 'einen erheblichen Teil deines Vermögens.',
      bedingung: st => st.age >= 30 && st.ruf > 80,
      optionen:[
        { t:'Gründen und selbst führen', chance:65, hinweis:'Zeit und Geld',
          gut:{ ruf:12, moral:6, text:'Zehn Jahre später spielen zwei Stiftungskinder in der ersten Liga.' },
          schlecht:{ form:-0.05, text:'Die Verwaltung frisst mehr Zeit, als dir während der Saison bleibt.' } },
        { t:'Nur den Namen geben', chance:80, hinweis:'Wirkung ohne Aufwand',
          gut:{ ruf:6, text:'Es läuft gut, ohne dass du dich kümmern musst.' },
          schlecht:{ ruf:-4, text:'Es kommt heraus, dass du kaum beteiligt bist.' } },
        { t:'Später', chance:70, hinweis:'Nach der Karriere ist auch noch Zeit',
          gut:{ form:0.04, text:'Voller Fokus aufs Eis – und du gründest sie tatsächlich später.' },
          schlecht:{ text:'Aus „später" wird nie.' } }
      ] },

    /* ---------- Abschied ---------- */
    { id:'abschied1', kat:'kabine', szene:'kabine', tag:'Das Ende einer Ära',
      titel:'Der dienstälteste Spieler der Mannschaft hört auf',
      text:'Zwanzig Jahre, ein Verein, dreihundert Spiele mehr als jeder andere im Raum. '
         + 'Er räumt seinen Platz aus, ohne Rede, ohne Aufhebens. Die jüngeren wissen nicht, '
         + 'wohin sie schauen sollen.',
      bedingung: st => st.age >= 27 && st.klubJahre >= 2,
      optionen:[
        { t:'Eine Rede halten', chance:65, hinweis:'Jemand muss es tun',
          gut:{ moral:11, ruf:6, text:'Du findest die richtigen Worte. Er umarmt dich, und die Kabine steht.' },
          schlecht:{ moral:-4, text:'Es wird zu lang und zu pathetisch. Peinliche Stille.' } },
        { t:'Seinen Platz übernehmen', chance:50, hinweis:'Symbolisch aufgeladen',
          gut:{ moral:9, ruf:5, trait:{ playoff:4 },
                text:'Die Botschaft ist klar: Die Verantwortung wechselt, nicht der Anspruch.' },
          schlecht:{ moral:-9, text:'Zu früh, zu forsch. Man findet es respektlos.' } },
        { t:'Ihn in Ruhe gehen lassen', chance:85, hinweis:'Manche Abschiede brauchen keine Zuschauer',
          gut:{ moral:4, text:'Ihr telefoniert am Abend eine Stunde. Das war ihm mehr wert als jede Rede.' },
          schlecht:{ text:'Es fühlt sich unfertig an. Ihr sprecht nie wieder darüber.' } }
      ] }
,

    /* ==========================================================
       Strang 1: Der Rivale aus dem eigenen Jahrgang
       ========================================================== */
    { id:'riv_start', gewicht:3, kat:'presse', szene:'presse', tag:'Der Vergleich',
      titel:'Ein Journalist stellt dich neben {rivale}',
      text:'Die Doppelseite trägt eure beiden Fotos nebeneinander, dazu zwei Statistikspalten '
         + 'und die Frage, wer von euch am Ende weiter kommt. Ihr wurdet im selben Jahr gezogen, '
         + 'und seitdem wird jede eurer Saisons gegeneinander gerechnet.',
      bedingung: st => st.rivale && st.age >= 22 && st.age <= 30,
      optionen:[
        { t:'Den Vergleich annehmen', chance:60, hinweis:'Öffentlicher Druck als Antrieb',
          folgt:'rivalitaet',
          gut:{ ruf:7, form:0.06, attr:{ nerven:3 },
                text:'Du sagst, du freust dich darauf. Der Satz steht am nächsten Tag als Überschrift – und du lieferst.' },
          schlecht:{ moral:-5, form:-0.04,
                text:'Jetzt wird jedes deiner Spiele an seinem gemessen. Das nagt mehr, als du dachtest.' } },
        { t:'Höflich abwiegeln', chance:80, hinweis:'Keine Angriffsfläche',
          gut:{ text:'„Wir spielen verschiedene Rollen." Damit ist das Thema vom Tisch.' },
          schlecht:{ ruf:-3, text:'Es klingt, als würdest du dem Vergleich ausweichen.' } },
        { t:'Ihn offen als Maßstab nennen', chance:55, hinweis:'Nur wer sich sicher ist', nurEig:'medienliebling',
          folgt:'rivalitaet',
          gut:{ ruf:10, attr:{ nerven:4 },
                text:'Souveränität kommt an. Er ruft dich am Abend an, und ihr lacht beide.' },
          schlecht:{ ruf:-6, text:'Es wirkt wie ein Eingeständnis, dass er der Bessere ist.' } }
      ] },

    { id:'riv_duell', kat:'spiel', szene:'eis', tag:'Direktes Duell', mehrfach:true,
      benoetigt:'rivalitaet',
      titel:'{rivale} steht heute Abend auf der anderen Seite',
      text:'Ausverkauftes Haus, beide Reihen werden gegeneinander aufgestellt, und die Übertragung '
         + 'blendet vor jedem Wechsel eure Statistiken ein. {trainer} hat in der Besprechung '
         + 'genau ein Mal seinen Namen gesagt – und dabei dich angeschaut.',
      bedingung: st => st.age >= 23,
      optionen:[
        { t:'Ihn den ganzen Abend beschatten', chance:55, hinweis:'Deine Statistik leidet, seine auch',
          gut:{ moral:8, ruf:6, attr:{ defensive:4 },
                text:'Er bleibt ohne Punkt. Nach dem Spiel klopft er dir anerkennend auf die Schulter.' },
          schlecht:{ form:-0.05, text:'Er dreht trotzdem auf – und du hast nebenbei dein eigenes Spiel verloren.' } },
        { t:'Dein Spiel durchziehen', chance:70, hinweis:'Nicht ablenken lassen',
          gut:{ ruf:5, form:0.05, text:'Drei Punkte. Er hat zwei. Genau so gewinnt man solche Abende.' },
          schlecht:{ moral:-4, text:'Ihr verliert, und er war der Beste auf dem Eis.' } },
        { t:'Ihn körperlich fordern', chance:45, hinweis:'Auf der Kippe zur Grenze',
          gut:{ moral:9, attr:{ zweikampf:4 },
                text:'Nach zwei harten Checks sucht er dich nicht mehr. Die Halle tobt.' },
          schlecht:{ risiko:8, ruf:-5, text:'Eine Strafzeit zu viel – in Unterzahl fällt das Gegentor.' } }
      ] },

    /* ==========================================================
       Strang 2: Der Trainer
       ========================================================== */
    { id:'tr_konflikt', gewicht:3, kat:'trainer', szene:'buero', tag:'Aussprache',
      titel:'{trainer} stellt dein Spielverständnis öffentlich infrage',
      text:'In der Pressekonferenz nach der Niederlage gegen {gegner} fiel ein Satz über '
         + '„Spieler, die glauben, das System gelte nicht für sie". Alle wissen, wer gemeint war. '
         + 'Am nächsten Morgen steht seine Bürotür offen.',
      bedingung: (st, se) => se && !se.title && st.klubJahre >= 1 && st.age >= 22,
      optionen:[
        { t:'Reingehen und es ausdiskutieren', chance:60, hinweis:'Direkt, aber respektvoll',
          folgt:'trainerpakt',
          gut:{ ruf:6, moral:7, attr:{ uebersicht:3 },
                text:'Ihr redet vierzig Minuten. Danach versteht ihr euch besser als je zuvor.' },
          schlecht:{ moral:-7, form:-0.06, text:'Es endet im Streit. Deine Eiszeit halbiert sich.' } },
        { t:'Die Tür ignorieren', chance:50, hinweis:'Schweigen als Antwort',
          gut:{ form:0.04, text:'Er respektiert, dass du auf dem Eis antwortest statt im Büro.' },
          schlecht:{ ruf:-6, moral:-6, text:'Aus einem Satz wird eine Fehde.' } },
        { t:'Es auf deine Art klären', chance:40, hinweis:'Kompromisslos wie immer', nurEig:'dickkopf',
          folgt:'trainerpakt',
          gut:{ ruf:9, moral:5, attr:{ nerven:5 },
                text:'Du sagst ihm klar, was du brauchst. Er ändert tatsächlich etwas am System.' },
          schlecht:{ ruf:-9, moral:-9, text:'Einer von euch muss gehen. Du bist es nicht – aber es fühlt sich nicht wie ein Sieg an.' } }
      ] },

    { id:'tr_pakt', kat:'trainer', szene:'eis', tag:'Vertrauenssache',
      benoetigt:'trainerpakt',
      titel:'{trainer} macht dich zum verlängerten Arm auf dem Eis',
      text:'Er will, dass du in engen Spielen die Reihen selbst zusammenstellst. '
         + 'Kein anderer Trainer hat dir je so viel überlassen. Es ist ein Vertrauensbeweis '
         + 'und eine Bürde in einem.',
      bedingung: st => st.age >= 23 && st.strangNamen && st.strangNamen.trainerpakt
                    && st.club && st.club.n === st.strangNamen.trainerpakt.klub,
      optionen:[
        { t:'Die Verantwortung übernehmen', chance:65, hinweis:'Mehr Einfluss, mehr Schuld',
          gut:{ moral:10, ruf:8, trait:{ playoff:6 }, attr:{ uebersicht:4 },
                text:'Zwei Wechsel in der Schlussminute, beide sitzen. Die Kabine nennt dich ab jetzt „Co".' },
          schlecht:{ moral:-8, ruf:-5, text:'Eine falsche Reihe zur falschen Zeit – und alle wissen, wer sie aufgestellt hat.' } },
        { t:'Dankend ablehnen', chance:75, hinweis:'Spieler bleiben, nicht Trainer werden',
          gut:{ form:0.05, text:'Kopf frei fürs eigene Spiel. Deine beste Ausbeute seit Jahren.' },
          schlecht:{ ruf:-3, text:'Er hatte auf mehr gehofft.' } }
      ] },

    /* Zweiter Beat: wenn der Trainer nicht mehr deiner ist. Vorher
       konnte sich der Pakt nur einloesen, solange man beim selben Klub
       blieb - und das bleibt fast niemand. */
    { id:'tr_gegner', gewicht:3, kat:'trainer', szene:'eis', tag:'Alte Bekannte',
      benoetigt:'trainerpakt',
      titel:'{trainer} steht heute auf der anderen Bank',
      text:'Er hat bei {damalsKlub} aufgehört und woanders angefangen. Vor dem Spiel '
         + 'sucht er deinen Blick über das ganze Eis hinweg. Er kennt jede deiner '
         + 'Bewegungen – und er hat sechzig Minuten Zeit, das zu nutzen.',
      bedingung: st => st.age >= 24 && st.strangNamen && st.strangNamen.trainerpakt
                    && st.club && st.club.n !== st.strangNamen.trainerpakt.klub,
      optionen:[
        { t:'Ihm zeigen, was er dir beigebracht hat', chance:58,
          hinweis:'Sein Spiel gegen ihn selbst',
          gut:{ ruf:9, moral:8, attr:{ uebersicht:3, nerven:3 },
                text:'Zwei Tore aus genau den Situationen, die er dir eingetrichtert hat. Nach dem Schlusspfiff hebt er die Hand.' },
          schlecht:{ moral:-7, text:'Er hat jede Bewegung vorher gesehen. Es war ein langer Abend.' } },
        { t:'Vor dem Spiel zu ihm gehen', chance:82,
          hinweis:'Zwei Minuten reden, dann Gegner sein',
          gut:{ moral:9, ruf:3,
                text:'Zwei Minuten in einem leeren Gang. Danach spielt ihr gegeneinander, als hätte es das nie gegeben – und beide wissen es besser.' },
          schlecht:{ moral:-3, text:'Er nickt nur kurz. Es ist nicht mehr wie früher, und das tut mehr weh als erwartet.' } },
        { t:'Es ignorieren', chance:70, hinweis:'Ein Gegner wie jeder andere',
          gut:{ form:0.05, text:'Kein Blick, kein Wort, dafür das beste Spiel seit Wochen.' },
          schlecht:{ ruf:-4, moral:-5,
                text:'Er erzählt danach der Presse, er habe dich anders in Erinnerung. Das bleibt hängen.' } }
      ] },

    /* Zweiter Beat: der Freund, der noch da ist. Das Wiedersehen setzt
       voraus, dass man getrennte Wege ging - dieser Fall ist der andere. */
    { id:'mit_zusammen', gewicht:3, kat:'kabine', szene:'kabine', tag:'Noch immer zusammen',
      benoetigt:'weggefaehrte',
      titel:'{mitspieler} und du seid die letzten aus der alten Kabine',
      text:'Alle anderen von damals sind weg, gewechselt oder aufgehört. Ihr zwei sitzt '
         + 'immer noch nebeneinander, seit Jahren derselbe Platz. Der Trainer fragt euch '
         + 'inzwischen, bevor er etwas ändert.',
      bedingung: st => st.age >= 25 && st.klubJahre >= 2 && st.strangNamen
                    && st.strangNamen.weggefaehrte && st.club
                    && st.club.n === st.strangNamen.weggefaehrte.klub,
      optionen:[
        { t:'Gemeinsam vorangehen', chance:74, hinweis:'Zwei Stimmen wiegen mehr als eine',
          gut:{ moral:12, rolle:2, ruf:5,
                text:'Ihr redet vor dem Spiel abwechselnd. Die Mannschaft hört zu, weil ihr euch nicht widersprecht.' },
          schlecht:{ moral:-6, text:'Zwei Wortführer sind einer zu viel. Es wird unübersichtlich.' } },
        { t:'Ihn vorlassen', chance:80, hinweis:'Nicht jede Bühne muss deine sein',
          gut:{ moral:7, attr:{ nerven:3 },
                text:'Er wächst in die Rolle, und du hast den Kopf frei fürs Spiel. Beides zahlt sich aus.' },
          schlecht:{ ruf:-4, text:'Man erwartet von dir mehr als ein Nicken aus der zweiten Reihe.' } }
      ] },

    /* Zweiter Beat: der Klub, den man am Ende doch verlaesst. */
    { id:'wf_abschied', gewicht:3, kat:'privat', szene:'buero', tag:'Nach all den Jahren',
      benoetigt:'treue',
      titel:'{damalsKlub} lädt dich zurück – den Verein, für den du geblieben bist',
      text:'Damals hast du dich entschieden zu bleiben, und man hat es dir hoch angerechnet. '
         + 'Inzwischen spielst du woanders. Jetzt fragen sie an, ob du zum Jubiläum kommst '
         + 'und ein paar Worte sagst. Die halbe Halle erinnert sich noch an die Saison, '
         + 'in der du nicht gegangen bist.',
      bedingung: st => st.age >= 26 && st.strangNamen && st.strangNamen.treue
                    && st.club && st.club.n !== st.strangNamen.treue.klub,
      optionen:[
        { t:'Hinfahren und reden', chance:76, hinweis:'Zurück, wo es angefangen hat',
          gut:{ ruf:8, moral:9,
                text:'Zweitausend Leute stehen auf, als dein Name fällt. Auf der Rückfahrt bist du eine Stunde lang still.' },
          schlecht:{ moral:-6, text:'Die Halle ist halb leer, und die meisten kennen dich nur vom Hörensagen. Es war ein langer Weg für wenig.' } },
        { t:'Absagen', chance:70, hinweis:'Nach vorn schauen, nicht zurück',
          gut:{ form:0.05, text:'Du bleibst im Training. Was vorbei ist, ist vorbei – und deine Beine danken es dir.' },
          schlecht:{ ruf:-6, moral:-4,
                text:'Man hatte fest mit dir gerechnet. Der Verein, dem du treu warst, schreibt nicht noch einmal.' } }
      ] },

    /* Zweiter Beat: was aus dem Wortfuehrer wird, wenn es eng wird. */
    { id:'wf_ernstfall', gewicht:3, kat:'kabine', szene:'kabine', tag:'Jetzt zählt es',
      benoetigt:'wortfuehrer',
      titel:'Sieben Niederlagen – und alle schauen zu dir',
      text:'Du hast damals das Wort ergriffen, und seitdem giltst du als der, der etwas '
         + 'sagt, wenn etwas gesagt werden muss. Jetzt steht die Mannschaft nach sieben '
         + 'Pleiten in der Kabine und wartet. Der Trainer sagt nichts. Er wartet auch.',
      bedingung: st => st.age >= 24,
      optionen:[
        { t:'Die Mannschaft in die Pflicht nehmen', chance:56,
          hinweis:'Deutlich werden, auch wenn es unbequem ist', wagnis:true,
          gut:{ moral:14, ruf:9, rolle:2, trait:{ playoff:5 },
                text:'Vier Sätze, keiner davon freundlich. Im nächsten Spiel läuft die Mannschaft, als hinge etwas davon ab.' },
          schlecht:{ moral:-11, ruf:-6, rolle:-1,
                text:'Es kippt. Zwei Mitspieler drehen sich weg, während du redest, und danach ist es schlimmer als vorher.' } },
        { t:'Einzelne beiseitenehmen', chance:74, hinweis:'Leiser, aber langsamer',
          gut:{ moral:8, attr:{ nerven:3 },
                text:'Drei Gespräche unter vier Augen. Es dauert zwei Wochen, aber es hält.' },
          schlecht:{ moral:-4, text:'Zu leise für einen Raum, in dem alle schreien wollen.' } },
        { t:'Diesmal schweigen', chance:66, hinweis:'Nicht jede Krise gehört dir',
          gut:{ form:0.06, text:'Du spielst dich aus der Krise, statt über sie zu reden. Das kommt auch an.' },
          schlecht:{ ruf:-7, rolle:-1,
                text:'Ausgerechnet du sagst nichts. Das merkt sich die Kabine länger als jede Niederlage.' } }
      ] },

    /* Zweiter Beat: der Zieh­vater am Ende der eigenen Laufbahn. */
    { id:'st_erbe', gewicht:3, kat:'kabine', szene:'kabine', tag:'Das Erbe',
      benoetigt:'ziehvater',
      titel:'{mitspieler} trägt jetzt die Binde, die du getragen hast',
      text:'Er stand als Junger neben dir und hat zugehört. Heute steht er vor der '
         + 'Mannschaft, und du sitzt zwei Plätze weiter. Er macht es anders als du – '
         + 'und in einigem besser.',
      bedingung: st => st.age >= 31,
      optionen:[
        { t:'Ihm den Platz lassen', chance:80, hinweis:'Deine Zeit vorne ist vorbei',
          gut:{ moral:10, ruf:6,
                text:'Du sagst nichts und stehst hinter ihm. Die Jungen sehen genau das – und lernen daraus mehr als aus jeder Rede.' },
          schlecht:{ moral:-4, text:'Loslassen klingt leichter, als es ist.' } },
        { t:'Ihm reinreden, wenn es nötig ist', chance:54,
          hinweis:'Erfahrung gegen Autorität', wagnis:true,
          gut:{ ruf:7, rolle:1, attr:{ uebersicht:3 },
                text:'Zweimal in der Saison widersprichst du ihm, beide Male hattest du recht. Er dankt es dir vor allen.' },
          schlecht:{ moral:-9, rolle:-2,
                text:'Zwei Autoritäten in einer Kabine sind keine. Der Trainer entscheidet sich für ihn.' } }
      ] },

    /* Zweiter Beat: das Heimspiel des Wechslers hat schon stattgefunden -
       das hier ist, was Jahre spaeter davon uebrig ist. */
    { id:'wf_bilanz', gewicht:3, kat:'presse', szene:'presse', tag:'Die alte Entscheidung',
      benoetigt:'wechsler',
      titel:'Ein Reporter rechnet dir vor, was der Wechsel damals gebracht hat',
      text:'Er hat die Zahlen mitgebracht: was du seitdem gewonnen hast, was der alte '
         + 'Klub ohne dich erreichte, was aus dem geworden ist, der deinen Platz bekam. '
         + 'Dann schiebt er das Blatt über den Tisch und fragt, ob es das wert war.',
      /* Nur wer wirklich Stationen hinter sich hat - sonst rechnet der
         Reporter eine Bilanz vor, die es gar nicht gibt. */
      bedingung: st => st.age >= 27 && (st.ehemalige || []).length >= 2,
      optionen:[
        { t:'Dazu stehen', chance:78, hinweis:'Es war deine Entscheidung',
          gut:{ ruf:7, moral:6, attr:{ nerven:3 },
                text:'„Ich würde es wieder tun." Der Satz steht am nächsten Tag über dem Artikel, und er stimmt.' },
          schlecht:{ ruf:-4, text:'Es klingt trotziger, als du es gemeint hast.' } },
        { t:'Zugeben, dass du zweifelst', chance:64, hinweis:'Ehrlich, aber angreifbar',
          gut:{ moral:9, ruf:4,
                text:'Ein ehrlicher Satz über eine alte Entscheidung. Die Leser mögen ihn mehr als jede Bilanz.' },
          schlecht:{ moral:-7, ruf:-5,
                text:'Aus einem Nebensatz wird eine Schlagzeile: „Er bereut den Wechsel."' } }
      ] },

    /* Der neue Mann an der Bande. Kein Strangoeffner, sondern die
       Frage, wie man einem begegnet, der einen nicht kennt - und der
       ueber Eiszeit und Rolle entscheidet. */
    { id:'tr_neuer', dringend:true, mehrfach:true, kat:'trainer', szene:'kabine', tag:'Der Neue',
      titel:'{trainer} übernimmt – und kennt dich nur vom Video',
      text:'Am ersten Tag steht er in der Kabine und sagt, jeder fange bei ihm bei null '
         + 'an. Es klingt nach einer Floskel, aber die Aufstellung am Abend zeigt, dass '
         + 'er es ernst meint. Was du dir beim Vorgänger aufgebaut hast, zählt hier nicht.',
      bedingung: st => !!st.trainerNeu,
      optionen:[
        { t:'Ihn im Training überzeugen', chance:66,
          hinweis:'Reden hilft nicht, laufen schon',
          gut:{ rolle:2, moral:6, attr:{ nerven:2 },
                text:'Drei Wochen als Erster auf dem Eis. In Spiel vier stehst du wieder da, wo du vorher warst.' },
          schlecht:{ rolle:-1, moral:-6,
                text:'Du rennst dich müde und er sieht es nicht. Die Reihe bleibt, wie sie ist.' } },
        { t:'Das Gespräch suchen', chance:58,
          hinweis:'Früh klarstellen, was du kannst',
          gut:{ rolle:2, ruf:5,
                text:'Zwanzig Minuten in seinem Büro. Danach weiß er, wofür er dich einsetzen kann – und tut es.' },
          schlecht:{ rolle:-2, ruf:-4,
                text:'Er hört zu und macht es trotzdem anders. Jetzt gilst du als einer, der fordert.' } },
        { t:'Abwarten, was er vorhat', chance:74,
          hinweis:'Kein Risiko, aber auch kein Anspruch',
          gut:{ form:0.04, text:'Du hältst dich raus und spielst. Nach zwei Monaten hat sich vieles von selbst geklärt.' },
          schlecht:{ moral:-5, rolle:-1,
                text:'Wer nichts sagt, wird eingeteilt. Deine Minuten gehen an jemanden, der lauter war.' } }
      ] },

    /* ==========================================================
       Strang 3: Der Weggefährte
       ========================================================== */
    { id:'mit_freund', gewicht:3, kat:'kabine', szene:'kabine', tag:'Der Weggefährte',
      titel:'{mitspieler} wird auf der Bank durchgereicht',
      text:'Ihr sitzt seit deinem ersten Tag bei {klub} nebeneinander, teilt Zimmer auf '
         + 'Auswärtsfahrten und einen ziemlich schlechten Musikgeschmack. Seit sechs Wochen '
         + 'spielt er kaum noch, und heute stand er beim Aufwärmen als Überzähliger daneben.',
      bedingung: st => st.klubJahre >= 2 && st.age >= 23,
      optionen:[
        { t:'Beim Trainer für ihn eintreten', chance:55, hinweis:'Dein Kredit für seinen Platz',
          folgt:'weggefaehrte',
          gut:{ moral:11, ruf:4,
                text:'Er bekommt eine Chance und macht das entscheidende Tor. Das vergisst er nie.' },
          schlecht:{ ruf:-5, text:'„Kümmer dich um dein Spiel." Das war deutlich.' } },
        { t:'Ihm privat zur Seite stehen', chance:80, hinweis:'Ohne großen Auftritt',
          folgt:'weggefaehrte',
          gut:{ moral:7, text:'Ihr trainiert morgens zu zweit. Nach einem Monat spielt er wieder.' },
          schlecht:{ text:'Er wird im Winter abgegeben. Ihr telefoniert noch jahrelang.' } },
        { t:'Es ist nicht dein Problem', chance:70, hinweis:'Profigeschäft',
          gut:{ form:0.04, text:'Du konzentrierst dich auf dich – und lieferst.' },
          schlecht:{ moral:-8, text:'Die Kabine merkt sich, wer weggeschaut hat.' } }
      ] },

    { id:'mit_wiedersehen', kat:'spiel', szene:'eis', tag:'Wiedersehen',
      benoetigt:'weggefaehrte',
      titel:'{mitspieler} spielt jetzt bei {gegner} – und trifft heute auf dich',
      text:'Vor dem Bully nickt ihr euch zu wie früher in der Kabine von {damalsKlub}. '
         + 'Dann geht es los, und plötzlich ist er einfach ein Gegenspieler, der dir '
         + 'den Weg zum Tor versperrt.',
      bedingung: st => st.age >= 22 && st.strangNamen && st.strangNamen.weggefaehrte
                    && st.club && st.club.n !== st.strangNamen.weggefaehrte.klub,
      optionen:[
        { t:'Freundschaft ruht für sechzig Minuten', chance:75, hinweis:'Profis verstehen das',
          gut:{ attr:{ nerven:3 }, ruf:4,
                text:'Ihr nehmt euch nichts, spielt beide stark, und trinkt danach ein Bier.' },
          schlecht:{ moral:-3, text:'Ein Check zu hart, ein Blick zu lang. Ihr redet danach nicht.' } },
        { t:'Ihm den Abend gönnen', chance:60, hinweis:'Menschlich, sportlich fragwürdig',
          gut:{ moral:6, text:'Er trifft, ihr gewinnt trotzdem. Perfekter Abend für beide.' },
          schlecht:{ ruf:-5, form:-0.04, text:'{trainer} sieht dein Zögern auf dem Video. Zweimal.' } }
      ] },

    /* ==========================================================
       Positionsgebundene Momente
       ========================================================== */
    { id:'g_wechsel', kat:'trainer', szene:'eis', tag:'Torwartfrage', nurPos:['G'],
      titel:'{trainer} zieht dich nach dem dritten Gegentor',
      text:'Zweites Drittel, 15:22 auf der Uhr, und der Schuss von der blauen Linie war haltbar. '
         + 'Als du zur Bank fährst, klatscht niemand ab. Der Ersatzmann hält danach alles, '
         + 'was kommt, und die Halle feiert ihn.',
      bedingung: st => st.age >= 21,
      optionen:[
        { t:'Am nächsten Tag als Erster auf dem Eis stehen', chance:70, hinweis:'Antwort ohne Worte',
          gut:{ attr:{ konstanz:4, nerven:3 }, ruf:5,
                text:'Du holst dir den Platz im nächsten Spiel mit einem Shutout zurück.' },
          schlecht:{ risiko:4, text:'Du überziehst im Training und gehst angeschlagen ins nächste Spiel.' } },
        { t:'Den Ersatzmann öffentlich loben', chance:80, hinweis:'Größe zeigen',
          gut:{ moral:9, ruf:6, text:'Aus einem Konkurrenten wird ein Verbündeter. Ihr teilt euch die Saison stark auf.' },
          schlecht:{ ruf:-2, text:'Man liest es als Aufgabe des Anspruchs auf die Nummer eins.' } },
        { t:'Sofort eine Aussprache verlangen', chance:50, hinweis:'Torhüter sind Diven, sagt man', nurEig:'dickkopf',
          gut:{ ruf:7, attr:{ nerven:5 }, text:'Er sichert dir die nächsten fünf Spiele zu. Du hältst vier davon zu null.' },
          schlecht:{ moral:-7, text:'Ab jetzt wechseln sie euch nach Tagesform. Das zermürbt.' } }
      ] },

    { id:'d_quarterback', kat:'trainer', szene:'buero', tag:'Überzahlspiel', nurPos:['D'],
      titel:'Das Powerplay läuft künftig über dich – oder über {mitspieler}',
      text:'Zwei Verteidiger, eine Position an der blauen Linie. {trainer} legt beide Videoprofile '
         + 'nebeneinander auf den Tisch: deine Schusshärte gegen seine ruhigere Hand. '
         + 'Er sagt, er entscheide diese Woche.',
      bedingung: st => st.age >= 22 && st.klubJahre >= 1,
      optionen:[
        { t:'Auf den Schuss setzen', chance:60, hinweis:'Deine offensichtliche Stärke',
          gut:{ attr:{ schuss:5, praezision:3 }, text:'Vierzehn Überzahltore in einer Saison. Die Diskussion ist beendet.' },
          schlecht:{ form:-0.04, text:'Der Gegner stellt sich in den Schusskanal. Nach zwei Monaten bist du raus.' } },
        { t:'Auf Passspiel umstellen', chance:55, hinweis:'Umlernen mitten in der Saison',
          gut:{ attr:{ pass:5, uebersicht:4 }, ruf:4,
                text:'Du wirst zum Taktgeber – und sammelst mehr Vorlagen als je zuvor.' },
          schlecht:{ text:'Es passt nicht zu dir. Nach sechs Wochen läuft es wieder über ihn.' } },
        { t:'{mitspieler} den Vortritt lassen', chance:75, hinweis:'Teamgedanke',
          gut:{ moral:9, text:'Das Überzahlspiel läuft besser als je zuvor. Alle wissen, warum du verzichtet hast.' },
          schlecht:{ ruf:-4, text:'Du bekommst die Position nie zurück.' } }
      ] },

    { id:'c_bully', kat:'spiel', szene:'eis', tag:'Bullypunkt', nurPos:['C'],
      titel:'Das entscheidende Bully im eigenen Drittel',
      text:'Neunzehn Sekunden, ein Tor Vorsprung, Bully links vor eurem Tor. '
         + 'Der Gegner schickt seinen besten Bullyspieler aufs Eis. {trainer} schaut dich an '
         + 'und nickt Richtung Punkt.',
      bedingung: st => st.age >= 20,
      optionen:[
        { t:'Auf Sieg gehen', chance:55, hinweis:'Alles oder nichts am Punkt',
          gut:{ attr:{ zweikampf:4, nerven:3 }, moral:6,
                text:'Puck zurück zum Verteidiger, raus aus dem Drittel, Spiel gewonnen.' },
          schlecht:{ moral:-5, text:'Verloren. Zwölf Sekunden später steht es unentschieden.' } },
        { t:'Den Schläger des Gegners blocken', chance:70, hinweis:'Unsauber, aber wirksam',
          gut:{ attr:{ zweikampf:3 }, text:'Kein sauberer Sieg, aber der Puck landet an der Bande. Reicht.' },
          schlecht:{ ruf:-3, text:'Der Schiedsrichter pfeift dich vom Punkt. Der Ersatzmann verliert das Bully.' } }
      ] },

    /* ==========================================================
       Charaktergebundene Momente
       ========================================================== */
    { id:'eig_kabinenherz', kat:'kabine', szene:'kabine', tag:'Die Kabine hört auf dich',
      nurEig:'kabinenherz',
      titel:'Zwei Mitspieler tragen ihren Streit vor dir aus',
      text:'Sie stehen sich in der Mitte des Raums gegenüber, es geht angeblich um einen Fehlpass '
         + 'und in Wahrheit um Eiszeit. Alle anderen schauen weg. Nur einer im Raum kann das '
         + 'beenden, und alle wissen, wer.',
      bedingung: st => st.age >= 24,
      optionen:[
        { t:'Beide zur Seite nehmen', chance:80, hinweis:'Was du am besten kannst',
          gut:{ moral:12, ruf:5, text:'Am Abend sitzen sie zusammen beim Essen. So etwas kannst nur du.' },
          schlecht:{ moral:-4, text:'Diesmal sitzt es zu tief. Einer der beiden wird im Winter abgegeben.' } },
        { t:'Sie ausdiskutieren lassen', chance:55, hinweis:'Manches muss raus',
          gut:{ moral:6, text:'Nach zehn lauten Minuten ist die Luft raus – und die Kabine klarer.' },
          schlecht:{ moral:-9, text:'Es eskaliert. Der Trainerstab muss eingreifen, und das kommt an die Presse.' } }
      ] },

    { id:'eig_einzel', kat:'privat', szene:'stadt', tag:'Der eigene Weg', nurEig:'einzelgaenger',
      titel:'Die Mannschaft fährt ins Teambuilding – du wurdest nicht gefragt',
      text:'Drei Tage Hütte, Wandern, gemeinsames Kochen. Die Einladung ging an alle. '
         + 'Bei dir hat man offenbar angenommen, dass du ohnehin absagst. '
         + 'Vielleicht stimmt das sogar.',
      bedingung: st => st.age >= 23,
      optionen:[
        { t:'Unangekündigt auftauchen', chance:60, hinweis:'Gegen dein eigenes Muster',
          gut:{ moral:14, ruf:5, text:'Der Abend, an dem sich alles änderte. Die Kabine sieht dich seitdem anders.' },
          schlecht:{ moral:-5, text:'Es bleibt steif. Nach einem Tag fährst du zurück.' } },
        { t:'Die Zeit allein zum Training nutzen', chance:80, hinweis:'Dein gewohnter Weg',
          gut:{ attr:{ praezision:4, reflexe:4 }, form:0.05,
                text:'Drei Tage ungestörtes Eis. Du kommst besser zurück als alle anderen.' },
          schlecht:{ moral:-4, text:'Der Abstand zur Mannschaft wird ein Stück größer.' } }
      ] },

    { id:'eig_heimat', kat:'privat', szene:'stadt', tag:'Ruf aus der Heimat', nurEig:'heimverbunden',
      titel:'Dein Jugendverein steht vor dem Aus',
      text:'Die Halle ist marode, der Hauptsponsor abgesprungen, und in zwei Monaten '
         + 'entscheidet sich, ob es die Nachwuchsabteilung weiter gibt. '
         + 'Man fragt dich nicht um Geld. Man fragt, ob du kommst.',
      bedingung: st => st.age >= 26,
      optionen:[
        { t:'Ein Benefizspiel organisieren', chance:65, hinweis:'Dein Name als Zugpferd',
          gut:{ ruf:11, moral:6, text:'Ausverkaufte Halle, genug Geld für drei Jahre. Sie benennen die Kabine nach dir.' },
          schlecht:{ form:-0.05, text:'Die Organisation frisst deine ganze Sommerpause – und es reicht trotzdem nicht.' } },
        { t:'Still einen größeren Betrag überweisen', chance:80, hinweis:'Ohne Aufhebens',
          gut:{ moral:7, text:'Niemand erfährt davon. Der Verein überlebt.' },
          schlecht:{ text:'Es verzögert das Ende nur um ein Jahr.' } },
        { t:'Es tut dir leid, aber die Saison läuft', chance:65, hinweis:'Der Profi vor dem Menschen',
          gut:{ form:0.05, text:'Voller Fokus – deine stärkste Rückrunde. Der Verein schafft es auch ohne dich.' },
          schlecht:{ ruf:-8, moral:-6, text:'Die Halle schließt. In deiner Heimatstadt spricht man anders über dich.' } }
      ] },

    /* ---------- Weitere personalisierte Momente ---------- */
    { id:'pers_trikot', kat:'kabine', szene:'kabine', tag:'Nummernstreit',
      titel:'Ein Neuzugang bei {klub} will deine Nummer {nummer}',
      text:'Er hat sie seit der Jugend getragen, sagt er, und bietet dir eine teure Uhr dafür. '
         + 'Du trägst diese Zahl, seit dich jemand zum ersten Mal aufs Eis geschickt hat.',
      bedingung: st => st.klubJahre >= 1 && st.age >= 22,
      optionen:[
        { t:'Abgeben und eine neue wählen', chance:70, hinweis:'Es ist nur eine Zahl',
          gut:{ moral:6, text:'Die neue Nummer wird später unter dem Hallendach hängen. Ausgerechnet.' },
          schlecht:{ form:-0.03, text:'Es fühlt sich das ganze Jahr falsch an.' } },
        { t:'Behalten', chance:85, hinweis:'Deine Zahl',
          gut:{ attr:{ nerven:2 }, text:'Er nimmt die 71 und sagt nie wieder ein Wort darüber.' },
          schlecht:{ moral:-3, text:'Zwischen euch bleibt es kühl.' } }
      ] },

    { id:'pers_stadt', kat:'privat', szene:'stadt', tag:'Angekommen',
      titel:'Nach {jahre} Jahren bei {klub} erkennt dich die halbe Stadt',
      text:'Beim Bäcker wird nicht mehr gefragt, was du möchtest, sondern ob es wie immer sein soll. '
         + 'Ein Kind im {klub}-Trikot winkt dir vom Fenster des Busses. '
         + 'Es ist der Moment, in dem aus einem Arbeitsort eine Heimat wird.',
      /* Frueher an einer festen Jahreszahl (vier Saisons) - damit fiel
         das Ereignis durch, sobald sich die Wechselhaeufigkeit
         aenderte. Jetzt haengt es an dem, worum es geht: dass der
         Verein dich als seinen erkennt. */
      bedingung: st => st.klubJahre >= 3
        || !!(st.club && st.klubKonto && st.klubKonto[st.club.n]
              && st.klubKonto[st.club.n].rang !== 'zugang'),
      gewicht: 2.4,
      optionen:[
        { t:'Eine Wohnung kaufen', chance:75, hinweis:'Ein Bekenntnis',
          gut:{ moral:9, trait:{ langlebig:4 }, text:'Du bleibst noch Jahre. Der Klub weiß das zu schätzen.' },
          schlecht:{ text:'Zwei Jahre später wirst du abgegeben und vermietest sie.' } },
        { t:'Zur Miete bleiben', chance:70, hinweis:'Beweglich bleiben',
          gut:{ text:'Gut so. Das nächste Angebot kommt schneller als gedacht.' },
          schlecht:{ moral:-4, text:'Du bleibst überall ein Gast, auch nach vielen Jahren.' } }
      ] },

    { id:'pers_derby', kat:'spiel', szene:'eis', tag:'Gegen {spitze}', mehrfach:true,
      titel:'{spitze} führt die {liga} an – heute kommen sie zu euch',
      text:'Der Tabellenführer, ausverkauftes Haus, und {trainer} hat die Woche über '
         + 'nichts anderes trainiert als das Umschaltspiel gegen genau diese Mannschaft. '
         + 'Draußen stehen Leute ohne Karte.',
      bedingung: st => st.age >= 21,
      optionen:[
        { t:'Von der ersten Sekunde Druck machen', chance:55, hinweis:'Mut gegen den Besten',
          gut:{ moral:9, ruf:6, form:0.05, text:'Zwei Tore in den ersten sieben Minuten. Die Halle explodiert.' },
          schlecht:{ moral:-5, text:'Nach dem frühen Gegentor läuft ihr nur noch hinterher.' } },
        { t:'Kompakt stehen und auf Konter warten', chance:70, hinweis:'Unspektakulär, aber wirksam',
          gut:{ attr:{ defensive:3 }, moral:5, text:'1:0 durch einen Konter, danach macht ihr hinten dicht.' },
          schlecht:{ text:'Ihr haltet lange mit, verliert aber im letzten Drittel.' } }
      ] }
  ,

    /* ==========================================================
       Folgen der Wechselfrist
       ========================================================== */
    { id:'wf_heimspiel', kat:'spiel', szene:'eis', tag:'Rückkehr',
      benoetigt:'wechsler',
      titel:'Erstes Spiel bei {ehemaliger} – auf der falschen Bank',
      text:'Du kennst den Weg zur Kabine, nur biegst du heute anders ab. '
         + 'Auf der Tribüne hängt ein Banner mit deinem Namen, und niemand weiß, '
         + 'ob es Dank oder Vorwurf sein soll. Beim Aufwärmen schaust du einmal zu lange hoch.',
      bedingung: st => st.age >= 22,
      optionen:[
        { t:'Den Empfang annehmen und winken', chance:70, hinweis:'Bevor das Spiel beginnt',
          gut:{ ruf:7, moral:8,
                text:'Die Halle applaudiert dreißig Sekunden lang. Danach ist es ein Spiel wie jedes andere.' },
          schlecht:{ moral:-6, text:'Ein Pfeifkonzert. Es trifft dich mehr, als du zugeben willst.' } },
        { t:'Nach dem Tor bewusst nicht jubeln', chance:65, hinweis:'Respekt vor der alten Kurve',
          gut:{ ruf:9, attr:{ nerven:3 },
                text:'Du triffst, hebst kurz die Hand und senkst sie wieder. Genau das bleibt in Erinnerung.' },
          schlecht:{ ruf:-4, text:'Du triffst nicht. Die Geste, die du dir zurechtgelegt hattest, verpufft.' } },
        { t:'Ihnen zeigen, was sie verloren haben', chance:50, hinweis:'Kein Zurückhalten',
          gut:{ ruf:11, moral:9, form:0.06,
                text:'Zwei Tore, eine Vorlage, und beim letzten Wechsel steht die halbe Halle auf – widerwillig.' },
          schlecht:{ moral:-9, ruf:-6,
                text:'Du überziehst, kassierst zwei Strafen, und die Kurve hat ihren Abend.' } }
      ] },

    { id:'wf_treuelohn', kat:'trainer', szene:'buero', tag:'Treue',
      benoetigt:'treue',
      titel:'{klub} erinnert sich daran, dass du geblieben bist',
      /* Der Strang "Treue" wird geoeffnet, wenn man an der Frist bei
         einem Verein bleibt. Dieses Folgeereignis sprach danach aber
         den *aktuellen* Verein an - wer inzwischen gewechselt hatte,
         bekam von seinem neuen Klub gesagt, er erinnere sich daran,
         dass man geblieben sei. Deshalb nur dort, wo es auch stimmt.
         (Das Gegenstueck wf_abschied ist ausdruecklich fuer den Fall
         gebaut, dass man woanders spielt, und bleibt wie es ist.) */
      text:'Damals hättest du gehen können, und alle wussten es. '
         + 'Jetzt sitzt die Vereinsführung dir gegenüber und redet von Verlässlichkeit, '
         + 'von einem Gesicht für den Verein – und davon, dass so etwas seinen Preis hat.',
      bedingung: st => st.age >= 22 && st.klubJahre >= 2
                    && st.strangNamen && st.strangNamen.treue
                    && st.club && st.strangNamen.treue.klub === st.club.n,
      optionen:[
        { t:'Den Preis benennen', chance:60, hinweis:'Treue darf etwas kosten',
          gut:{ ruf:8, moral:7,
                text:'Sie zahlen ohne Widerspruch. Wer einmal geblieben ist, verhandelt aus einer anderen Lage.' },
          schlecht:{ moral:-7, text:'Der Ton kippt. Aus Dankbarkeit wird ein zähes Gespräch über Zahlen.' } },
        { t:'Um Verantwortung statt Geld bitten', chance:72, hinweis:'Eine Rolle, kein Betrag',
          gut:{ ruf:10, moral:9, trait:{ playoff:5 },
                text:'Sie machen dich zum Bindeglied zwischen Kabine und Büro. Kein Vertrag, aber mehr Gewicht.' },
          schlecht:{ ruf:-3, text:'Man nickt freundlich und ändert nichts.' } }
      ] },

    { id:'wf_stimme', kat:'presse', szene:'presse', tag:'Wortführer',
      benoetigt:'wortfuehrer',
      titel:'Du hast die erste Reihe gefordert – jetzt willst du auch reden',
      text:'Nach der vierten Niederlage in Folge stehen zwanzig Mikrofone im Gang, '
         + 'und {trainer} ist schon durch. Die Mannschaft schaut auf dich, weil du derjenige warst, '
         + 'der damals den Mund aufgemacht hat.',
      // Der Strang oeffnet sich nur bei starken Klubs - die erreichen fast
      // immer die Playoffs. Deshalb hier keine Playoff-Bedingung.
      bedingung: st => st.age >= 24 && st.klubJahre >= 1,
      optionen:[
        { t:'Die Verantwortung auf dich nehmen', chance:68, hinweis:'Vor die Mannschaft stellen',
          gut:{ ruf:9, moral:10, attr:{ nerven:4 },
                text:'Du sagst, es liege an dir. Am nächsten Abend spielt die Mannschaft, als schulde sie dir etwas.' },
          schlecht:{ ruf:-5, text:'Es klingt nach einer Ausrede, die niemand verlangt hat.' } },
        { t:'Die Mannschaft in die Pflicht nehmen', chance:48, hinweis:'Deutlich und riskant',
          gut:{ ruf:7, moral:6, attr:{ zweikampf:3 },
                text:'Harte Worte, die sitzen. Drei Siege in Folge geben dir recht.' },
          schlecht:{ moral:-11, ruf:-7,
                text:'Am nächsten Morgen hängt dein Zitat in der Kabine – jemand hat es ausgedruckt und angepinnt.' } },
        { t:'Nichts sagen und gehen', chance:55, hinweis:'Schweigen hat auch einen Preis',
          gut:{ text:'Kein Wort, keine Schlagzeile. Manchmal ist das die ganze Kunst.' },
          schlecht:{ ruf:-6, text:'Wer laut wird, wenn er etwas will, und still, wenn es schlecht läuft, verliert Kredit.' } }
      ] },

    /* ==========================================================
       Mehr Tiefe im Karriereverlauf
       ========================================================== */
    { id:'st_mentor', gewicht:3, kat:'kabine', szene:'kabine', tag:'Der Nachrücker',
      titel:'Ein Achtzehnjähriger bekommt deinen Platz im Training zugeteilt',
      text:'Er spielt deine Position, hat deine Nummer als Kind getragen und fragt nach jedem '
         + 'Training, ob du ihm etwas zeigst. Er ist gut. Er ist schnell gut geworden.',
      bedingung: st => st.age >= 27,
      optionen:[
        { t:'Ihm alles beibringen, was du weißt', chance:75, hinweis:'Auch wenn es dich Platz kostet',
          folgt:'ziehvater',
          gut:{ moral:11, ruf:6,
                text:'Er wird besser, ihr spielt zusammen in einer Reihe, und der Klub verlängert mit euch beiden.' },
          schlecht:{ moral:-5, text:'Nach vier Monaten spielt er, wo du gespielt hast.' } },
        { t:'Höflich bleiben, aber auf Abstand', chance:70, hinweis:'Profigeschäft',
          gut:{ form:0.05, text:'Du konzentrierst dich auf dich und verteidigst deinen Platz mit Leistung.' },
          schlecht:{ moral:-6, text:'Die Kabine merkt, dass du dich bedroht fühlst. Das ist kein gutes Bild.' } }
      ] },

    { id:'st_ziehvater', kat:'kabine', szene:'kabine', tag:'Der Schüler',
      benoetigt:'ziehvater',
      titel:'{mitspieler} wird vor dir zum Nationalspieler berufen',
      text:'Du hast ihm gezeigt, wie man den Schläger hält, wenn es eng wird. '
         + 'Jetzt liest du seinen Namen auf einer Liste, auf der deiner nicht steht. '
         + 'Er ruft dich am Abend an und weiß nicht, was er sagen soll.',
      bedingung: st => st.age >= 29,
      optionen:[
        { t:'Dich ehrlich für ihn freuen', chance:78, hinweis:'Es kostet etwas, und das ist in Ordnung',
          gut:{ moral:10, ruf:5,
                text:'Ihr redet zwei Stunden. So etwas hält länger als jede Nominierung.' },
          schlecht:{ moral:-4, text:'Du sagst die richtigen Sätze und legst mit einem Kloß im Hals auf.' } },
        { t:'Es als Ansporn nehmen', chance:58, hinweis:'Noch ist nichts vorbei',
          gut:{ form:0.08, attr:{ nerven:4 }, ruf:6,
                text:'Deine stärkste Rückrunde seit Jahren. Beim nächsten Turnier stehst du wieder auf der Liste.' },
          schlecht:{ moral:-7, text:'Du willst zu viel, spielst verkrampft, und niemand ruft an.' } }
      ] },

    { id:'st_formtief', kat:'privat', szene:'stadt', tag:'Formtief', mehrfach:true,
      titel:'Vierzehn Spiele ohne Scorerpunkt',
      text:'Du machst nichts anders als vorher. Du trainierst mehr, schläfst schlechter, '
         + 'und der Puck findet trotzdem jeden Weg außer den ins Tor. '
         + 'In der Zeitung steht das Wort, das niemand ausspricht: Formkrise.',
      bedingung: (st, se) => st.age >= 22 && se && se.gp > 20,
      optionen:[
        { t:'Mehr trainieren als alle anderen', chance:55, hinweis:'Der offensichtliche Weg',
          gut:{ attr:{ praezision:4, schuss:3, reflexe:4 }, form:0.06,
                text:'Nach drei Wochen fällt einer rein, und danach fallen sie alle.' },
          schlecht:{ risiko:7, moral:-5, text:'Du läufst dir die Beine wund und wirst nur müder.' } },
        { t:'Einen Sportpsychologen aufsuchen', chance:70, hinweis:'Ungewöhnlich, aber wirksam',
          gut:{ attr:{ nerven:6, konstanz:4 }, moral:8,
                text:'Zwei Sitzungen, ein Satz, der hängen bleibt. Der Kopf war das Problem, nicht die Hände.' },
          schlecht:{ ruf:-3, text:'Es spricht sich herum und wird zu einer Geschichte, die du nicht wolltest.' } },
        { t:'Eine Woche komplett abschalten', chance:60, hinweis:'Gegen jeden Instinkt',
          gut:{ moral:10, form:0.07,
                text:'Sieben Tage ohne Eis. Danach macht es wieder Spaß, und der Rest kommt von selbst.' },
          schlecht:{ form:-0.06, text:'Du kommst zurück und bist noch weiter weg als vorher.' } }
      ] },

    { id:'st_rekordnacht', kat:'spiel', szene:'eis', tag:'Rekordjagd',
      titel:'Ein Punkt fehlt dir zum Klubrekord von {klub}',
      text:'Der Mann, der ihn hält, sitzt heute auf der Tribüne und ist eigens angereist. '
         + 'Die Halle weiß Bescheid, die Anzeigetafel zeigt es mit, und jeder deiner Wechsel '
         + 'beginnt mit einem Raunen.',
      bedingung: st => st.klubJahre >= 3 && st.age >= 25,
      optionen:[
        { t:'Den Rekord holen wollen', chance:58, hinweis:'Alles auf diesen Abend',
          gut:{ ruf:12, moral:10,
                text:'Sechs Minuten vor Schluss fällt er. Der alte Rekordhalter steht als Erster auf.' },
          schlecht:{ moral:-6, ruf:-3, text:'Du erzwingst zu viel, verlierst Pucks, und der Abend geht ohne Punkt zu Ende.' } },
        { t:'Normal spielen und abwarten', chance:72, hinweis:'Er kommt oder er kommt nicht',
          gut:{ ruf:9, attr:{ nerven:3 },
                text:'Eine unscheinbare Vorlage in der zweiten Minute. Danach spielst du frei auf.' },
          schlecht:{ text:'Diesmal nicht. Es bleiben noch Spiele.' } }
      ] },

    { id:'st_comeback', gewicht:3, kat:'privat', szene:'kabine', tag:'Rückkehr',
      titel:'Das erste Spiel nach der Verletzung',
      text:'Die Ärzte haben dich freigegeben, der Körper hält, und trotzdem steht beim Aufwärmen '
         + 'die Frage im Raum, die niemand stellt: Gehst du in den nächsten Zweikampf so hinein '
         + 'wie vorher? Die Stelle, an der es passiert ist, kennst du auf Zentimeter genau.',
      bedingung: (st, se) => se && se.verletzung && se.verletzung.spiele >= 10,
      optionen:[
        { t:'Sofort den ersten harten Check suchen', chance:55, hinweis:'Die Frage sofort beantworten',
          gut:{ moral:12, attr:{ zweikampf:4, nerven:4 },
                text:'Es tut nichts weh. Nach diesem einen Moment ist die Verletzung wirklich vorbei.' },
          schlecht:{ risiko:10, moral:-8, text:'Es zieht wieder. Diesmal nur ein Schreck – aber der sitzt.' } },
        { t:'Vorsichtig herantasten', chance:75, hinweis:'Wochen statt Minuten',
          gut:{ attr:{ konstanz:3 }, text:'Nach einem Monat bist du wieder ganz da, ohne Rückschlag.' },
          schlecht:{ form:-0.06, moral:-5, text:'Die Vorsicht bleibt und kostet dich den entscheidenden Schritt.' } },
        { t:'Die Ausrüstung komplett umstellen', chance:48, hinweis:'Neuer Schutz, neues Gefühl',
          gut:{ trait:{ robust:8 }, moral:7,
                text:'Anderes Material, anderer Sitz – und plötzlich denkst du nicht mehr daran.' },
          schlecht:{ form:-0.05, text:'Nichts passt richtig. Du wechselst nach sechs Wochen wieder zurück.' } }
      ] },

    { id:'st_familie', kat:'privat', szene:'stadt', tag:'Zuhause',
      titel:'Ein Angebot in einer Stadt, die nicht deine ist',
      text:'Es geht diesmal nicht um dich. Jemand, der dir wichtig ist, hat die Chance seines Lebens – '
         + 'siebenhundert Kilometer entfernt. Dein Vertrag hier läuft noch zwei Jahre.',
      bedingung: st => st.age >= 26,
      optionen:[
        { t:'Um eine Freigabe bitten', chance:52, hinweis:'Dein Weg richtet sich nach jemand anderem',
          gut:{ moral:12, text:'Der Klub lässt dich ziehen, ohne es an die große Glocke zu hängen. Das vergisst du nie.' },
          schlecht:{ moral:-8, ruf:-4, text:'Man besteht auf dem Vertrag. Zwei Jahre Fernbeziehung liegen vor euch.' } },
        { t:'Die Entfernung aushalten', chance:62, hinweis:'Zwei Jahre sind zwei Jahre',
          gut:{ attr:{ nerven:4 }, text:'Es geht gut. Anstrengend, aber es geht.' },
          schlecht:{ moral:-9, form:-0.05, text:'Es zermürbt euch beide, und man sieht es deinem Spiel an.' } },
        { t:'Gemeinsam gegen das Angebot entscheiden', chance:66, hinweis:'Auch das ist eine Wahl',
          gut:{ moral:9, text:'Ihr bleibt. Es fühlt sich richtig an, auch wenn es niemand versteht.' },
          schlecht:{ moral:-10, text:'Der Verzicht steht ab jetzt zwischen euch im Raum.' } }
      ] },

    { id:'st_abschiedsfrage', gewicht:3, kat:'kabine', szene:'kabine', tag:'Wie lange noch',
      titel:'Ein Mitspieler fragt dich, wie lange du noch spielst',
      text:'Er meint es nicht böse, er fragt aus echtem Interesse. '
         + 'Trotzdem ist es das erste Mal, dass dir jemand diese Frage stellt – '
         + 'und das erste Mal, dass du keine schnelle Antwort hast.',
      bedingung: st => st.age >= 33,
      optionen:[
        { t:'Ehrlich sagen, dass du es nicht weißt', chance:80, hinweis:'Offenheit statt Pose',
          gut:{ moral:7, text:'Ihr redet lange. Danach ist der Gedanke kleiner als vorher.' },
          schlecht:{ moral:-5, text:'Es auszusprechen macht es realer, als dir lieb ist.' } },
        { t:'Noch drei Jahre ankündigen', chance:50, hinweis:'Ein Versprechen an dich selbst',
          gut:{ trait:{ langlebig:9 }, moral:8,
                text:'Du sagst es laut, und ab da trainierst du wie jemand, der ein Ziel hat.' },
          schlecht:{ moral:-6, text:'Der Satz steht im Raum, und dein Körper hat ihn nicht mitgehört.' } }
      ] }
  ,

    /* ==========================================================
       Torhüter
       ========================================================== */
    { id:'g_penalty', kat:'spiel', szene:'eis', tag:'Penalty', nurPos:['G'], mehrfach:true,
      titel:'Penalty gegen {klub} – 40 Sekunden vor Schluss, ihr führt mit einem Tor',
      text:'Die Halle steht, der Schiedsrichter legt den Puck auf den Punkt, '
         + 'und der Schütze nimmt sich betont viel Zeit. Du kennst ihn: '
         + 'Er geht in acht von zehn Fällen in die kurze Ecke. Meistens.',
      bedingung: st => st.age >= 20,
      optionen:[
        { t:'Auf die kurze Ecke festlegen', chance:52, hinweis:'Sein Muster – wenn er es diesmal spielt',
          gut:{ moral:12, ruf:8, attr:{ reflexe:4, lesen:3 },
                text:'Du bist da, bevor er schießt. Der Puck klatscht in deine Fanghand, die Halle explodiert.' },
          schlecht:{ moral:-7, text:'Er hat es geahnt und schiebt in die andere Ecke. Ausgleich.' } },
        { t:'Lange stehen bleiben und reagieren', chance:64, hinweis:'Kein Muster, nur Reflex',
          gut:{ attr:{ reflexe:5 }, moral:8,
                text:'Du bleibst stehen, bis er sich entschieden hat. Der Rest ist Handwerk.' },
          schlecht:{ moral:-5, text:'Eine Zehntelsekunde zu spät. Der Puck ist schon vorbei.' } },
        { t:'Ihn mit einem Wort aus dem Konzept bringen', chance:40, hinweis:'Grenzwertig, aber wirksam',
          gut:{ ruf:9, moral:10, attr:{ nerven:5 },
                text:'Was du sagst, versteht nur er. Sein Schuss geht einen halben Meter am Tor vorbei.' },
          schlecht:{ ruf:-8, text:'Er trifft und dreht sich zu dir um. Das Bild läuft eine Woche lang in jeder Zusammenfassung.' } }
      ] },

    { id:'g_maske', kat:'privat', szene:'stadt', tag:'Die Maske', nurPos:['G'],
      titel:'Ein Maler fragt, was auf deine neue Maske soll',
      text:'Er hat schon für halbe Nationalmannschaften gearbeitet und will wissen, '
         + 'wofür du stehst. Nicht welche Farben – wofür. '
         + 'Du sitzt in seiner Werkstatt und merkst, dass du länger nachdenkst als erwartet.',
      bedingung: st => st.age >= 21,
      optionen:[
        { t:'Die Heimatstadt aufs Kinn', chance:78, hinweis:'Woher du kommst',
          gut:{ moral:9, ruf:5,
                text:'Die Skyline deiner Kleinstadt auf einer Maske in der besten Liga der Welt. Zuhause hängt das Foto in jeder Kneipe.' },
          schlecht:{ text:'Es wird schön, aber niemand erkennt, was es darstellen soll.' } },
        { t:'Etwas, das dem Gegner Angst macht', chance:60, hinweis:'Ein Bild, das im Kopf bleibt',
          gut:{ ruf:9, attr:{ nerven:3 },
                text:'Zwei Augen, sonst nichts. Stürmer sagen später, sie hätten nie gern draufgeschaut.' },
          schlecht:{ ruf:-4, text:'Es wirkt bemüht. In den Netzwerken macht man sich lustig.' } },
        { t:'Die Namen der Menschen, die dich hergebracht haben', chance:85, hinweis:'Klein, nur für dich',
          gut:{ moral:12, text:'Winzige Schrift am Hinterkopf, lesbar nur aus einem Meter. Du weißt, dass sie da sind.' },
          schlecht:{ moral:-3, text:'Ein Journalist fotografiert es heran und macht eine Geschichte daraus, die dir nicht gehört.' } }
      ] },

    { id:'g_serie', kat:'presse', szene:'presse', tag:'Die Serie', nurPos:['G'],
      titel:'Seit 187 Minuten hast du kein Gegentor bekommen',
      text:'Noch zwei Drittel bis zum Klubrekord. Alle reden davon, nur in der Kabine '
         + 'spricht es niemand aus – dort gilt es als sicherer Weg, die Serie zu beenden. '
         + '{trainer} fragt, ob du eine Pause willst.',
      bedingung: st => st.age >= 22,
      optionen:[
        { t:'Spielen und die Serie jagen', chance:55, hinweis:'Der Rekord ist zum Greifen',
          gut:{ ruf:12, moral:10, attr:{ konstanz:4 },
                text:'Vier Minuten vor Schluss ist der Rekord deiner. Die Bank leert sich, bevor die Sirene geht.' },
          schlecht:{ moral:-6, text:'Nach elf Minuten ein abgefälschter Schuss. Aus.' } },
        { t:'Die Pause annehmen', chance:70, hinweis:'Der Körper vor dem Rekord',
          gut:{ attr:{ reflexe:3, konstanz:3 }, form:0.06,
                text:'Frisch zurück, und die Serie läuft trotzdem weiter – zwei Spiele später fällt der Rekord doch.' },
          schlecht:{ moral:-5, ruf:-3, text:'Dein Vertreter hält zu null. Plötzlich diskutiert die Stadt über die Nummer eins.' } }
      ] },

    { id:'g_aussetzer', kat:'kabine', szene:'kabine', tag:'Der weiche Treffer', nurPos:['G'], mehrfach:true,
      titel:'Ein Schuss von der Mittellinie geht dir durch die Beine',
      text:'Es gibt keine Erklärung dafür. Der Puck war langsam, du hast ihn gesehen, '
         + 'und trotzdem liegt er im Netz. Auf dem Videowürfel läuft die Szene dreimal. '
         + 'Danach spielt ihr noch vierzig Minuten.',
      bedingung: st => st.age >= 20,
      optionen:[
        { t:'Es sofort abhaken und weitermachen', chance:62, hinweis:'Die Kunst des Torhüters',
          gut:{ attr:{ nerven:5, konstanz:3 }, moral:7,
                text:'Danach hältst du alles. Am Ende redet niemand mehr über den einen Puck.' },
          schlecht:{ moral:-8, form:-0.05, text:'Es geht dir den ganzen Abend nicht aus dem Kopf. Zwei weitere fallen.' } },
        { t:'Dich in der Pause bei der Mannschaft entschuldigen', chance:72, hinweis:'Offen damit umgehen',
          gut:{ moral:9, ruf:4,
                text:'Zwei Mitspieler klopfen dir auf die Maske. Danach spielt ihr befreiter als vorher.' },
          schlecht:{ moral:-4, text:'Es macht das Ganze größer, als es war.' } },
        { t:'Die Videoanalyse noch am Abend durchgehen', chance:58, hinweis:'Verstehen statt vergessen',
          gut:{ attr:{ stellung:5, lesen:4 },
                text:'Du findest den Fehler: eine Handbreit zu weit rechts. So etwas passiert dir nicht wieder.' },
          schlecht:{ moral:-6, text:'Du siehst die Szene zwanzigmal und findest nichts. Das ist schlimmer.' } }
      ] },

    /* ==========================================================
       Verteidiger
       ========================================================== */
    { id:'d_block', kat:'spiel', szene:'eis', tag:'Der Block', nurPos:['D'], mehrfach:true,
      titel:'Letzte Minute, Unterzahl, und ihr führt gegen {gegner} mit einem Tor',
      text:'Ihr Verteidiger zieht ab, und zwischen dem Puck und eurem Tor stehst nur du. '
         + 'Der Schuss kommt aus zwölf Metern. Du hast eine halbe Sekunde für die Entscheidung, '
         + 'ob du dich hineinwirfst.',
      bedingung: st => st.age >= 20,
      optionen:[
        { t:'Dich in den Schuss werfen', chance:66, hinweis:'Der Knochen hält meistens',
          gut:{ moral:11, ruf:7, attr:{ defensive:4 },
                text:'Der Puck trifft dich am Schienbein, springt an die Bande, die Sirene geht. Die Bank steht.' },
          schlecht:{ risiko:12, moral:-5, text:'Der Puck trifft den Spann. Du humpelst vom Eis und weißt sofort, dass es länger dauert.' } },
        { t:'Den Schusskanal zustellen, ohne zu fallen', chance:72, hinweis:'Stehend verteidigen',
          gut:{ attr:{ uebersicht:3, defensive:3 },
                text:'Er findet keinen Weg durch und muss abdrehen. Unspektakulär und genau richtig.' },
          schlecht:{ moral:-7, text:'Der Schuss geht an dir vorbei und rein. Ausgleich in der letzten Minute.' } }
      ] },

    { id:'d_partner', gewicht:3, kat:'kabine', szene:'kabine', tag:'Der Partner', nurPos:['D'],
      titel:'{mitspieler} soll nicht mehr neben dir verteidigen',
      text:'Ihr habt zwei Jahre lang jede Schicht zusammen gespielt und braucht keine Blicke mehr, '
         + 'um zu wissen, wer wohin geht. {trainer} will die Paare neu mischen '
         + 'und stellt dir einen Neuzugang an die Seite.',
      bedingung: st => st.klubJahre >= 2 && st.age >= 23,
      optionen:[
        { t:'Für euer Paar kämpfen', chance:55, hinweis:'Eingespielt schlägt talentiert',
          folgt:'weggefaehrte',
          gut:{ moral:10, attr:{ defensive:3 },
                text:'Er lässt euch zusammen. Ihr seid am Saisonende das beste Paar der Liga.' },
          schlecht:{ ruf:-5, moral:-6, text:'Die Entscheidung steht. Jetzt weiß auch der Neue, dass du ihn nicht wolltest.' } },
        { t:'Dich auf den Neuen einlassen', chance:70, hinweis:'Ein Paar neu aufbauen',
          gut:{ attr:{ uebersicht:4, pass:3 }, ruf:5,
                text:'Nach sechs Wochen läuft es. Du merkst, wie viel du dabei selbst dazugelernt hast.' },
          schlecht:{ form:-0.05, text:'Ihr findet den Rhythmus nicht. Die Gegentore fallen auf eurer Seite.' } }
      ] },

    /* ==========================================================
       Stürmer
       ========================================================== */
    { id:'s_ladehemmung', kat:'spiel', szene:'eis', tag:'Ladehemmung', nurPos:['C','LW','RW'], mehrfach:true,
      titel:'Neunzehn Torschüsse in vier Spielen – und kein Treffer',
      text:'Die Chancen sind da, die Beine sind da, nur der Puck geht nicht rein. '
         + 'Beim letzten Spiel hast du zweimal Pfosten getroffen. '
         + 'Der Videotrainer legt dir wortlos eine Zusammenstellung deiner Abschlüsse hin.',
      bedingung: st => st.age >= 20,
      optionen:[
        { t:'Den Schläger komplett wechseln', chance:58, hinweis:'Aberglaube mit System',
          gut:{ attr:{ schuss:4, praezision:4 },
                text:'Anderer Flex, anderes Gefühl – im nächsten Spiel zwei Tore.' },
          schlecht:{ form:-0.05, text:'Es fühlt sich fremd an. Du wechselst nach zwei Wochen zurück, um nichts gebessert.' } },
        { t:'Einfacher spielen und vors Tor gehen', chance:72, hinweis:'Keine schönen Tore mehr',
          gut:{ attr:{ zweikampf:3, puck:3 }, moral:6,
                text:'Ein abgefälschter Schuss vom Schlittschuh. Hässlich und genau das, was du gebraucht hast.' },
          schlecht:{ moral:-5, text:'Du bekommst Prügel vor dem Tor und trotzdem nichts.' } },
        { t:'Auf den nächsten Schuss alles setzen', chance:44, hinweis:'Ein Versuch, ganz oder gar nicht',
          gut:{ ruf:8, moral:11, attr:{ schuss:5 },
                text:'Aus der Drehung in den Winkel. Manche Serien enden mit dem schönsten Tor des Jahres.' },
          schlecht:{ moral:-8, text:'Wieder Pfosten. Du beginnst, an den einfachsten Dingen zu zweifeln.' } }
      ] }
  ,

    /* ==========================================================
       Das Jahrgangsrennen
       ========================================================== */
    { id:'jg_jagd', gewicht:3.5, kat:'presse', szene:'presse', tag:'Die Jagd', mehrfach:true,
      titel:'Zwischen dir und dem Nächsten liegen keine zwanzig Punkte mehr',
      text:'Seit ihr im selben Jahr gezogen wurdet, wird jede eurer Saisons nebeneinander gelegt. '
         + 'Diesmal ist der Abstand so klein wie nie. Ein Reporter hat ausgerechnet, '
         + 'wie viele Spiele du brauchst, um vorbeizuziehen, und legt dir den Zettel hin.',
      bedingung: st => st.jahrgangDelta && st.jahrgangDelta.vorn
                    && st.jahrgangDelta.vorn.abstand <= 20 && st.age >= 23,
      optionen:[
        { t:'Den Zettel einstecken und liefern', chance:58, hinweis:'Die Jagd annehmen',
          gut:{ form:0.08, moral:9, attr:{ nerven:3 },
                text:'Du ziehst vorbei, und es fühlt sich an wie ein Titel, von dem sonst niemand weiß.' },
          schlecht:{ moral:-6, text:'Du willst zu viel. Der Abstand wächst wieder.' } },
        { t:'Sagen, dass du nicht gegen Zahlen spielst', chance:76, hinweis:'Kopf frei behalten',
          gut:{ attr:{ konstanz:4 }, form:0.05,
                text:'Ohne den Vergleich im Nacken spielst du befreit – und ziehst nebenbei vorbei.' },
          schlecht:{ ruf:-3, text:'Es liest sich, als hättest du den Vergleich längst aufgegeben.' } }
      ] },

    { id:'jg_spitze', gewicht:3.5, kat:'presse', szene:'presse', tag:'An der Spitze',
      titel:'Du führst deinen Jahrgang an',
      text:'Von den acht Namen, die damals zusammen gezogen wurden, steht deiner ganz oben. '
         + 'Zwei spielen längst nicht mehr, einer ist in die zweite Liga zurück. '
         + 'Man fragt dich, ob du damit gerechnet hättest.',
      bedingung: st => st.jahrgangDelta && st.jahrgangDelta.platz === 1 && st.age >= 26,
      optionen:[
        { t:'An die erinnern, die es nicht geschafft haben', chance:80, hinweis:'Größe zeigen',
          gut:{ ruf:9, moral:8,
                text:'Du nennst zwei Namen, die sonst niemand mehr nennt. Der Satz wird oft zitiert.' },
          schlecht:{ text:'Es wirkt einstudiert, obwohl es das nicht war.' } },
        { t:'Sagen, dass du erst am Anfang stehst', chance:62, hinweis:'Die Messlatte höher legen',
          gut:{ ruf:8, trait:{ langlebig:6 },
                text:'Ein Satz, an dem du dich messen lassen musst – und der dich noch Jahre trägt.' },
          schlecht:{ ruf:-5, text:'Man hakt nach, was denn noch kommen soll. Du hast keine gute Antwort.' } }
      ] },

    { id:'jg_hinterher', gewicht:3.5, kat:'privat', szene:'stadt', tag:'Hinterher', mehrfach:true,
      titel:'{rivale} ist längst dort, wo du hinwolltest',
      text:'Ihr habt im selben Sommer angefangen, im selben Draft, mit denselben Aussichten. '
         + 'Heute liest du seinen Namen in Zusammenhängen, in denen deiner nicht vorkommt. '
         + 'Es ist niemandes Schuld, und genau das macht es schwer.',
      bedingung: st => st.jahrgangDelta && st.jahrgangDelta.platz >= 5
                    && st.rivale && st.age >= 25,
      optionen:[
        { t:'Den Vergleich endgültig loslassen', chance:74, hinweis:'Deine Laufbahn ist deine',
          gut:{ moral:11, attr:{ konstanz:4 },
                text:'Von dem Tag an spielst du nur noch für dich. Es wird deine beständigste Phase.' },
          schlecht:{ moral:-5, text:'Man lässt so etwas nicht los, weil man es beschließt.' } },
        /* folgt gehoert an die Option, nicht in die Wirkung - die
           Engine liest o.folgt. Innerhalb von gut stand es hier
           wirkungslos: der Strang oeffnete sich nie. */
        { t:'Ihn anrufen', chance:66, hinweis:'Der unbequeme Weg', folgt:'rivalitaet',
          gut:{ moral:12, ruf:4,
                text:'Zwei Stunden am Telefon. Am Ende habt ihr beide erzählt, wovor ihr Angst habt.' },
          schlecht:{ moral:-6, text:'Es bleibt bei Höflichkeiten. Ihr habt euch nichts mehr zu sagen.' } },
        { t:'Alles auf eine letzte große Saison setzen', chance:42, hinweis:'Wenig zu verlieren',
          gut:{ form:0.11, ruf:10, moral:10,
                text:'Die beste Saison deines Lebens, mit achtundzwanzig. Plötzlich reden alle wieder von dir.' },
          schlecht:{ risiko:9, moral:-9, text:'Du überziehst in jeder Hinsicht und zahlst dafür.' } }
      ] }
  ,

    /* ==========================================================
       Momente beim Turnier der Nationalmannschaft
       ========================================================== */
    { id:'t_halbfinale', kat:'spiel', szene:'eis', tag:'Halbfinale', gewicht:3, mehrfach:true,
      titel:'Verlängerung im Halbfinale – und {trainer} ist nicht dein Trainer',
      text:'Beim Turnier steht ein anderer hinter der Bande, einer, der dich kaum kennt. '
         + 'Drei gegen drei, zweite Verlängerung, und er sucht mit den Augen die Reihe, '
         + 'die er aufs Eis schickt. Du stehst auf und stellst dich an die Tür.',
      bedingung: (st, se) => se && se.nat && st.age >= 21,
      optionen:[
        { t:'Dich selbst ins Spiel bringen', chance:54, hinweis:'Ungefragt, aber deutlich',
          gut:{ ruf:10, moral:9, attr:{ nerven:4 },
                text:'Neunzig Sekunden später fällt das Tor, und deine Hand war am Schläger.' },
          schlecht:{ ruf:-6, text:'Er schickt andere. Von der Bank aus siehst du das Gegentor kommen.' } },
        { t:'Warten, bis er dich ruft', chance:70, hinweis:'Die Hierarchie achten',
          gut:{ moral:6, attr:{ konstanz:3 },
                text:'Er ruft. Genau in dem Moment, in dem es zählt – und du bist bereit.' },
          schlecht:{ moral:-5, text:'Der Ruf kommt nie. Zuschauen ist die längste Art zu verlieren.' } }
      ] },

    { id:'t_kabine', kat:'kabine', szene:'kabine', tag:'Turnierkabine', gewicht:3,
      titel:'Zwei Wochen Kabine mit Spielern, die du sonst checkst',
      text:'Neben dir sitzt einer, gegen den du seit Jahren um jeden Zentimeter kämpfst. '
         + 'Jetzt teilt ihr Trikotfarbe und Zimmergang. Beim ersten Abendessen '
         + 'setzt sich niemand neben ihn.',
      bedingung: (st, se) => se && se.nat && st.age >= 22,
      optionen:[
        { t:'Dich neben ihn setzen', chance:76, hinweis:'Zwei Wochen sind zu kurz für Fehden',
          folgt:'weggefaehrte',
          gut:{ moral:9, ruf:5,
                text:'Am Ende des Turniers habt ihr eine Nummer getauscht. Die Ligaspiele bleiben trotzdem hart.' },
          schlecht:{ moral:-4, text:'Es bleibt bei Höflichkeiten. Manche Gräben sind zu tief.' } },
        { t:'Die Distanz halten', chance:62, hinweis:'Im Herbst spielt ihr wieder gegeneinander',
          gut:{ attr:{ zweikampf:3 },
                text:'Klare Verhältnisse. Beide wissen, woran sie sind, und das reicht für zwei Wochen.' },
          schlecht:{ moral:-6, text:'Die Mannschaft spürt die Kälte. Im Viertelfinale fehlt genau das eine Prozent.' } }
      ] },

    { id:'t_medaille', kat:'presse', szene:'presse', tag:'Nach dem Turnier', gewicht:3.5,
      titel:'Eine Medaille um den Hals und ein Mikrofon vor dem Gesicht',
      text:'Die Halle leert sich, das Eis ist zerschnitten, und jemand hält dir ein Mikrofon hin. '
         + 'Du hast seit vierzehn Tagen kaum geschlafen und im Kopf noch das Spiel, '
         + 'nicht die Worte.',
      bedingung: (st, se) => se && se.nat
                          && /Gold|Silber|Bronze/.test(String(se.nat.platz)),
      optionen:[
        { t:'Über die Mannschaft reden, nicht über dich', chance:82, hinweis:'Das erwartet man – zu Recht',
          gut:{ ruf:8, moral:7,
                text:'Du nennst vier Namen und deinen nicht. Der Ausschnitt läuft wochenlang.' },
          schlecht:{ text:'Es wird zusammengeschnitten, bis nur noch eine Floskel übrig ist.' } },
        { t:'Sagen, dass es nicht gereicht hat', chance:48, hinweis:'Ehrlich, aber undankbar',
          gut:{ ruf:11, attr:{ nerven:3 },
                text:'Ein Satz gegen die Feierlaune, der hängen bleibt. Im nächsten Jahr holt ihr mehr.' },
          schlecht:{ ruf:-8, moral:-5,
                text:'Man wirft dir vor, den Erfolg kleinzureden. Zuhause versteht das niemand.' } }
      ] },

    /* ==========================================================
       Die Ausstiegsklausel wird gezogen
       ========================================================== */
    { id:'kl_anruf', kat:'trainer', szene:'buero', tag:'Die Klausel', gewicht:5, mehrfach:true,
      titel:'Jemand hat deine Ausstiegsklausel gelesen',
      text:'Sie steht in deinem Vertrag, weil du damals danach gefragt hast. '
         + 'Jetzt liegt ein Klub am Telefon, der bereit ist, sie zu bezahlen – '
         + 'und {klub} kann nichts dagegen tun. Nur du kannst.',
      bedingung: st => st.klausel && st.klubJahre >= 1 && st.age >= 22,
      optionen:[
        { t:'Die Klausel ziehen lassen', chance:66, hinweis:'Du hast sie dir dafür geholt',
          folgt:'wechsler',
          gut:{ ruf:8, moral:7,
                text:'Zwei Telefonate, eine Unterschrift. Was damals eine Zeile war, ist heute dein Weg.' },
          schlecht:{ moral:-7, text:'Beim Gesundheitscheck fällt etwas auf. Der Wechsel platzt, das Verhältnis ist hin.' } },
        { t:'Ablehnen und bleiben', chance:74, hinweis:'Die Klausel bleibt für später',
          folgt:'treue',
          gut:{ moral:10, ruf:6,
                text:'Du sagst ab, obwohl du gehen könntest. Genau das rechnet man dir hier hoch an.' },
          schlecht:{ moral:-5, text:'Das Angebot kommt nicht wieder, und der Klub hakt es sofort ab.' } },
        { t:'Sie gegen einen besseren Vertrag eintauschen', chance:44, hinweis:'Riskant – dein Faustpfand',
          gut:{ ruf:6, moral:8,
                text:'Du gibst die Klausel auf und bekommst dafür einen Vertrag, der sich gewaschen hat.' },
          schlecht:{ ruf:-6, moral:-8,
                text:'Der Klub lehnt ab und weiß jetzt, dass du käuflich bist. Die Klausel bleibt, das Vertrauen nicht.' } }
      ] }
  ,

    /* ==========================================================
       Der Zweikampf ums Tor
       ========================================================== */
    { id:'g_duell', kat:'kabine', szene:'kabine', tag:'Zwei für ein Tor',
      nurPos:['G'], gewicht:3, mehrfach:true,
      titel:'{torwartrivale} trainiert seit Wochen wie ein Besessener',
      text:'Ihr teilt euch eine Kabinenecke, einen Torwarttrainer und genau einen Platz, '
         + 'den nur einer haben kann. Er kommt morgens vor dir und geht abends nach dir. '
         + 'Beim Frühstück sitzt ihr trotzdem an einem Tisch.',
      bedingung: st => st.age >= 20,
      optionen:[
        { t:'Mitziehen und noch früher da sein', chance:62, hinweis:'Wer zuerst aufgibt, sitzt',
          gut:{ attr:{ reflexe:4, konstanz:3 }, form:0.06,
                text:'Ihr treibt euch gegenseitig. Am Saisonende habt ihr beide die besten Zahlen eurer Laufbahn.' },
          schlecht:{ risiko:7, moral:-5,
                text:'Du überziehst und stehst mit müden Beinen im Tor, während er frisch wirkt.' } },
        { t:'Ihm zeigen, was du gelernt hast', chance:70, hinweis:'Großzügig – und riskant',
          folgt:'weggefaehrte',
          gut:{ moral:10, ruf:5,
                text:'Er wird besser, ihr werdet Freunde, und der Trainerstab merkt, wer hier führt.' },
          schlecht:{ moral:-6, text:'Er nimmt alles mit und dir am Ende den Platz.' } },
        { t:'Auf dein Spiel vertrauen', chance:74, hinweis:'Kein Wettrüsten mitmachen',
          gut:{ attr:{ nerven:4 }, form:0.04,
                text:'Du bleibst bei deinem Rhythmus. Als es eng wird, steht der Ruhigere im Tor.' },
          schlecht:{ moral:-5, text:'Während du bei dir bleibst, zieht er an dir vorbei.' } }
      ] },

    { id:'g_zurueck', kat:'trainer', szene:'buero', tag:'Zurück ins Tor',
      nurPos:['G'], gewicht:4, mehrfach:true,
      titel:'Nach Wochen auf der Bank sollst du wieder spielen',
      text:'{torwartrivale} hat drei schwache Spiele hintereinander gemacht, und {trainer} '
         + 'sagt dir am Dienstag, dass du am Freitag im Tor stehst. Er sagt nicht, '
         + 'ob es bei diesem einen Spiel bleibt.',
      /* Reine Ersatzsaisons sind mit 4 Prozent zu selten fuer eine
         Bedingung - ein geteiltes Tor bedeutet ebenfalls Wochen auf der Bank. */
      bedingung: (st, se) => se && st.age >= 21
                          && (se.rolle === 'Ersatztorhüter' || se.rolle === 'Geteiltes Tor'),
      optionen:[
        { t:'Das Tor mit einem Shutout zurückholen', chance:44, hinweis:'Ein Spiel, eine Aussage',
          gut:{ ruf:11, moral:12, attr:{ konstanz:4 },
                text:'Vierunddreißig Schüsse, kein Gegentor. Die Frage nach der Nummer eins stellt niemand mehr.' },
          schlecht:{ moral:-8, text:'Zwei frühe Gegentore, und am Sonntag steht wieder er im Tor.' } },
        { t:'Einfach solide halten', chance:76, hinweis:'Keine Fehler, kein Aufsehen',
          gut:{ attr:{ stellung:3, konstanz:3 }, moral:6,
                text:'Unspektakulär und fehlerfrei. Aus einem Spiel werden vier, aus vier eine Rückrunde.' },
          schlecht:{ text:'Ordentlich, aber nicht genug, um jemanden umzustimmen.' } }
      ] }
  ];

  /* ==========================================================
     Wagnisse – Optionen mit kleiner Erfolgschance und grosser
     Wirkung. Sie werden an bestehende Ereignisse angehaengt.
     ========================================================== */
  const WAGNISSE = {
    kabine1: { t:'Den Platz des Kapitäns beanspruchen', chance:20,
      hinweis:'Dreist bis zur Grenze – aber wer es überlebt, ist gemacht',
      gut:{ ruf:14, moral:12, attr:{ nerven:6 },
            text:'Er lacht laut, steht auf und setzt sich neben dich. Ab heute bist du wer.' },
      schlecht:{ moral:-14, ruf:-8, form:-0.05,
            text:'Die halbe Kabine redet zwei Monate nicht mit dir.' } },

    kabine2: { t:'Dem Trainer den Stuhl zurückreichen', chance:22,
      hinweis:'Provokation mit Ansage',
      gut:{ ruf:12, moral:14, attr:{ nerven:7 },
            text:'Zwei Sekunden Totenstille, dann bricht die Kabine in Gelächter aus. Der Bann ist gebrochen.' },
      schlecht:{ ruf:-12, moral:-10, form:-0.12,
            text:'Du wirst suspendiert. Der Verein prüft die Vertragsauflösung.' } },

    presse1: { t:'Einen Wechsel offen ankündigen', chance:18,
      hinweis:'Alles auf eine Karte',
      gut:{ ruf:16, text:'Drei Spitzenklubs melden sich noch in derselben Woche. Dein Marktwert explodiert.' },
      schlecht:{ moral:-15, ruf:-10, text:'Der Klub setzt dich auf die Tribüne. Die Fans pfeifen dich aus.' } },

    trainer1: { t:'Ihm ein eigenes System vorschlagen', chance:25,
      hinweis:'Spieler denken nicht, Spieler spielen – normalerweise',
      gut:{ attr:{ uebersicht:8, pass:6 }, ruf:10,
            text:'Er probiert es aus. Es funktioniert. Man nennt es später nach dir.' },
      schlecht:{ ruf:-9, form:-0.08, text:'Er hört dir zwei Minuten zu und stellt dich danach nie wieder auf Sonderrollen.' } },

    spiel1: { t:'Zwischen zwei Verteidigern durchziehen', chance:16,
      hinweis:'Das versucht niemand in dieser Situation',
      gut:{ ruf:18, moral:10, attr:{ puck:6, antritt:5 }, trait:{ playoff:8 },
            text:'Das Tor läuft zwanzig Jahre lang in jeder Jahresrückblick-Sendung.' },
      schlecht:{ moral:-8, ruf:-6, risiko:6,
            text:'Puckverlust, Konter, Empty-Net. Die Bilder wirst du auch nicht los.' } },

    spiel2: { t:'Den Gegner sofort stellen und nicht loslassen', chance:24,
      hinweis:'Fünf Minuten sicher, alles andere offen',
      gut:{ moral:16, ruf:10, attr:{ zweikampf:6 },
            text:'Die ganze Bank steht. Ab heute geht dieses Team für dich durch die Bande.' },
      schlecht:{ risiko:14, ruf:-9,
            text:'Sechs Spiele Sperre, eine Anzeige und ein Klub, der sich distanziert.' } },

    fuehrung1: { t:'Eine Rücktrittsdrohung in den Raum stellen', chance:15,
      hinweis:'Entweder es zündet oder es zerreißt alles',
      gut:{ moral:18, ruf:12, trait:{ playoff:10 },
            text:'Ihr gewinnt das siebte Spiel. Diese Ansprache steht später in Büchern.' },
      schlecht:{ moral:-16, ruf:-10, text:'Es wirkt wie Erpressung. Ihr verliert deutlich.' } },

    rivale1: { t:'Dem Trainer sagen, du oder er', chance:20,
      hinweis:'Ein Ultimatum mit dreißig',
      gut:{ ruf:11, form:0.10, text:'Der Junge wird abgegeben. Du spielst die Saison deines Lebens.' },
      schlecht:{ ruf:-12, moral:-10, text:'Du wirst abgegeben. Er wird Kapitän.' } },

    berater1: { t:'Öffentlich einen Wechselwunsch hinterlegen', chance:22,
      hinweis:'Maximaler Druck',
      gut:{ ruf:13, text:'Der Klub knickt ein und zahlt weit über Marktwert.' },
      schlecht:{ moral:-14, ruf:-11, form:-0.06, text:'Du trainierst drei Monate mit der zweiten Mannschaft.' } },

    comeback1: { t:'Ohne Freigabe auflaufen', chance:18,
      hinweis:'Gegen jeden ärztlichen Rat',
      gut:{ moral:15, ruf:12, trait:{ playoff:8 },
            text:'Du erzielst das Siegtor und kannst danach zwei Tage nicht laufen. Es war es wert.' },
      schlecht:{ risiko:22, form:-0.14, text:'Kreuzband. Die Saison ist vorbei, und die nächste auch fast.' } },

    krise1: { t:'Die ganze Mannschaft öffentlich in die Pflicht nehmen', chance:24,
      hinweis:'Vor laufenden Kameras statt hinter Türen',
      gut:{ moral:14, ruf:12, text:'Am nächsten Abend spielt ihr wie ausgewechselt. Die Serie ist gebrochen.' },
      schlecht:{ moral:-15, ruf:-8, text:'Die Kabine fühlt sich verraten. Es wird noch schlimmer.' } },

    transfer1: { t:'Zusagen und den laufenden Vertrag brechen', chance:14,
      hinweis:'Rechtlich heikel, sportlich verlockend',
      gut:{ ruf:15, form:0.09, text:'Der Wechsel klappt. Du spielst plötzlich zwei Ligen höher.' },
      schlecht:{ ruf:-15, moral:-12, text:'Der Streit landet vor dem Schiedsgericht. Du spielst ein halbes Jahr gar nicht.' } },

    nat1: { t:'Absagen und öffentlich Kritik am Verband üben', chance:17,
      hinweis:'Ein Konflikt mit langem Nachhall',
      gut:{ ruf:12, form:0.08, text:'Die Debatte ändert tatsächlich etwas. Andere Spieler danken es dir.' },
      schlecht:{ ruf:-14, text:'Der Verband nominiert dich nie wieder. Nie.' } },

    alter1: { t:'Eine Vertragsverlängerung über drei Jahre fordern', chance:21,
      hinweis:'Mit vierunddreißig eine steile Forderung',
      gut:{ trait:{ langlebig:12 }, ruf:8, text:'Er unterschreibt. Du spielst noch drei starke Jahre.' },
      schlecht:{ ruf:-8, text:'Das Gespräch endet freundlich – und mit einem Auslaufvertrag.' } }
  };

  /* Wagnisse anhaengen */
  LISTE.forEach(e => {
    const w = WAGNISSE[e.id];
    if (w) e.optionen.push(Object.assign({ wagnis:true }, w));
  });

  /* ==================================================================
     Leben neben dem Eis

     Der Lebensstrang laeuft sonst still im Hintergrund mit - Heimweh
     waechst, Wurzeln schlagen an, eine Familie entsteht. Diese
     Ereignisse sind die Stellen, an denen man eingreifen kann. Ihre
     Bedingungen greifen bewusst eng: sie sollen sich anfuehlen, als
     kaemen sie aus der eigenen Lage, nicht aus einem Topf.
     ================================================================== */

  LISTE.push(
    { id:'lb_zurueck', kat:'privat', szene:'stadt', tag:'Zuhause',
      gewicht: 4.2,
      titel:'Zu Hause fragen sie, wann du zur\u00fcckkommst',
      text:'Am Telefon wird es still, wenn du sagst, dass es noch ein Jahr wird. '
         + 'Deine Mutter z\u00e4hlt die Weihnachten, die du nicht da warst, nicht laut mit, '
         + 'aber du wei\u00dft, dass sie z\u00e4hlt.',
      bedingung: st => st.leben && st.leben.heimweh >= 45
                    && st.club && st.club.lg !== st.heimLiga,
      optionen:[
        { t:'Dem Berater sagen, dass du heim willst', chance:62,
          hinweis:'Das n\u00e4chste Angebot von daheim wiegt schwerer',
          gut:{ leben:{ heimweh:-30 }, moral:8,
                text:'Er versteht es schneller, als du gedacht h\u00e4ttest. Es f\u00fchlt sich an, als w\u00e4re schon etwas entschieden.' },
          schlecht:{ leben:{ heimweh:-10 }, moral:-3,
                text:'Er h\u00f6rt zu und redet dann \u00fcber Marktwert. Du legst auf und bist genauso weit wie vorher.' } },
        { t:'Die Familie herholen', chance:55,
          hinweis:'Das Zuhause zieht um, statt zu warten',
          gut:{ leben:{ heimweh:-24, wurzeln:14, partnerMit:true }, moral:6,
                text:'Ein halbes Jahr sp\u00e4ter steht in der fremden Stadt eine Wohnung, in der es riecht wie fr\u00fcher.' },
          schlecht:{ leben:{ heimweh:6 }, moral:-5,
                text:'Sie kommen f\u00fcr zwei Wochen und fahren wieder. Danach ist es leerer als vorher.' } },
        { t:'Durchhalten, das ist der Beruf', chance:70, wagnis:true,
          hinweis:'H\u00e4rte gegen sich selbst \u2013 sie kostet',
          gut:{ leben:{ heimweh:-8 }, attr:{ nerven:3 },
                text:'Du legst auf und gehst aufs Eis. Es ist der Beruf, und du bist gut darin.' },
          schlecht:{ leben:{ heimweh:12 }, moral:-9,
                text:'Es wird nicht weniger, es wird nur leiser. Das ist nicht dasselbe.' } }
      ] },

    { id:'lb_getrennt', kat:'privat', szene:'stadt', tag:'Zwei Wohnungen',
      gewicht: 4.2,
      titel:'Zwei Wohnungen, zwei L\u00e4nder, ein Leben',
      text:'Die Kinder gehen dort zur Schule, du spielst hier. '
         + 'Ihr rechnet in Flugstunden und Schulferien, und jedes Gespr\u00e4ch endet damit, '
         + 'dass ihr beide sagt, es geht schon.',
      bedingung: st => st.leben && !st.leben.partnerMit && st.leben.familie !== 'allein',
      optionen:[
        { t:'Sie kommen nach', chance:48,
          hinweis:'Ein Schnitt \u2013 aber alle am selben Ort',
          gut:{ leben:{ heimweh:-26, wurzeln:16, partnerMit:true }, moral:11,
                text:'Der erste Schultag in der fremden Sprache ist schrecklich. Der dreissigste nicht mehr.' },
          schlecht:{ leben:{ heimweh:10 }, moral:-8,
                text:'Nach vier Monaten fahren sie zur\u00fcck. Man kann so etwas nicht erzwingen.' } },
        { t:'Du gehst zur\u00fcck, sobald es geht', chance:66,
          hinweis:'Die Laufbahn ordnet sich unter',
          gut:{ leben:{ heimweh:-18 }, moral:7, ruf:-3,
                text:'Du sagst dem Berater, welche Ligen nicht mehr in Frage kommen. Die Liste ist lang.' },
          schlecht:{ leben:{ heimweh:4 }, moral:-4,
                text:'Es bleibt ein Vorsatz. Vors\u00e4tze halten schlecht gegen Vertr\u00e4ge.' } },
        { t:'So weitermachen', chance:52, wagnis:true,
          hinweis:'Funktioniert \u2013 bis es das nicht mehr tut',
          gut:{ leben:{ heimweh:4 }, moral:2,
                text:'Ihr habt euch eingerichtet. Es ist nicht sch\u00f6n, aber es tr\u00e4gt.' },
          schlecht:{ leben:{ heimweh:18 }, moral:-12,
                text:'Irgendwann merkst du, dass du bei den Anrufen nicht mehr fragst, wie der Tag war.' } }
      ] },

    { id:'lb_haus', kat:'privat', szene:'stadt', tag:'Ein Haus',
      gewicht: 3.4,
      titel:'Ein Grundst\u00fcck, zehn Minuten von der Halle',
      text:'Es ist mehr Geld, als deine Eltern in ihrem Leben zusammen verdient haben, '
         + 'und der Makler redet, als w\u00e4re das eine Kleinigkeit. '
         + 'Auf dem Weg zur\u00fcck f\u00e4hrst du zweimal daran vorbei.',
      bedingung: st => st.leben && st.leben.wurzeln >= 55 && st.klubJahre >= 3
                    && st.leben.vermoegen >= 2.5,
      optionen:[
        { t:'Kaufen und bauen', chance:78,
          hinweis:'Hier bleibst du \u2013 daf\u00fcr ist ein Teil des Geldes weg',
          gut:{ leben:{ wurzeln:22, heimweh:-14, vermoegen:-1.8 }, moral:10,
                trait:{ langlebig:3 },
                text:'Im zweiten Sommer steht es. Du sitzt abends drau\u00dfen und h\u00f6rst die Stra\u00dfenbahn zur Halle fahren.' },
          schlecht:{ leben:{ vermoegen:-1.4 }, moral:-4,
                text:'Der Bau zieht sich \u00fcber drei Jahre und du wohnst die meiste Zeit davon woanders.' } },
        { t:'Das Geld anlegen', chance:58,
          hinweis:'Beweglich bleiben und etwas daraus machen',
          gut:{ leben:{ vermoegen:3 },
                text:'Dein Berater hatte recht. Das passiert selten genug, dass du es dir merkst.' },
          schlecht:{ leben:{ vermoegen:-2 }, moral:-5,
                text:'Zwei Jahre sp\u00e4ter erkl\u00e4rt dir jemand am Telefon, warum das niemand vorhersehen konnte.' } },
        { t:'Nichts davon', chance:88,
          hinweis:'Nichts festlegen, was dich halten k\u00f6nnte',
          gut:{ text:'Du sagst ab. Zwei Jahre sp\u00e4ter wechselst du die Liga und denkst kurz daran zur\u00fcck.' },
          schlecht:{ moral:-2, text:'Es bleibt das Gef\u00fchl, an nichts festzuhalten.' } }
      ] },

    { id:'lb_erste_saison_vater', kat:'privat', szene:'stadt', tag:'Vater',
      gewicht: 4.2,
      titel:'Der erste Ausw\u00e4rtstrip, seit es das Kind gibt',
      text:'Elf Tage, sechs Spiele, zwei Zeitzonen. '
         + 'Du siehst das erste Umdrehen auf einem Video, das um vier Uhr morgens ankommt, '
         + 'und schaust es dir dreimal an, bevor du zum Fr\u00fchst\u00fcck gehst.',
      bedingung: st => st.leben && st.leben.familie === 'kinder' && st.leben.kinder >= 1,
      optionen:[
        { t:'Weniger reisen, wo es geht', chance:52,
          hinweis:'Der Trainer merkt so etwas',
          gut:{ leben:{ wurzeln:12 }, moral:9,
                text:'Er hat selbst Kinder. Zwei Reisen im Jahr nimmt er dich aus dem Kader, und niemand redet dar\u00fcber.' },
          schlecht:{ moral:-6, rolle:-1,
                text:'Er sagt nichts, aber im n\u00e4chsten Spiel stehst du in der dritten Reihe.' } },
        { t:'Nichts \u00e4ndern', chance:74,
          hinweis:'Der Beruf bleibt der Beruf',
          gut:{ attr:{ nerven:2 }, rolle:1,
                text:'Du machst es wie immer. Es geht, weil zu Hause jemand ist, der das tr\u00e4gt.' },
          schlecht:{ leben:{ heimweh:10 }, moral:-7,
                text:'Du bist da und doch nicht. Am Ende der Saison f\u00e4llt dir auf, wie viel du verpasst hast.' } },
        { t:'Die Familie mitnehmen, wo es geht', chance:60,
          hinweis:'Teuer, aber ihr seid zusammen',
          gut:{ leben:{ heimweh:-16, vermoegen:-1, partnerMit:true }, moral:8,
                text:'Ein Kinderwagen im Hotelfoyer sieht falsch aus und f\u00fchlt sich richtig an.' },
          schlecht:{ leben:{ vermoegen:-1 }, moral:-4,
                text:'Nach dem zweiten Versuch lasst ihr es. Es war f\u00fcr alle anstrengender als allein.' } }
      ] },

    { id:'lb_geld', kat:'privat', szene:'buero', tag:'Das Geld',
      gewicht: 2.6, mehrfach: true,
      titel:'Jemand will dir erkl\u00e4ren, was mit dem Geld passieren soll',
      text:'Er hat eine Mappe dabei und nennt dich beim Vornamen. '
         + 'Zwei aus der Kabine haben schon unterschrieben, sagt er. '
         + 'Die Zahl unten rechts ist gr\u00f6\u00dfer als alles, was du je auf einem Kontoauszug gesehen hast.',
      bedingung: st => st.leben && st.leben.vermoegen >= 4,
      optionen:[
        { t:'Einsteigen', chance:44, wagnis:true,
          hinweis:'Es kann sich verdoppeln \u2013 oder weg sein',
          gut:{ leben:{ vermoegen:5.5 }, moral:5,
                text:'Es geht auf. Du erz\u00e4hlst es niemandem, weil du wei\u00dft, wie knapp das war.' },
          schlecht:{ leben:{ vermoegen:-4.5 }, moral:-9,
                text:'Ein Jahr sp\u00e4ter ist er nicht mehr erreichbar. Die zwei aus der Kabine auch nicht mehr im Verein.' } },
        { t:'Einen kleinen Teil', chance:66,
          hinweis:'Mitmachen, ohne alles zu riskieren',
          gut:{ leben:{ vermoegen:1.8 },
                text:'Ein bisschen mehr, als auf dem Sparbuch gewesen w\u00e4re. Mehr wolltest du nicht.' },
          schlecht:{ leben:{ vermoegen:-1 },
                text:'Weg, aber es tut nicht weh. Genau deshalb war es nur ein Teil.' } },
        { t:'Absagen', chance:90,
          hinweis:'Nichts riskieren',
          gut:{ leben:{ vermoegen:0.7 },
                text:'Du legst es an, wie es dir dein Vater erkl\u00e4rt h\u00e4tte. Langweilig, und es bleibt.' },
          schlecht:{ text:'Du sagst ab und liest zwei Jahre sp\u00e4ter, was daraus geworden ist.' } }
      ] }
  );

  /* ==================================================================
     Was aus dem Draft, dem Verein und dem Koerper folgt

     Die neuen Systeme - Draftrechte, Vereinsrang, Altlasten,
     Bonusklauseln - erzeugen Lagen, zu denen es bisher nichts zu
     entscheiden gab. Diese Ereignisse haengen genau daran: ihre
     Bedingungen fragen den Zustand ab, den diese Systeme fuehren, und
     die meisten oeffnen oder beantworten einen Strang.
     ================================================================== */

  LISTE.push(
    { id:'dr_wartet', kat:'karriere', szene:'buero', tag:'Deine Rechte',
      gewicht: 3.6,
      titel:'{klub} ist nicht der Verein, der deine Rechte hält',
      text:'Sie haben dich vor Jahren gezogen und seitdem jeden deiner Berichte gelesen. '
         + 'Jetzt liegt eine Einladung zum Trainingslager auf dem Tisch – ohne Zusage, '
         + 'ohne Vertrag. Zwei Wochen, in denen sie sehen wollen, ob sich das Warten gelohnt hat.',
      bedingung: st => !!(st.draftRechte && st.club
                    && st.draftRechte.klub !== st.club.n
                    && st.year <= st.draftRechte.bis && st.age <= 24),
      optionen:[
        { t:'Hinfahren und alles geben', chance:52, wagnis:true,
          hinweis:'Sie sehen dich – im Guten wie im Schlechten',
          folgt:'draftpick',
          gut:{ ruf:8, moral:9, attr:{ nerven:3 },
                text:'Am zehnten Tag sagt der General Manager einen Satz, den du dir merkst: '
                   + '"Wir haben nicht umsonst gewartet."' },
          schlecht:{ moral:-7, ruf:-4,
                text:'Das Tempo ist ein anderes. Nach zwei Wochen bedankt man sich höflich, '
                   + 'und niemand spricht von einem nächsten Mal.' } },
        { t:'Absagen, die Saison zählt mehr', chance:74,
          hinweis:'Der eigene Verein rechnet es dir an',
          gut:{ moral:5, rolle:1,
                text:'Dein Trainer weiß es zu schätzen, dass du den Sommer hier verbringst.' },
          schlecht:{ ruf:-5,
                text:'Drüben notiert man es. Solche Notizen verschwinden nicht.' } },
        { t:'Den Berater vorschicken', chance:58,
          hinweis:'Erst reden, dann fahren',
          gut:{ ruf:4, moral:3,
                text:'Er kommt mit einer Zusage zurück: kein Trainingslager, sondern ein Termin '
                   + 'im Herbst. Auf Augenhöhe.' },
          schlecht:{ moral:-5,
                text:'Sie wollten dich sehen, nicht deinen Berater. Die Einladung verfällt.' } }
      ] },

    { id:'dr_einlösung', kat:'karriere', szene:'buero', tag:'Endlich',
      benoetigt:'draftpick',
      titel:'Der Verein, der auf dich gewartet hat, macht ernst',
      text:'Seit dem Trainingslager sind Monate vergangen, in denen nichts passierte. '
         + 'Jetzt sitzt derselbe Mann wieder da, diesmal mit einem Blatt Papier, '
         + 'auf dem eine Zahl und eine Jahreszahl stehen.',
      bedingung: st => st.age >= 20,
      optionen:[
        { t:'Sofort unterschreiben', chance:78,
          hinweis:'Der Weg, für den du gedraftet wurdest',
          gut:{ ruf:7, moral:11, trait:{ playoff:3 },
                text:'Du unterschreibst, ohne die zweite Seite zu lesen. Manche Wege gehen '
                   + 'nur einmal auf.' },
          schlecht:{ moral:-4,
                text:'Es dauert länger als gedacht, bis alles steht – aber es steht.' } },
        { t:'Nachverhandeln', chance:46, wagnis:true,
          hinweis:'Mehr herausholen – oder das Fenster schließen',
          gut:{ ruf:5, moral:6,
                text:'Sie gehen mit. Wer so lange wartet, gibt nicht im letzten Moment auf.' },
          schlecht:{ moral:-10, ruf:-6,
                text:'Sie ziehen das Angebot zurück. Zwei Wochen später hörst du, dass sie '
                   + 'einen anderen genommen haben.' } }
      ] },

    { id:'kl_naheDran', kat:'karriere', szene:'kabine', tag:'Die Klausel',
      gewicht: 4.2,
      titel:'Drei Spiele vor Schluss fehlt dir noch etwas zur Klausel',
      text:'Die Zahl steht seit dem Sommer im Vertrag, und bis Weihnachten hast du nicht '
         + 'daran gedacht. Jetzt denkst du an nichts anderes. In der Kabine weiß es inzwischen '
         + 'jeder, und ein paar spielen dir absichtlich den Puck zu.',
      bedingung: st => !!(st.bonus && st.bonus.art !== 'titel'),
      optionen:[
        { t:'Alles auf die Zahl setzen', chance:44, wagnis:true,
          hinweis:'Es geht um deinen Vertrag – aber die Mannschaft merkt es',
          gut:{ moral:10, form:0.06,
                text:'Im vorletzten Spiel fällt sie. Die Bank steht auf, und du weißt nicht, '
                   + 'ob wegen des Tores oder wegen der Klausel.' },
          schlecht:{ moral:-9, rolle:-1,
                text:'Du spielst an dir selbst vorbei. Der Trainer sagt in der Drittelpause '
                   + 'nur: "Spiel Eishockey, nicht Mathematik."' } },
        { t:'Die Klausel Klausel sein lassen', chance:70,
          hinweis:'Wer das Spiel spielt, trifft meistens auch',
          gut:{ moral:6, rolle:1, attr:{ nerven:3 },
                text:'Du hörst auf zu rechnen. Zwei Spiele später steht die Zahl trotzdem – '
                   + 'so, wie es immer geht, wenn man aufhört, sie zu wollen.' },
          schlecht:{ moral:-4,
                text:'Es fehlt am Ende genau eines. Nicht mehr.' } }
      ] },

    { id:'lg_ansprache', kat:'kabine', szene:'kabine', tag:'Die Ansprache',
      gewicht: 4.2,
      titel:'Vor dem entscheidenden Spiel schauen alle zu dir',
      text:'Niemand hat dich gefragt. Der Trainer hat gesagt, was zu sagen war, und dann '
         + 'ist es still geworden – die Art von Stille, in der zwanzig Leute darauf warten, '
         + 'dass der spricht, der am längsten hier ist.',
      bedingung: st => !!(st.klubKonto && st.club
                    && st.klubKonto[st.club.n]
                    && ['gesicht','legende'].includes(st.klubKonto[st.club.n].rang)),
      optionen:[
        { t:'Aufstehen und reden', chance:62,
          hinweis:'Was du sagst, tragen sie aufs Eis',
          gut:{ moral:11, ruf:5, rolle:1, trait:{ playoff:4 },
                text:'Du sagst vier Sätze, und keiner davon handelt vom Gegner. '
                   + 'Danach geht diese Mannschaft anders durch den Gang.' },
          schlecht:{ moral:-6,
                text:'Es kommt anders heraus als gedacht. Die Stille danach ist dieselbe wie vorher.' } },
        { t:'Sitzen bleiben und dich fertigmachen', chance:76,
          hinweis:'Vorangehen kann man auch ohne Worte',
          gut:{ moral:5, form:0.05,
                text:'Du sagst nichts und bist als Erster auf dem Eis. Das reicht auch.' },
          schlecht:{ moral:-3, rolle:-1,
                text:'Später fragt dich einer, warum du nichts gesagt hast. Du hast keine Antwort.' } }
      ] },

    { id:'ko_altlast', kat:'koerper', szene:'arzt', tag:'Die alte Stelle',
      gewicht: 4.2,
      titel:'Dieselbe Stelle meldet sich, wieder mitten in der Saison',
      text:'Es ist kein neuer Schmerz. Es ist der, den du kennst, an dem Ort, den du kennst, '
         + 'und du weißt beim ersten Schritt, was los ist. Der Arzt sagt, man könne spritzen '
         + 'und weiterspielen – oder es diesmal richtig machen.',
      bedingung: st => Object.values(st.altlasten || {}).some(n => n >= 2),
      optionen:[
        { t:'Spritzen und weiterspielen', chance:64, wagnis:true,
          hinweis:'Die Mannschaft braucht dich jetzt',
          gut:{ ruf:5, moral:4, verschleiss:1,
                text:'Es trägt bis zum Saisonende. Was danach kommt, ist ein Problem für danach.' },
          schlecht:{ moral:-11, verschleiss:2, risiko:8,
                text:'Im dritten Spiel danach reißt es richtig. Diesmal geht es nicht mit einer Spritze.' } },
        { t:'Es diesmal richtig machen', chance:72,
          hinweis:'Wochen fehlen – dafür kommt es vielleicht nicht wieder',
          gut:{ leben:{}, moral:6, trait:{ robust:4 },
                text:'Acht Wochen, drei davon ohne Eis. Danach ist es das erste Mal seit Jahren still.' },
          schlecht:{ moral:-6,
                text:'Die Pause bringt nichts, was die Spritze nicht auch gebracht hätte.' } }
      ] },

    { id:'jg_spitze', kat:'karriere', szene:'stadt', tag:'Der Jahrgang',
      gewicht: 3.4,
      titel:'{rivale} gibt ein Interview, in dem dein Name fällt',
      text:'Er wird nach dem Jahrgang gefragt und sagt, es sei nie ein Rennen gewesen. '
         + 'Dann fällt dein Name, und zwar in einem Nebensatz. '
         + 'Genau so, wie man jemanden erwähnt, den man nicht für gefährlich hält.',
      bedingung: st => !!st.rivale && st.age >= 22,
      optionen:[
        { t:'Öffentlich zurückschießen', chance:48, wagnis:true,
          hinweis:'Die Presse liebt es – die Kabine nicht unbedingt',
          folgt:'rivalitaet',
          gut:{ ruf:9, moral:7,
                text:'Dein Satz steht am nächsten Morgen größer als seiner. Ab jetzt schauen '
                   + 'alle auf die Spiele zwischen euch.' },
          schlecht:{ ruf:-6, moral:-6,
                text:'Es klingt gekränkt, nicht souverän. Er kommentiert es nicht einmal.' } },
        { t:'Auf dem Eis antworten', chance:60,
          hinweis:'Langsamer, aber es hält länger',
          folgt:'rivalitaet',
          gut:{ moral:8, form:0.07, attr:{ nerven:3 },
                text:'Du sagst kein Wort und legst die beste Saison deines Lebens hin. '
                   + 'Am Ende fragt ihn jemand noch einmal nach dem Jahrgang.' },
          schlecht:{ moral:-5,
                text:'Der Vorsatz war gut. Die Saison wurde es nicht.' } },
        { t:'Es einfach stehen lassen', chance:80,
          hinweis:'Nicht jede Provokation ist eine',
          gut:{ moral:3, attr:{ nerven:2 },
                text:'Du liest es einmal und legst das Telefon weg. Es beschäftigt dich '
                   + 'weniger, als du gedacht hättest.' },
          schlecht:{ moral:-3,
                text:'Es beschäftigt dich doch. Wochenlang.' } }
      ] }
  );

  return { LISTE, WAGNISSE };
})();

if (typeof window !== 'undefined') window.EREIGNISSE = EREIGNISSE;
