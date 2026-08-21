/* ==========================================================
   Puckero – Karriereereignisse

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
        { t:'Zusagen und lernen', chance:60, hinweis:'Breite statt Spezialisierung',
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
      text:'Sechs gegen fünf, achtundfünfzig Sekunden. Der Puck kommt an die blaue Linie, '
         + 'und du hast ihn. Vor dir ein Wald aus Schienbeinschonern, links ein Mitspieler '
         + 'in besserer Position, rechts eine Lücke, die vielleicht keine ist.',
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
        { t:'Aufstehen und sprechen', chance:55, hinweis:'Große Bühne, großes Risiko',
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
        { t:'Im Training kompromisslos gegenhalten', chance:55, hinweis:'Platzhirsch sein',
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
    { id:'comeback1', kat:'spiel', szene:'kabine', tag:'Nach der Verletzung',
      titel:'Der Arzt gibt dir grünes Licht – dein Knie sieht das anders',
      text:'Die Untersuchung ist unauffällig, die Werte gut, alle nicken. Nur du weißt, wie es sich '
         + 'anfühlt, wenn du in der letzten Kurve vor der Bande abbremst. Die Playoffs beginnen '
         + 'in elf Tagen, und die Reihe braucht dich.',
      bedingung: (st, s) => s && s.events.some(e => e.t.indexOf('Verletzung') === 0),
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
        { t:'Ihn unter die Fittiche nehmen', chance:80, hinweis:'Zahlt sich nicht sofort aus',
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
        { t:'Dich komplett umstellen', chance:55, hinweis:'Neu lernen mit dreißig',
          gut:{ attr:{ skating:3, pass:3 }, ruf:4, text:'Du wirst im neuen System besser als im alten.' },
          schlecht:{ form:-0.09, text:'Du findest dich nie zurecht und spielst deine schwächste Saison.' } },
        { t:'Bei deinem Spiel bleiben', chance:50, hinweis:'Wer erfolgreich ist, hat recht',
          gut:{ form:0.08, ruf:5, text:'Deine Tore geben dir recht. Er passt das System an dich an.' },
          schlecht:{ ruf:-6, moral:-5, text:'Du wirst zum Sonderfall, den man lieber loswerden würde.' } }
      ] },

    /* ---------- Serie ---------- */
    { id:'krise1', kat:'kabine', szene:'eis', tag:'Sechs Niederlagen in Folge',
      titel:'Der Mannschaftsrat trifft sich ohne den Trainerstab',
      text:'Zwanzig Uhr, Hotelzimmer 412, niemand hat eingeladen und trotzdem sind alle da. '
         + 'Die Stimmung ist irgendwo zwischen Trotz und Ratlosigkeit. Irgendwann sagt jemand, '
         + 'man müsse jetzt eine Entscheidung treffen.',
      bedingung: (st, s) => s && !s.playoffs && st.age >= 25 && st.moral < 60,
      optionen:[
        { t:'Für den Trainer eintreten', chance:60, hinweis:'Loyalität nach oben',
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
        { t:'Eine Regel durchsetzen', chance:65, hinweis:'Jemand muss es entscheiden',
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
    { id:'alter1', kat:'trainer', szene:'buero', tag:'Das Gespräch',
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
  ];

  return { LISTE };
})();

if (typeof window !== 'undefined') window.EREIGNISSE = EREIGNISSE;
