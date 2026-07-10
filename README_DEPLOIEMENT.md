# SmartTools V5.12.6 — Accueil réorganisé

Modifications :
- “Documents obligatoires” renommé en “Accès SharePoint Concept Premium”.
- Lien SharePoint remplacé par :
  https://adresseimmo.sharepoint.com/sites/CONCEPTPREMIUM/Documents%20partages/Forms/AllItems.aspx?viewid=a34815c9%2D7abd%2D474d%2Dba5f%2Dec9689571837
- Accueil réorganisé :
  - Business : SmartEstimate, SmartNegotiate, SmartCalcul, SmartProspect, Calcul commission.
  - Documents et liens utiles : Check-list compromis, Accès SharePoint Concept Premium.
  - Suivi des absences : Congés & absences.
- SmartNews Immo placé dans le bandeau haut, à la place des 4 statistiques.
- Ancien “SmartNews” supprimé côté accueil / assistants ; seul SmartNews Immo reste visible.
- Configuration IA et Test IA déplacés dans un onglet “ADMIN IA”, hors page d’accueil.
- Boutons de retour accueil colorés en vert clair.

À remplacer :
- `index.html`
- `package.json`

Puis :
- Vercel > Redeploy
- CTRL + F5


V5.12.6 : libellés d’accueil ajustés : Business, Documents et liens utiles, Suivi des absences.


V5.12.6 : ajout de SmartWriter dans la rubrique Business de la page d’accueil.

V5.12.6 :
- interface Business premium ;
- cartes visuelles avec conseillers dédiés par module SMART ;
- portraits illustratifs intégrés directement dans le HTML, sans dépendance externe ;
- ajout de bandeaux conseiller dans les modules SmartEstimate, SmartNegotiate, SmartProspect, SmartCalcul, SmartWriter et Calcul commission.

V5.12.6 :
- conseillers affichés avec prénom uniquement ;
- remplacement des avatars illustrés par des portraits photo-réalistes générés et intégrés dans `assets/advisors/` ;
- les photos sont fournies dans le ZIP et ne dépendent pas d’un service externe.
