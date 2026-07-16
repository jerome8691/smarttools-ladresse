# SmartTools V6.0 — Mobile + PWA

Cette version repart de la base stable V5.13.6 et remplace le correctif tactile défaillant.

Principales modifications :
- navigation native avec événements `click` standards et délégation d’événements ;
- suppression du faux `touchend/new Function` qui provoquait “Ouverture impossible sur mobile” ;
- cartes Business accessibles au tactile et au clavier ;
- affichage smartphone en une colonne ;
- barre de retour à l’accueil sur mobile ;
- manifest PWA, service worker et icônes ;
- bouton “Installer l’application” lorsqu’il est proposé par le navigateur ;
- conservation des photos/prénoms validés.

À déposer dans GitHub :
- `index.html`
- `manifest.webmanifest`
- `service-worker.js`
- `assets/icons/`
- `assets/advisors/`
- conserver les dossiers `api/` et autres fichiers existants.

Puis redéployer Vercel et vider le cache du navigateur.
