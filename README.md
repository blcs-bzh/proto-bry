# Plug'Heur — prototype de test

Prototype de l'app Plug'Heur, utilisable comme une vraie web app sur mobile.

- Parcours standard : https://blcs-bzh.github.io/proto-bry/#standard
- Paiement 0 € : https://blcs-bzh.github.io/proto-bry/#paiement0
- Paiement bloqué : https://blcs-bzh.github.io/proto-bry/#paiementbloque
- Location payante : https://blcs-bzh.github.io/proto-bry/#payant

Plein écran : dans le navigateur du téléphone, « Ajouter à l'écran d'accueil », puis ouvrir l'icône Plug'Heur.
Animateur : ajouter `?fac` à l'adresse (ex. `/proto-bry/?fac#standard`) pour afficher le menu des écrans et la simulation d'erreurs.

Tableau de bord (protégé par mot de passe) : https://blcs-bzh.github.io/proto-bry/dashboard.html

Aucune donnée saisie n'est envoyée : n'entrez pas votre vraie carte bancaire.

## Version 13 (nouvelle interface)

- Prototype V13 : https://blcs-bzh.github.io/proto-bry/v13/
- Chaque écran tient sur une seule page de téléphone, sans défilement.
- Pendant la session, l'offre partenaire est un code exclusif à recevoir par email.
- Studio (couleurs, logo, fonctionnalités) : bouton en bas à gauche sur mobile, panneau de gauche sur ordinateur.
- Titres et boutons en Neue Haas Display (Roman et Medium, intégrés à la page) ; texte courant en Plus Jakarta Sans.

## Suivi des tests V13

- `v13/tracker.js` enregistre une ligne par session de test (anonyme : aucun nom, téléphone ni email) dans la Google Sheet « Plug'Heur V13 – Résultats des tests ».
- Activation : coller l'URL du déploiement Apps Script (`tracking/apps-script.gs`) dans `ENDPOINT` en haut de `v13/tracker.js`.
- Désactiver sur un appareil (animateur) : ajouter `?notrack` à l'adresse.
