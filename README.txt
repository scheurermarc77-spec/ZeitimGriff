DALM on Fire – App-Icon Dateien

Für deine bestehende ZeitimGriff-App:
1. Den Ordner „icons“ hochladen/ersetzen.
2. Falls deine App bereits ein manifest.webmanifest besitzt, kannst du auch dieses ersetzen.
3. Für iPhone muss index.html auf icons/apple-touch-icon.png verweisen:
   <link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
4. Danach die App ggf. vom iPhone-Homebildschirm löschen und neu über Safari → Teilen → Zum Home-Bildschirm hinzufügen.
