// src/comparateur/comparateur.js — comparateur « Bail commercial ou bureau
// flexible » repris tel quel de l'ancien site (workandshare.com/comparateur, v80).
// Chargé par components/comparateur.js, seulement sur la page qui contient
// [data-comparateur]. Seuls changements par rapport à l'original :
// - les liens des espaces pointent vers les pages /espaces/<ville>/ du site ;
// - enveloppe ci-dessous : le script est chargé après l'événement « load » de la
//   page, ses addEventListener('load') sont donc exécutés tout de suite.
(function () {
  var addEventListener = function (type, fn, opts) {
    if (type === "load" && document.readyState === "complete") {
      setTimeout(fn, 0);
      return;
    }
    window.addEventListener(type, fn, opts);
  };

/* ===== Code d'origine, non modifié (hors liens des espaces) ===== */

(function(){

/* Hypotheses du modele, en euros du m2 et par an sauf mention contraire.
   fran     franchise et mesures d accompagnement, 30,6 % - Colliers, avril 2026
   charges  charges locatives refacturees
   fonc     taxe fonciere refacturee
   serv     exploitation, menage, internet, maintenance, assurance
   works    amenagement des plateaux
   garantie depot et garanties, en mois de loyer. DEUX et non trois : la loi du
            26 mai 2026 plafonne le depot a un trimestre de loyer, garanties de toute
            nature comprises. Retenir trois mois, c etait retenir le maximum legal
            tout en l appelant « hypothese basse » — la carte se contredisait a deux
            lignes d intervalle, et l erreur jouait en notre faveur.
   taux     cout du credit qui finance l amenagement, 4,37 % - Banque de France,
            nouveaux credits aux SNF de moins d un million a taux fixe 1 a 5 ans,
            mai 2026. C est la donnee qui vieillit le plus vite du modele. */
var H={fran:.306, charges:100, fonc:18, serv:85, works:550, garantie:3, taux:4.37};

/* Taxe annuelle sur les bureaux, bareme 2026, par circonscription.
   Article 231 ter du CGI. */
var TSB={1:26.11, 2:21.99, 3:12.03, 4:5.82};

/* Distance au dela de laquelle l'espace le plus proche n'est plus presente
   comme une proposition mais comme un simple constat. */
var LOIN=20;
var TSB2_RED=19.80;   /* 2e circonscription, tarif minore de 10 %, bareme 2026 */

var TSB1_CP=["75001","75002","75007","75008","75009","75010","75015","75016","75017"],
    TSB1_CO=["Boulogne-Billancourt","Courbevoie","Issy-les-Moulineaux","Levallois-Perret",
             "Neuilly-sur-Seine","Puteaux"];
/* HORS_UU a ete retire : ses trois entrees, Melun, Meaux et Mantes-la-Jolie, ne
   figurent pas dans C. La liste n etait donc jamais atteinte, et ces trois villes
   restent introuvables a la recherche, faute de loyer releve par secteur. */

/* Communes eligibles a la fois a la DSU-CS et au FSRIF, annexe BOI-ANNX-000463
   dans sa version du 4 fevrier 2026, restreinte aux communes de ce referentiel.
   Article 231 ter VI : dans les Hauts-de-Seine le tarif de la 2e circonscription
   est minore de 10 %, ailleurs dans l unite urbaine la commune bascule en 4e.
   Applique bien que cela reduise le cout du bail, donc notre ecart.

   ATTENTION, LEÇON PAYEE. Cette liste avait ete etablie pour les 127 communes
   d origine et n a pas suivi l elargissement du referentiel a 306. Quatre-vingt-
   deux communes eligibles etaient donc taxees en 3e circonscription au lieu de la
   4e : 12,03 EUR le m2 au lieu de 5,82, soit 5,69 EUR par poste et par mois
   factures en trop au bail. L erreur gonflait notre propre ecart, exactement ce
   que le reste du modele s interdit. Toute commune ajoutee a C doit desormais
   etre confrontee a cette annexe le jour meme. */
var DSU=[
 /* 92 */ "Bagneux","Châtenay-Malabry","Colombes","Fontenay-aux-Roses",
 "Gennevilliers","Malakoff","Villeneuve-la-Garenne",
 /* 93 */ "Aubervilliers","Aulnay-sous-Bois","Bagnolet","Le Blanc-Mesnil","Bobigny",
 "Bondy","Le Bourget","Clichy-sous-Bois","La Courneuve","Drancy","Dugny",
 "Épinay-sur-Seine","Gagny","L'Île-Saint-Denis","Les Lilas","Livry-Gargan",
 "Montfermeil","Montreuil","Neuilly-Plaisance","Neuilly-sur-Marne","Noisy-le-Sec",
 "Pantin","Les Pavillons-sous-Bois","Le Pré-Saint-Gervais","Romainville",
 "Rosny-sous-Bois","Saint-Denis","Sevran","Stains","Villemomble","Villepinte",
 "Villetaneuse",
 /* 94 */ "Alfortville","Boissy-Saint-Léger","Bonneuil-sur-Marne","Cachan",
 "Champigny-sur-Marne","Choisy-le-Roi","Créteil","Fresnes","Gentilly",
 "Ivry-sur-Seine","Le Kremlin-Bicêtre","Limeil-Brévannes","Orly","Le Plessis-Trévise",
 "La Queue-en-Brie","Valenton","Villejuif","Villeneuve-le-Roi",
 "Villeneuve-Saint-Georges","Villiers-sur-Marne","Vitry-sur-Seine",
 /* 95 */ "Argenteuil","Arnouville","Beaumont-sur-Oise","Bezons","Cergy",
 "Deuil-la-Barre","Domont","Eaubonne","Éragny-sur-Oise","Ermont","Fosses",
 "Franconville","Garges-lès-Gonesse","Gonesse","Goussainville","Jouy-le-Moutier",
 "Louvres","Méry-sur-Oise","Montigny-lès-Cormeilles","Montmagny","Pierrelaye",
 "Pontoise","Saint-Brice-sous-Forêt","Saint-Gratien","Saint-Ouen-l'Aumône",
 "Sannois","Sarcelles","Taverny","Villiers-le-Bel",
 /* 78 */ "Achères","Carrières-sous-Poissy","Chanteloup-les-Vignes","Guyancourt",
 "Les Mureaux","Saint-Cyr-l'École","Sartrouville","Trappes","Verneuil-sur-Seine",
 "La Verrière",
 /* 91 */ "Arpajon","Athis-Mons","Brétigny-sur-Orge","Brunoy","Corbeil-Essonnes",
 "Draveil","Épinay-sous-Sénart","Évry-Courcouronnes","Fleury-Mérogis",
 "Gif-sur-Yvette","Grigny","Juvisy-sur-Orge","Longjumeau","Montgeron",
 "Morsang-sur-Orge","Palaiseau","Ris-Orangis","Sainte-Geneviève-des-Bois",
 "Saint-Germain-lès-Arpajon","Saint-Michel-sur-Orge","Savigny-sur-Orge","Les Ulis",
 "Vigneux-sur-Seine","Viry-Châtillon",
 /* 77 */ "Champs-sur-Marne","Chelles","Combs-la-Ville","Lieusaint","Lognes",
 "Noisiel","Pontault-Combault","Roissy-en-Brie","Thorigny-sur-Marne","Torcy",
 "Vaires-sur-Marne","Villeparisis"];

function circons(nom,cp){
  if(TSB1_CP.indexOf(cp)>-1||TSB1_CO.indexOf(nom)>-1) return 1;
  if(cp.indexOf("75")===0||cp.indexOf("92")===0) return 2;
  if(DSU.indexOf(nom)>-1) return 4;
  /* Hors unite urbaine de Paris, 4e circonscription. La liste nominative de l arrete
     du 31 decembre 2012 n est pas reproduite ici : on approche par la distance a
     Notre-Dame. Seuil a 35 km et non 25, sinon Poissy, Bussy-Saint-Georges et Serris
     basculent a tort.
     Verifie sur les 306 communes apres la refonte de DSU ci-dessus : il ne reste que
     vingt-trois communes au-dela de 25 km que cette ligne tranche encore, et toutes
     appartiennent a une agglomeration continue de l unite urbaine — Marne-la-Vallee,
     Saint-Quentin-en-Yvelines, Cergy-Pontoise, Evry. Le seuil reste donc juste. Les
     quatre communes sorties de l unite urbaine par l arrete du 28 novembre 2024
     (Bazoches-sur-Guyonne, Ennery, Le Tremblay-sur-Mauldre, Saint-Remy-l Honore) ne
     figurent pas dans C, il n y a rien a corriger de ce cote. */
  var r=IX[nom];
  if(r&&dist(48.8530,2.3499,r[4],r[5])>35) return 4;
  return 3;
}
function tarifTSB(nom,cp){
  var c=circons(nom,cp);
  if(c===2&&DSU.indexOf(nom)>-1) return TSB2_RED;
  return TSB[c];
}

var SITES=[
/* Nom, adresse, latitude, longitude, prix du poste, page de l espace sur le site.
   Les coordonnees ne se modifient pas de memoire : un decalage de 1,2 km sur Clichy
   avait change l espace retenu et l economie annoncee de 432 000 EUR.
   Issy-les-Moulineaux est volontairement absent, l espace y est 100 % evenementiel. */
 ["La Défense","100 Terrasse Boieldieu, 92800 Puteaux",48.8925,2.2415,580,"/espaces/la-defense/"],
 ["Levallois-Perret","112 rue Anatole France, 92300 Levallois-Perret",48.8985,2.2905,400,"/espaces/levallois-perret/"],
 ["Saint-Denis","5 rue Pleyel, 93200 Saint-Denis",48.9200,2.3410,390,"/espaces/saint-denis/"],
 ["Nanterre","3-5 boulevard des Bouvets, 92000 Nanterre",48.8975,2.2240,380,"/espaces/nanterre/"],
 ["Saint-Cloud","1 rue Royale, 92210 Saint-Cloud",48.8455,2.2205,380,"/espaces/saint-cloud/"],
 ["Saint-Ouen","3 place Martin Levasseur, 93400 Saint-Ouen",48.9115,2.3330,380,"/espaces/saint-ouen/"],
 ["Colombes","1 rue du Débarcadère, 92700 Colombes",48.9130,2.2650,380,"/espaces/colombes/"],
 ["Villejuif","116 rue Édouard Vaillant, 94800 Villejuif",48.7935,2.3655,360,"/espaces/villejuif/"],
 ["Rueil-Malmaison","55 avenue de Colmar, 92500 Rueil-Malmaison",48.8720,2.1860,350,"/espaces/rueil-malmaison/"],
 ["Val de Fontenay","198 rue Carnot, 94120 Fontenay-sous-Bois",48.8535,2.4790,350,"/espaces/val-de-fontenay/"],
 ["Clichy","6 rue des Bateliers, 92110 Clichy",48.9030,2.3070,300,"/espaces/clichy/"],
 ["Suresnes","42 rue Rouget de Lisle, 92150 Suresnes",48.8695,2.2245,300,"/espaces/suresnes/"],
 ["Cachan","119-121 avenue Aristide Briand, 94230 Cachan",48.7940,2.3320,290,"/espaces/cachan/"]
];

var C=[
/* Nom, code postal, loyer facial en EUR/m2/an, secteur, latitude, longitude.
   306 communes. Les 124 premieres ont un loyer releve par secteur ImmoStat, T2 2026.
   Les 182 suivantes completent l Ile-de-France : coordonnees issues des centroides
   officiels de geo.api.gouv.fr, loyer interpole par la mediane des trois communes
   referencees les plus proches.
   Toute commune ajoutee ici doit etre confrontee le jour meme a l annexe
   BOI-ANNX-000463 : sans quoi elle sera taxee en 3e circonscription par defaut et
   le cout du bail surestime. C est exactement ce qui s est produit. */
["Paris 1er","75001",780,"Paris Centre Ouest",48.8607,2.3358],
["Paris 2e","75002",780,"Paris Centre Ouest",48.8680,2.3417],
["Paris 3e","75003",590,"Paris",48.8637,2.3615],
["Paris 4e","75004",590,"Paris",48.8544,2.3574],
["Paris 5e","75005",560,"Paris",48.8448,2.3471],
["Paris 6e","75006",700,"Paris",48.8496,2.3327],
["Paris 7e","75007",680,"Paris",48.8565,2.3125],
["Paris 8e","75008",850,"Paris Centre Ouest",48.8726,2.3122],
["Paris 9e","75009",720,"Paris Centre Ouest",48.8768,2.3373],
["Paris 10e","75010",520,"Paris",48.8760,2.3599],
["Paris 11e","75011",530,"Paris",48.8590,2.3792],
["Paris 12e","75012",460,"Paris",48.8351,2.4210],
["Paris 13e","75013",470,"Paris",48.8283,2.3626],
["Paris 14e","75014",480,"Paris",48.8302,2.3265],
["Paris 15e","75015",500,"Paris",48.8412,2.3003],
["Paris 16e","75016",640,"Paris Centre Ouest",48.8600,2.2620],
["Paris 17e","75017",600,"Paris Centre Ouest",48.8870,2.3220],
["Paris 18e","75018",440,"Paris",48.8925,2.3444],
["Paris 19e","75019",400,"Paris",48.8870,2.3820],
["Paris 20e","75020",400,"Paris",48.8635,2.3985],
["La Défense","92400",520,"La Défense",48.8918,2.2385],
["Neuilly-sur-Seine","92200",560,"Croissant Ouest",48.8846,2.2686],
["Levallois-Perret","92300",480,"Croissant Ouest",48.8940,2.2880],
["Boulogne-Billancourt","92100",450,"Boucle Sud",48.8354,2.2400],
["Issy-les-Moulineaux","92130",420,"Boucle Sud",48.8240,2.2730],
["Saint-Cloud","92210",340,"Boucle Sud",48.8460,2.2190],
["Puteaux","92800",340,"Péri-Défense",48.8840,2.2390],
["Courbevoie","92400",330,"Péri-Défense",48.8970,2.2560],
["Suresnes","92150",320,"Péri-Défense",48.8710,2.2280],
["Meudon","92190",300,"Boucle Sud",48.8130,2.2360],
["Nanterre","92000",300,"Péri-Défense",48.8920,2.2070],
["Rueil-Malmaison","92500",300,"Péri-Défense",48.8760,2.1800],
["Bois-Colombes","92270",300,"Péri-Défense",48.9170,2.2700],
["La Garenne-Colombes","92250",300,"Péri-Défense",48.9050,2.2450],
["Sèvres","92310",290,"Boucle Sud",48.8230,2.2110],
["Asnières-sur-Seine","92600",280,"Boucle Nord",48.9150,2.2870],
["Colombes","92700",270,"Péri-Défense",48.9230,2.2540],
["Gennevilliers","92230",220,"Boucle Nord",48.9330,2.2950],
["Villeneuve-la-Garenne","92390",200,"Boucle Nord",48.9370,2.3270],
["Montrouge","92120",350,"1re couronne Sud",48.8180,2.3200],
["Clichy","92110",330,"1re couronne Nord",48.9040,2.3060],
["Malakoff","92240",300,"1re couronne Sud",48.8190,2.2990],
["Vanves","92170",300,"1re couronne Sud",48.8230,2.2900],
["Châtillon","92320",280,"1re couronne Sud",48.8020,2.2930],
["Bagneux","92220",250,"1re couronne Sud",48.7970,2.3080],
["Clamart","92140",230,"2e couronne Sud",48.8010,2.2620],
["Le Plessis-Robinson","92350",220,"2e couronne Sud",48.7810,2.2660],
["Antony","92160",210,"2e couronne Sud",48.7530,2.2970],
["Bourg-la-Reine","92340",210,"2e couronne Sud",48.7790,2.3160],
["Sceaux","92330",200,"2e couronne Sud",48.7770,2.2900],
["Fontenay-aux-Roses","92260",195,"2e couronne Sud",48.7890,2.2880],
["Châtenay-Malabry","92290",190,"2e couronne Sud",48.7700,2.2660],
["Saint-Ouen-sur-Seine","93400",330,"1re couronne Nord",48.9110,2.3330],
["Pantin","93500",300,"1re couronne Nord",48.8940,2.4090],
["Saint-Denis","93200",290,"1re couronne Nord",48.9360,2.3540],
["Montreuil","93100",290,"1re couronne Est",48.8620,2.4440],
["Bagnolet","93170",270,"1re couronne Est",48.8680,2.4180],
["Aubervilliers","93300",260,"1re couronne Nord",48.9140,2.3820],
["Le Pré-Saint-Gervais","93310",260,"1re couronne Nord",48.8860,2.4030],
["Les Lilas","93260",250,"1re couronne Nord",48.8790,2.4220],
["Romainville","93230",240,"2e couronne",48.8850,2.4360],
["Bobigny","93000",230,"1re couronne Nord",48.9100,2.4390],
["Noisy-le-Sec","93130",220,"2e couronne",48.8900,2.4600],
["Rosny-sous-Bois","93110",210,"2e couronne",48.8720,2.4830],
["Noisy-le-Grand","93160",210,"Marne-la-Vallée",48.8490,2.5530],
["La Courneuve","93120",210,"2e couronne",48.9340,2.3960],
["Épinay-sur-Seine","93800",200,"2e couronne",48.9540,2.3080],
["Le Bourget","93350",200,"2e couronne",48.9350,2.4250],
["Bondy","93140",190,"2e couronne",48.9020,2.4830],
["Drancy","93700",190,"2e couronne",48.9240,2.4460],
["Stains","93240",175,"2e couronne",48.9560,2.3830],
["Le Blanc-Mesnil","93150",175,"2e couronne",48.9380,2.4640],
["Livry-Gargan","93190",175,"2e couronne",48.9190,2.5410],
["Aulnay-sous-Bois","93600",160,"Pôle de Roissy",48.9380,2.4940],
["Tremblay-en-France","93290",165,"Pôle de Roissy",48.9480,2.5680],
["Villepinte","93420",165,"Pôle de Roissy",48.9600,2.5340],
["Vincennes","94300",300,"1re couronne Est",48.8480,2.4390],
["Saint-Mandé","94160",300,"1re couronne Est",48.8420,2.4160],
["Charenton-le-Pont","94220",300,"1re couronne Est",48.8220,2.4130],
["Nogent-sur-Marne","94130",270,"1re couronne Est",48.8360,2.4820],
["Le Kremlin-Bicêtre","94270",270,"1re couronne Sud",48.8130,2.3600],
["Arcueil","94110",270,"1re couronne Sud",48.8060,2.3350],
["Gentilly","94250",270,"1re couronne Sud",48.8130,2.3430],
["Fontenay-sous-Bois","94120",260,"1re couronne Est",48.8520,2.4770],
["Saint-Maurice","94410",260,"1re couronne Est",48.8190,2.4300],
["Ivry-sur-Seine","94200",260,"1re couronne Sud",48.8140,2.3880],
["Joinville-le-Pont","94340",250,"1re couronne Est",48.8210,2.4720],
["Maisons-Alfort","94700",250,"1re couronne Est",48.8050,2.4370],
["Cachan","94230",250,"1re couronne Sud",48.7930,2.3320],
["Villejuif","94800",250,"1re couronne Sud",48.7930,2.3660],
["Alfortville","94140",230,"1re couronne Est",48.7910,2.4200],
["Créteil","94000",230,"1re couronne Est",48.7900,2.4550],
["Vitry-sur-Seine","94400",230,"1re couronne Sud",48.7880,2.3930],
["L’Haÿ-les-Roses","94240",190,"2e couronne Sud",48.7800,2.3370],
["Rungis","94150",190,"2e couronne Sud",48.7460,2.3510],
["Thiais","94320",180,"2e couronne Sud",48.7650,2.3920],
["Choisy-le-Roi","94600",180,"2e couronne Sud",48.7650,2.4100],
["Orly","94310",175,"2e couronne Sud",48.7480,2.3920],
["Fresnes","94260",175,"2e couronne Sud",48.7550,2.3220],
["Massy","91300",210,"2e couronne Sud",48.7300,2.2830],
["Palaiseau","91120",195,"2e couronne Sud",48.7150,2.2460],
["Orsay","91400",190,"2e couronne Sud",48.6990,2.1870],
["Les Ulis","91940",170,"2e couronne Sud",48.6820,2.1690],
["Évry-Courcouronnes","91000",165,"2e couronne",48.6300,2.4400],
["Corbeil-Essonnes","91100",155,"2e couronne",48.6100,2.4820],
["Vélizy-Villacoublay","78140",210,"2e couronne Sud",48.7830,2.1930],
["Versailles","78000",260,"2e couronne Ouest",48.8010,2.1300],
["Saint-Germain-en-Laye","78100",230,"2e couronne Ouest",48.8980,2.0940],
["Poissy","78300",190,"2e couronne Ouest",48.9290,2.0490],
["Montigny-le-Bretonneux","78180",180,"Saint-Quentin",48.7700,2.0350],
["Guyancourt","78280",180,"Saint-Quentin",48.7700,2.0730],
["Élancourt","78990",160,"Saint-Quentin",48.7860,1.9560],
["Trappes","78190",150,"Saint-Quentin",48.7760,1.9940],
["Argenteuil","95100",190,"2e couronne",48.9470,2.2470],
["Franconville","95130",175,"2e couronne",48.9880,2.2270],
["Cergy","95000",175,"Cergy-Pontoise",49.0360,2.0630],
["Pontoise","95300",170,"Cergy-Pontoise",49.0500,2.1000],
["Gonesse","95500",160,"Pôle de Roissy",48.9870,2.4490],
["Sarcelles","95200",155,"2e couronne",48.9960,2.3810],
["Roissy-en-France","95700",200,"Pôle de Roissy",49.0000,2.5170],
["Chelles","77500",175,"Marne-la-Vallée",48.8800,2.5920],
["Champs-sur-Marne","77420",170,"Marne-la-Vallée",48.8520,2.5960],
["Bussy-Saint-Georges","77600",170,"Marne-la-Vallée",48.8420,2.7080],
["Serris","77700",175,"Marne-la-Vallée",48.8480,2.7830],

["Chaville","92370",290,"Boucle Sud",48.8091,2.1910],
["Garches","92380",300,"Boucle Sud",48.8469,2.1861],
["Marnes-la-Coquette","92430",290,"Boucle Sud",48.8286,2.1689],
["Vaucresson","92420",300,"Boucle Sud",48.8377,2.1628],
["Ville-d'Avray","92410",290,"Boucle Sud",48.8215,2.1759],
["Clichy-sous-Bois","93390",175,"2e couronne",48.9081,2.5432],
["Coubron","93470",175,"2e couronne",48.9173,2.5759],
["Dugny","93440",200,"2e couronne",48.9494,2.4255],
["Gagny","93220",175,"Marne-la-Vallée",48.8826,2.5450],
["Gournay-sur-Marne","93460",175,"Marne-la-Vallée",48.8607,2.5761],
["L'Île-Saint-Denis","93450",200,"Boucle Nord",48.9465,2.3204],
["Montfermeil","93370",175,"Marne-la-Vallée",48.8976,2.5678],
["Neuilly-Plaisance","93360",210,"2e couronne",48.8641,2.5097],
["Neuilly-sur-Marne","93330",175,"Marne-la-Vallée",48.8645,2.5419],
["Les Pavillons-sous-Bois","93320",175,"2e couronne",48.9070,2.5057],
["Le Raincy","93340",190,"2e couronne",48.8959,2.5196],
["Sevran","93270",165,"2e couronne",48.9378,2.5311],
["Vaujours","93410",165,"Pôle de Roissy",48.9338,2.5799],
["Villemomble","93250",210,"2e couronne",48.8866,2.5085],
["Villetaneuse","93430",200,"1re couronne Nord",48.9574,2.3441],
["Ablon-sur-Seine","94480",180,"2e couronne Sud",48.7236,2.4229],
["Boissy-Saint-Léger","94470",230,"1re couronne Est",48.7453,2.5251],
["Bonneuil-sur-Marne","94380",250,"1re couronne Est",48.7721,2.4930],
["Bry-sur-Marne","94360",260,"Marne-la-Vallée",48.8392,2.5224],
["Champigny-sur-Marne","94500",250,"1re couronne Est",48.8173,2.5206],
["Chennevières-sur-Marne","94430",250,"Marne-la-Vallée",48.7951,2.5443],
["Chevilly-Larue","94550",190,"2e couronne Sud",48.7679,2.3507],
["Limeil-Brévannes","94450",230,"1re couronne Est",48.7463,2.4924],
["Mandres-les-Roses","94520",165,"1re couronne Est",48.7068,2.5477],
["Marolles-en-Brie","94440",230,"1re couronne Est",48.7385,2.5539],
["Noiseau","94880",230,"1re couronne Est",48.7757,2.5560],
["Ormesson-sur-Marne","94490",250,"1re couronne Est",48.7873,2.5371],
["Périgny","94520",165,"2e couronne",48.6974,2.5620],
["Le Perreux-sur-Marne","94170",260,"1re couronne Est",48.8433,2.5045],
["Le Plessis-Trévise","94420",210,"Marne-la-Vallée",48.8080,2.5763],
["La Queue-en-Brie","94510",210,"Marne-la-Vallée",48.7769,2.5855],
["Saint-Maur-des-Fossés","94100",250,"1re couronne Est",48.7999,2.4921],
["Santeny","94440",230,"1re couronne Est",48.7362,2.5771],
["Sucy-en-Brie","94370",250,"1re couronne Est",48.7688,2.5374],
["Valenton","94460",180,"2e couronne Sud",48.7497,2.4600],
["Villecresnes","94440",180,"1re couronne Est",48.7221,2.5328],
["Villeneuve-le-Roi","94290",180,"2e couronne Sud",48.7320,2.4076],
["Villeneuve-Saint-Georges","94190",180,"2e couronne Sud",48.7389,2.4493],
["Villiers-sur-Marne","94350",210,"Marne-la-Vallée",48.8278,2.5482],
["Arnouville","95400",160,"Pôle de Roissy",48.9867,2.4168],
["Beauchamp","95250",175,"2e couronne",49.0136,2.1940],
["Beaumont-sur-Oise","95260",170,"2e couronne",49.1372,2.2953],
["Bessancourt","95550",175,"2e couronne",49.0364,2.1998],
["Bezons","95870",270,"Péri-Défense",48.9250,2.2147],
["Cormeilles-en-Parisis","95240",190,"2e couronne",48.9701,2.2010],
["Courdimanche","95800",175,"Cergy-Pontoise",49.0421,1.9999],
["Deuil-la-Barre","95170",200,"2e couronne",48.9704,2.3270],
["Domont","95330",175,"2e couronne",49.0289,2.3243],
["Eaubonne","95600",190,"2e couronne",48.9912,2.2781],
["Enghien-les-Bains","95880",200,"2e couronne",48.9706,2.3050],
["Éragny-sur-Oise","95610",175,"Cergy-Pontoise",49.0224,2.1002],
["Ermont","95120",190,"2e couronne",48.9891,2.2580],
["Ézanville","95460",160,"2e couronne",49.0382,2.3617],
["Fosses","95470",160,"Pôle de Roissy",49.1003,2.5043],
["Garges-lès-Gonesse","95140",160,"2e couronne",48.9696,2.4035],
["Goussainville","95190",160,"Pôle de Roissy",49.0266,2.4683],
["Groslay","95410",175,"2e couronne",48.9852,2.3514],
["Herblay-sur-Seine","95220",175,"2e couronne",49.0052,2.1556],
["L'Isle-Adam","95290",175,"Cergy-Pontoise",49.1078,2.2352],
["Jouy-le-Moutier","95280",175,"Cergy-Pontoise",49.0118,2.0357],
["Louvres","95380",165,"Pôle de Roissy",49.0444,2.5011],
["Méry-sur-Oise","95540",175,"Cergy-Pontoise",49.0518,2.1730],
["Montigny-lès-Cormeilles","95370",190,"2e couronne",48.9934,2.1937],
["Montmagny","95360",200,"2e couronne",48.9677,2.3471],
["Montmorency","95160",175,"2e couronne",48.9922,2.3220],
["Osny","95520",175,"Cergy-Pontoise",49.0668,2.0618],
["Pierrelaye","95220",175,"Cergy-Pontoise",49.0185,2.1629],
["Le Plessis-Bouchard","95130",190,"2e couronne",49.0030,2.2339],
["Saint-Brice-sous-Forêt","95350",175,"2e couronne",49.0034,2.3453],
["Saint-Gratien","95210",200,"2e couronne",48.9679,2.2850],
["Saint-Leu-la-Forêt","95320",190,"2e couronne",49.0211,2.2430],
["Saint-Ouen-l'Aumône","95310",175,"Cergy-Pontoise",49.0450,2.1293],
["Saint-Prix","95390",175,"2e couronne",49.0191,2.2748],
["Sannois","95110",190,"2e couronne",48.9731,2.2509],
["Soisy-sous-Montmorency","95230",175,"2e couronne",48.9888,2.3003],
["Taverny","95150",175,"2e couronne",49.0274,2.2179],
["Vauréal","95490",175,"Cergy-Pontoise",49.0293,2.0254],
["Villiers-le-Bel","95400",160,"2e couronne",49.0080,2.4036],
["Achères","78260",175,"Cergy-Pontoise",48.9817,2.1095],
["Andrésy","78570",175,"2e couronne Ouest",48.9778,2.0496],
["Bois-d'Arcy","78390",160,"Saint-Quentin",48.8060,2.0223],
["Bougival","78380",300,"Péri-Défense",48.8627,2.1394],
["Buc","78530",210,"2e couronne Ouest",48.7736,2.1250],
["Carrières-sous-Poissy","78955",190,"2e couronne Ouest",48.9469,2.0264],
["Carrières-sur-Seine","78420",300,"Péri-Défense",48.9128,2.1812],
["La Celle-Saint-Cloud","78170",260,"Péri-Défense",48.8498,2.1342],
["Chanteloup-les-Vignes","78570",175,"2e couronne Ouest",48.9773,2.0336],
["Chatou","78400",300,"Péri-Défense",48.8964,2.1502],
["Le Chesnay-Rocquencourt","78150",290,"2e couronne Ouest",48.8285,2.1188],
["Les Clayes-sous-Bois","78340",160,"Saint-Quentin",48.8168,1.9835],
["Coignières","78310",160,"Saint-Quentin",48.7506,1.9178],
["Conflans-Sainte-Honorine","78700",175,"Cergy-Pontoise",49.0016,2.0992],
["Croissy-sur-Seine","78290",300,"Péri-Défense",48.8805,2.1342],
["Fontenay-le-Fleury","78330",180,"Saint-Quentin",48.8169,2.0477],
["Houilles","78800",300,"Péri-Défense",48.9266,2.1866],
["Jouy-en-Josas","78350",210,"2e couronne Sud",48.7652,2.1610],
["Louveciennes","78430",260,"2e couronne Ouest",48.8595,2.1132],
["Magny-les-Hameaux","78114",180,"Saint-Quentin",48.7379,2.0494],
["Maisons-Laffitte","78600",190,"2e couronne",48.9503,2.1533],
["Marly-le-Roi","78160",230,"2e couronne Ouest",48.8660,2.0892],
["Maurepas","78310",160,"Saint-Quentin",48.7712,1.9250],
["Le Mesnil-le-Roi","78600",230,"2e couronne Ouest",48.9249,2.1234],
["Les Mureaux","78130",175,"2e couronne Ouest",48.9877,1.9110],
["Noisy-le-Roi","78590",230,"2e couronne Ouest",48.8466,2.0542],
["Le Pecq","78230",230,"2e couronne Ouest",48.8924,2.1022],
["Plaisir","78370",160,"Saint-Quentin",48.8129,1.9483],
["Le Port-Marly","78560",230,"2e couronne Ouest",48.8808,2.1104],
["Saint-Cyr-l'École","78210",180,"Saint-Quentin",48.8064,2.0657],
["Sartrouville","78500",270,"2e couronne",48.9374,2.1744],
["Triel-sur-Seine","78510",175,"2e couronne Ouest",48.9760,2.0055],
["Verneuil-sur-Seine","78480",175,"2e couronne Ouest",48.9874,1.9659],
["La Verrière","78320",160,"Saint-Quentin",48.7545,1.9505],
["Le Vésinet","78110",300,"2e couronne Ouest",48.8928,2.1312],
["Villepreux","78450",160,"Saint-Quentin",48.8306,2.0127],
["Viroflay","78220",260,"2e couronne Sud",48.8017,2.1725],
["Voisins-le-Bretonneux","78960",180,"Saint-Quentin",48.7598,2.0470],
["Arpajon","91290",190,"2e couronne Sud",48.5894,2.2462],
["Athis-Mons","91200",180,"2e couronne Sud",48.7093,2.3848],
["Ballainvilliers","91160",195,"2e couronne Sud",48.6718,2.2910],
["Bièvres","91570",210,"2e couronne Sud",48.7565,2.2079],
["Bondoufle","91070",165,"2e couronne",48.6155,2.3795],
["Boussy-Saint-Antoine","91800",165,"2e couronne",48.6893,2.5354],
["Brétigny-sur-Orge","91220",170,"2e couronne",48.6010,2.2989],
["Brunoy","91800",165,"2e couronne",48.6948,2.5059],
["Bures-sur-Yvette","91440",190,"2e couronne Sud",48.6913,2.1589],
["Chilly-Mazarin","91380",210,"2e couronne Sud",48.7051,2.3103],
["Crosne","91560",180,"2e couronne Sud",48.7202,2.4621],
["Draveil","91210",165,"2e couronne",48.6777,2.4249],
["Épinay-sous-Sénart","91860",165,"2e couronne",48.6885,2.5152],
["Épinay-sur-Orge","91360",195,"2e couronne Sud",48.6719,2.3194],
["Fleury-Mérogis","91700",165,"2e couronne",48.6327,2.3712],
["Gif-sur-Yvette","91190",190,"2e couronne Sud",48.6964,2.1342],
["Grigny","91350",165,"2e couronne",48.6584,2.3861],
["Igny","91430",195,"2e couronne Sud",48.7375,2.2229],
["Juvisy-sur-Orge","91260",190,"2e couronne Sud",48.6917,2.3722],
["Lisses","91090",165,"2e couronne",48.5935,2.4259],
["Longjumeau","91160",210,"2e couronne Sud",48.6923,2.3057],
["Marcoussis","91460",190,"2e couronne Sud",48.6491,2.2078],
["Montgeron","91230",175,"2e couronne",48.6952,2.4638],
["Montlhéry","91310",190,"2e couronne Sud",48.6392,2.2660],
["Morangis","91420",190,"2e couronne Sud",48.7022,2.3361],
["Morsang-sur-Orge","91390",190,"2e couronne",48.6564,2.3513],
["Quincy-sous-Sénart","91480",165,"2e couronne",48.6722,2.5259],
["Ris-Orangis","91130",165,"2e couronne",48.6457,2.4104],
["Saclay","91400",190,"2e couronne Sud",48.7367,2.1693],
["Sainte-Geneviève-des-Bois","91700",195,"2e couronne",48.6430,2.3272],
["Saint-Germain-lès-Arpajon","91180",190,"2e couronne Sud",48.5982,2.2644],
["Saint-Michel-sur-Orge","91240",195,"2e couronne",48.6326,2.3130],
["Savigny-sur-Orge","91600",190,"2e couronne Sud",48.6851,2.3493],
["Verrières-le-Buisson","91370",210,"2e couronne Sud",48.7511,2.2545],
["Vigneux-sur-Seine","91270",180,"2e couronne Sud",48.7021,2.4274],
["Villebon-sur-Yvette","91140",195,"2e couronne Sud",48.6965,2.2366],
["Viry-Châtillon","91170",175,"2e couronne",48.6662,2.3758],
["Wissous","91320",190,"2e couronne Sud",48.7308,2.3278],
["Yerres","91330",180,"2e couronne Sud",48.7129,2.4932],
["Bailly-Romainvilliers","77700",170,"Marne-la-Vallée",48.8450,2.8191],
["Chessy","77700",170,"Marne-la-Vallée",48.8718,2.7697],
["Claye-Souilly","77410",175,"Pôle de Roissy",48.9410,2.6800],
["Collégien","77090",170,"Marne-la-Vallée",48.8249,2.6758],
["Combs-la-Ville","77380",160,"2e couronne",48.6602,2.5765],
["Croissy-Beaubourg","77183",170,"Marne-la-Vallée",48.8164,2.6575],
["Émerainville","77184",175,"Marne-la-Vallée",48.8186,2.6080],
["Lagny-sur-Marne","77400",170,"Marne-la-Vallée",48.8716,2.7045],
["Lieusaint","77127",160,"2e couronne",48.6277,2.5490],
["Lognes","77185",170,"Marne-la-Vallée",48.8325,2.6366],
["Magny-le-Hongre","77700",170,"Marne-la-Vallée",48.8675,2.8171],
["Mitry-Mory","77290",165,"Pôle de Roissy",48.9796,2.6116],
["Montévrain","77144",170,"Marne-la-Vallée",48.8673,2.7511],
["Noisiel","77186",175,"Marne-la-Vallée",48.8461,2.6187],
["Ozoir-la-Ferrière","77330",170,"Marne-la-Vallée",48.7631,2.6753],
["Pontault-Combault","77340",170,"Marne-la-Vallée",48.7885,2.6173],
["Roissy-en-Brie","77680",170,"Marne-la-Vallée",48.7913,2.6647],
["Saint-Thibault-des-Vignes","77400",170,"Marne-la-Vallée",48.8628,2.6792],
["Thorigny-sur-Marne","77400",175,"Marne-la-Vallée",48.8928,2.7117],
["Torcy","77200",170,"Marne-la-Vallée",48.8534,2.6476],
["Vaires-sur-Marne","77360",170,"Marne-la-Vallée",48.8703,2.6332],
["Villeparisis","77270",165,"Pôle de Roissy",48.9408,2.6178]
];

function dist(la1,lo1,la2,lo2){
  var R=6371, dLa=(la2-la1)*Math.PI/180, dLo=(lo2-lo1)*Math.PI/180,
      m=Math.sin(dLa/2)*Math.sin(dLa/2)
       +Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)*Math.sin(dLo/2);
  return R*2*Math.atan2(Math.sqrt(m),Math.sqrt(1-m));
}

var CFG={price:350, deposit:2, ratio:11, years:3,
  booking:"https://cal.com/tristan-martins/15min",
  journal:"https://script.google.com/macros/s/AKfycbyIT93I65zgHBmLktxxNy2gMKXwNqmkY2Nl4kAyVSqkAoc8qckUfsB1uPdvQDU9rbAX/exec"};

var $=function(i){return document.getElementById(i)};
var CALME=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
var TACTILE=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
var TELEPHONE=window.innerWidth<=640;
function nb(v){return F.format(Math.round(v))}
var tabVu=false;
var F=new Intl.NumberFormat('fr-FR'), F1=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
var NB=' ';
function gros(f){return function(v){return f(v).replace(/\u202f/g,'\u00a0')}}
function eur(v){return F.format(Math.round(v))+NB+'€'}
/* ─────────── AUCUNE DECIMALE DANS UN MONTANT ───────────
   « 5,6 k€ » se lit deux fois : une fois le chiffre, une fois la virgule. Un
   ordre de grandeur n a pas besoin d etre precis, il a besoin d etre retenu et
   repete au telephone. Tous les montants sont donc des entiers.
   Le passage au million est fixe a DIX millions, pas a un : arrondir 2 540 000
   en « 3 M€ » gonflerait l ecart de dix-huit pour cent, soit exactement le genre
   d approximation en notre faveur que le reste du modele s interdit. Entre mille
   et dix millions on reste donc en k€, quitte a ecrire 2 540 k€. */
function kEur(v){v=Math.round(v);var a=Math.abs(v);
  if(a>=10000000)return F.format(Math.round(v/1000000))+NB+'M€';
  if(a>=1000)return F.format(Math.round(v/1000))+NB+'k€';
  return F.format(v)+NB+'€'}
/* Le titre final annonce un ordre de grandeur, pas une facture. « 39 k€ » se
   retient et se répète ; « 38 842 € » donne l'illusion d'un devis et invite à
   contester la décimale. Le détail exact reste lisible dans les cartes.
   Meme regle que ci-dessus, meme fonction : il n y a plus deux facons d ecrire
   un montant dans cette page, il n y en a qu une. */
var kCta=kEur;
/* Le grand nombre s egrene de zero jusqu a sa valeur : il lui faut UNE unite
   fixe pour toute la montee, sinon il change de suffixe en cours de route. On
   la choisit sur la valeur d arrivee, et sans decimale la non plus. */
function unite(mx){mx=Math.abs(mx);
  if(mx>=10000000)return function(v){return F.format(Math.round(v/1000000))+NB+'M€'};
  if(mx>=100000)return function(v){return F.format(Math.round(v/1000))+NB+'k€'};
  return eur}
function yr(n){return n+(n>1?' ans':' an')}
function mois(n){n=Math.round(n);return n%12===0&&n>=12?yr(n/12):n+' mois'}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function nrm(s){return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/[^a-z0-9]+/g,' ').trim()}
function mots(s){return nrm(s).split(' ')}
function bail(y){if(y<=2)return 'bail de courte durée';if(y===3)return 'bail 3/6/9';
  if(y===6)return 'bail 6/9';if(y===9)return 'bail 9 ans ferme';return 'bail commercial'}
function bailCourt(y){if(y<=2)return 'Bail court';if(y===3)return 'Bail 3/6/9';
  if(y===6)return 'Bail 6/9';return 'Bail '+y+' ans'}

/* ─────────── LE DOIGT A LA PRIORITE SUR L'ANIMATION ───────────
   Un decompte est interpole sur le temps ecoule, pas sur le nombre d'images
   affichees. Or le navigateur d'un telephone suspend ses images pendant un
   defilement au doigt : au relachement, le compteur rattrape d'un coup tout le
   temps perdu et le chiffre saute. On ne lance donc rien pendant que la page
   defile, on met en attente et on repart des que le doigt s'arrete. */
var enDefilement=false, minuteurDef=null, enAttente=[];
addEventListener('scroll',function(){
  if(!TELEPHONE)return;
  enDefilement=true;
  clearTimeout(minuteurDef);
  minuteurDef=setTimeout(function(){
    enDefilement=false;
    var f=enAttente; enAttente=[];
    f.forEach(function(g){g()});
  },130);
},{passive:true});
function quandPose(fn){
  if(!TELEPHONE||!enDefilement||CALME){fn();return}
  if(enAttente.length<24)enAttente.push(fn);
}

/* ─────────── UN COMPTEUR NE SE MET JAMAIS EN ATTENTE ───────────
   quandPose ci-dessus differe une animation tant que le doigt fait defiler, pour
   que le compteur ne rattrape pas d un coup le temps perdu. Excellent pour le
   grand nombre, desastreux pour les cartes : le defilement REVELE justement les
   cartes, la revelation est une transition CSS que rien ne suspend, et le chiffre
   restait donc en attente, visible et fige a « 0 », le temps que le pouce
   s arrete. C est le « 0 avec un delai de latence » que l on voyait.
   La bonne reponse n est pas d attendre, c est de renoncer a l animation : si le
   doigt defile, on pose la valeur finale tout de suite. On ne perd qu une jolie
   montee que personne ne regardait, et le chiffre est juste des la premiere
   image. Des que le doigt s arrete, les cartes suivantes s animent normalement. */
function compteOuPose(el,duree){
  if(!el||el._cible===undefined)return;
  if(TELEPHONE&&enDefilement&&!CALME){
    el._cur=el._cible;
    el.textContent=(el._fmt||nb)(el._cible);
    return;
  }
  tween(el,el._cible,el._fmt||nb,duree);
}

function tween(el,to,fmt,dur){
  if(!el)return;
  if(CALME){el._cur=to;el.textContent=fmt(to);return}
  var from=(typeof el._cur==='number')?el._cur:0, t0=performance.now(), d=dur||900;
  if(el._r)cancelAnimationFrame(el._r);
  if(Math.abs(to-from)<1){el._cur=to;el.textContent=fmt(to);return}
  (function s(t){
    var p=Math.min(1,(t-t0)/d), z=1-Math.pow(1-p,3);
    el._cur=(p<1)?from+(to-from)*z:to;
    el.textContent=fmt(el._cur);
    if(p<1)el._r=requestAnimationFrame(s);
  })(t0);
}

var IX={}; C.forEach(function(r){if(!IX[r[0]])IX[r[0]]=r});
var S={city:'',cp:'',val:0,zone:'',lat:0,lon:0,heads:0,years:CFG.years,
       ratio:CFG.ratio,valide:false,headsOk:false,dur:false,durTouche:false,
       valFix:0,villeFix:'',
       co:'',li:''};
var M={}, ouvert=false;

function setCity(n){var r=IX[n];if(!r)return false;
  S.city=r[0];S.cp=r[1];S.val=r[2];S.zone=r[3];S.lat=r[4];S.lon=r[5];
  if(S.valFix&&S.city===S.villeFix)S.val=S.valFix; else S.valFix=0;
  return true}

function calc(){
  var u=S.heads*S.ratio, base=u*S.val;
  M.years=S.years; M.lease=bail(S.years);
  var best=null,bd=1e9;
  SITES.forEach(function(s){var d=dist(S.lat,S.lon,s[2],s[3]);if(d<bd){bd=d;best=s}});
  /* A moins de 150 m d ecart on prefere l espace le moins cher, et la distance
     retenue doit alors etre la sienne, pas celle du plus proche. */
  var bkm=bd;
  SITES.forEach(function(s){var d=dist(S.lat,S.lon,s[2],s[3]);
    if(d<=bd+0.15&&s[4]<best[4]){best=s;bkm=d}});
  M.site=best; M.km=bkm; M.price=(best&&best[4])||CFG.price;
  M.circ=circons(S.city,S.cp); M.tsb=tarifTSB(S.city,S.cp);
  M.red=(M.circ===2&&DSU.indexOf(S.city)>-1); M.taxe=M.tsb+H.fonc;
  M.amort=Math.max(M.years,3);
  /* Interets du credit d amenagement. Sur un remboursement lineaire l encours moyen
     vaut la moitie du capital : le cout annuel est donc constant. Ces interets et le
     capital de la carte Tresorerie sont une ALTERNATIVE, jamais une addition, selon
     que le locataire sort la somme ou l emprunte. */
  M.credit=H.works*H.taux/100/2;
  M.seatA=(base*(1-H.fran)+u*(H.charges+M.taxe+H.serv+M.credit)
           +u*H.works/M.amort)/S.heads/12;
  M.seatB=M.price;
  M.tot=M.seatA*S.heads*12; M.ws=M.seatB*S.heads*12;
  M.year=M.tot-M.ws; M.span=M.year*M.years;
  M.wk=u*H.works;
  M.cashA=base/12*H.garantie+M.wk;
  M.cashB=M.ws/12*CFG.deposit;
  M.cash=M.cashA-M.cashB;
  M.pm=function(v){return v*S.ratio/12};
}

var PICTO=[
    '<path d="M3.5 9.5h17M5.5 9.5V19M18.5 9.5V19M3.5 6.2h17v3.3h-17z"/>',
  '<path d="M13.2 2.8 5.5 13.6h5.1l-1.3 7.6 8.2-11.2h-5.2z"/>',
  '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.3V12l3.4 2.1"/>',
  '<path d="M4 18.4v-1.6a3.2 3.2 0 0 1 3.2-3.2h1.6a3.2 3.2 0 0 1 3.2 3.2v1.6M15 18.4v-1.4a3 3 0 0 1 2.4-2.9"/><circle cx="8" cy="8.4" r="2.7"/><circle cx="16.6" cy="9.2" r="2.1"/>',
 '<path d="M3.6 7.2h16.8v10.4H3.6z"/><path d="m3.6 7.6 8.4 5.6 8.4-5.6"/>',
   '<path d="M12 3.2l1.5 4.1 4.1 1.5-4.1 1.5L12 14.4l-1.5-4.1L6.4 8.8l4.1-1.5z"/><path d="M17.8 14.6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
   '<path d="M4.6 9.4a10.4 10.4 0 0 1 14.8 0M7.6 12.6a6.2 6.2 0 0 1 8.8 0"/><circle cx="12" cy="16.8" r="1.4"/>',
  '<path d="M4 5.6h6.2v5.2H4zM13.8 5.6H20v5.2h-6.2zM4 13.2h6.2v5.2H4zM13.8 13.2H20v5.2h-6.2z"/>'
];
/* Libelle, precision, index du picto. Le libelle tient sur une ligne, sinon la
   grille se desaligne. La precision precise son libelle et rien d autre. */
var INCLUS=[
 ['Poste de travail am\u00e9nag\u00e9','mobilier et cloisons compris',0],
 ['Charges et fluides','\u00e9lectricit\u00e9, eau, chauffage',1],
 ['Salle de r\u00e9union','3 h par poste et par mois',3],
 ['Salles, phonebox et alc\u00f4ves','r\u00e9servables \u00e0 l\u2019heure',7],
 ['Accueil et courrier','visiteurs, lettres et colis',4],
 ['M\u00e9nage quotidien','parties privatives et communes',5],
 ['Internet fibre 1 Go','wifi sur tout l\u2019espace',6],
 ['Acc\u00e8s 24 h/24','sept jours sur sept',2]
];

var ICO=[
 '<path d="M17.5 6.6a6.5 6.5 0 100 10.8M4.5 10.2h8.2M4.5 13.8h7.2"/>',
 '<rect x="3.2" y="6.5" width="17.6" height="12" rx="2.6"/><circle cx="12" cy="12.5" r="2.7"/>',
 '<rect x="3.8" y="5.4" width="16.4" height="15" rx="2.6"/><path d="M3.8 10.2h16.4M8.4 3.2v4.2M15.6 3.2v4.2"/>',
 '<path d="M7 3.6h6.8l4.2 4.2v12.6H7z"/><path d="M13.5 3.8V8h4.3M10 12.4h4.8M10 15.8h4.8"/>'
];
function lignes(){
  var pm=M.pm;
  return [
  {t:'Coût par poste / mois',u:'€',a:M.seatA,b:M.seatB,f:eur,
   phrase:'<b>'+eur(Math.abs(M.seatA-M.seatB))
     +'</b> économisés par poste et par mois',
   rows:[[S.valFix?'Loyer facial, celui que vous nous avez indiqué'
      :'Loyer facial, moyenne ImmoStat du secteur',eur(pm(S.val))],
     ['Mesures d’accompagnement, '+Math.round(H.fran*100)+' %','−'+eur(pm(S.val)*H.fran)],
     ['Charges locatives refacturées',eur(pm(H.charges))],
     ['Taxe sur les bureaux, '+M.circ+(M.circ===1?'re':'e')+' circonscription'
       +(M.red?' à tarif minoré':'')+', et foncière',eur(pm(M.taxe))],
     ['Charges privatives (exploitation, ménage, internet, maintenance, assurance, etc.)',
       eur(pm(H.serv))],
     ['Travaux d’aménagement sur la base d’un ratio standard de '+eur(H.works)
       +'/m², amortis sur '+yr(M.amort),eur(pm(H.works)/M.amort)],
     ['Taux d’intérêt travaux d’aménagement ('+F1.format(H.taux)
       +'\u00a0%) si financement bancaire',
       eur(pm(M.credit))],
     ['Coût total d’une solution en bail classique',eur(M.seatA),'s'],
     ['Offre plug &amp; play Work &amp; Share '+esc(M.site?M.site[0]:'')
       +' - 0 coûts cachés',eur(M.seatB),'w']],
   note:'Le loyer facial représente seulement <b>'
     +Math.round(pm(S.val)/M.seatA*100)+' %</b> du coût total d’un bail classique. '
     +'En signant, vous n’avez probablement pas connaissance des coûts additionnels qui '
     +'viennent significativement augmenter le coût de votre bail.'},
  {t:'Trésorerie immobilisée',u:'€',a:M.cashA,b:M.cashB,f:kEur,
   phrase:'<b>'+eur(Math.abs(M.cashA-M.cashB))
     +'</b> de trésorerie préservée dès le départ',
   rows:[['Dépôt de garantie et autres garanties bancaires (hypothèse : '
       +H.garantie+' mois de loyer)',
       eur(S.heads*S.ratio*S.val/12*H.garantie)],
     ['Travaux d’aménagement sur la base d’un ratio standard de '+eur(H.works)+'/m²',
       eur(M.wk)],
     ['Trésorerie immobilisée en bail classique, avant l’entrée dans vos bureaux',
       eur(M.cashA),'s'],
     ['Trésorerie à décaisser en signant chez Work &amp; Share : '+CFG.deposit
       +' mois de dépôt de garantie',eur(M.cashB),'w']],
   note:'En bail classique, vos travaux d’aménagement (<b>'+eur(M.wk)+'</b>) sont une '
     +'dépense non récupérable. À noter que vous ne récupérerez probablement qu’une '
     +'partie du dépôt de garantie après état des lieux et remise en état.<br>'
     +'En optant pour une solution chez Work &amp; Share, votre bureau est livré '
     +'plug &amp; play et vous n’avez qu’un seul dépôt de garantie égal à '+CFG.deposit
     +' mois à décaisser en signant votre contrat.'},
  {t:'Engagement ferme',u:'mois',a:Math.min(M.years,3)*12,b:3,f:mois,
   phrase:'<b>'+mois(Math.min(M.years,3)*12-3)+'</b> d’engagement ferme en moins',
   html:'<p>Sur un bail <b>3/6/9</b>, vous êtes tenu 3 ans fermes, puis vous ne sortez '
     +'qu’aux échéances triennales, avec généralement 6 mois de préavis.</p>'
     +'<p>Chez Work &amp; Share, vous avez la capacité de résilier votre contrat '
     +'avec <b>3 mois de préavis</b>.</p>'},
  {t:'Contrats à piloter',u:'',a:9,b:1,
   f:function(v){v=Math.round(v);return v+(v>1?' contrats':' contrat')},
   phrase:'<b>8 contrats</b> en moins à négocier, suivre et renouveler',
   html:'<p>Il faut négocier le bail, gérer ses avenants, suivre la régularisation '
     +'annuelle des charges, les contrats d’électricité, d’eau et d’autres fluides, '
     +'l’internet, le ménage, la maintenance, l’assurance, la sécurité… Sans oublier le '
     +'financement des travaux, avec un crédit bancaire qui s’accompagne souvent de '
     +'conditions et de garanties.</p>'
     +'<p>Chez Work &amp; Share, <b>un seul contrat</b>. Un seul interlocuteur. Tout est '
     +'inclus, et notre équipe s’occupe du reste.</p>'
     +'<p class="incT">Ce que couvre ce contrat unique</p>'
     +'<div class="incG">'+INCLUS.map(function(x){
        return '<div class="incI"><i class="incP" aria-hidden="true">'
          +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
          +'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
          +PICTO[x[2]]+'</svg></i><span><b>'+x[0]+'</b><em>'+x[1]+'</em></span></div>';
       }).join('')+'</div>'
     +'<p class="incT incT2">Et ce qui reste en option</p>'
     +'<div class="incO">'
     +'<span><b>Domiciliation juridique</b><u>45\u00a0\u20ac</u><em>par mois</em></span>'
     +'<span><b>Place de parking</b><u>150\u00a0\u20ac</u><em>par mois</em></span>'
     +'<span><b>Badge caf\u00e9</b><u>25\u00a0\u20ac</u><em>par mois</em></span>'
     +'</div>'}];
}
function dessine(){
  var L=lignes(), host=$('rows'), courtA=bailCourt(M.years);
  if($('hA'))$('hA').textContent=courtA;
  if(!host._built){
    host._built=true;
    host.innerHTML=L.map(function(r,i){
      return '<details class="duel" data-a data-blk="'+i+'"><summary>'
       +'<div class="dhaut"><b id="t'+i+'"></b><i id="u'+i+'"></i>'
       +'<span class="dgain"><b id="g'+i+'">0</b><em id="gu'+i+'"></em></span></div>'
       +'<div class="dlig"><span class="dnom" id="ba'+i+'"></span>'
       +'<span class="dval a" id="a'+i+'">0</span>'
       +'<span class="djauge"><i class="ja" id="ja'+i+'"></i></span></div>'
       +'<div class="dlig"><span class="dnom">Work &amp; Share</span>'
       +'<span class="dval b" id="b'+i+'">0</span>'
       +'<span class="djauge"><i class="jb" id="jb'+i+'"></i></span></div>'
       +'<span class="see">Détails</span>'
       +'</summary><div class="det" id="d'+i+'"></div></details>';
    }).join('');
    arme(host);
    /* Les ecouteurs de depli sont poses ICI, et non sur « load ». Les quatre
       cartes n'existent pas au chargement de la page, elles sont fabriquees par
       cette fonction quand le resultat s'ouvre : un querySelectorAll('.duel')
       plus tot ne trouve rien et aucun ecouteur n'est attache.
       Le bug a masque le signal pendant quatorze visites, colonne « Details
       ouverts » vide alors que les cartes etaient bien depliees. Il compte
       double : ce signal vaut jusqu'a 4 points de score, et c'est lui qui choisit
       l'angle de la relance dans le mail d'alerte. */
    [].forEach.call(host.querySelectorAll('.duel'),function(el,i){
      el.addEventListener('toggle',function(){
        if(!el.open||DETAILS[i]||enImpression)return;
        DETAILS[i]=true;
        var t=el.querySelector('.dhaut b');
        noter('detail',{carte:(t?t.textContent:'carte '+(i+1))});
      });
    });
  }
  L.forEach(function(r,i){
    $('t'+i).textContent=r.t;
    $('ba'+i).textContent=courtA;
    $('gu'+i).textContent=' '+(r.u||'contrats')+' de moins';
    $('u'+i).textContent='';
    var mx=Math.max(r.a,r.b)||1;
    $('ja'+i).style.width=(r.a/mx*100).toFixed(2)+'%';
    $('jb'+i).style.width=(r.b/mx*100).toFixed(2)+'%';
    [['a',r.a],['b',r.b],['g',Math.abs(r.a-r.b)]].forEach(function(c){
      var e=$(c[0]+i); e._cible=c[1]; e._fmt=nb;
      if(tabVu) tween(e,c[1],nb,650); else e.textContent=nb(0);
    });
    var d=$('d'+i), h='';
    if(r.rows) h+='<table>'+r.rows.map(function(l){
      return '<tr'+(l[2]?' class="'+l[2]+'"':'')+'><td>'+l[0]+'</td><td>'+l[1]+'</td></tr>'}).join('')+'</table>';
    if(r.note) h+='<p>'+r.note+'</p>';
    if(r.html) h+=r.html;
    d.innerHTML=h;
  });
}

function compteBloc(i,d){
  var bl=document.querySelector('[data-blk="'+i+'"]');
  if(!bl||bl._compte)return; bl._compte=1; tabVu=true;
  /* Trois chiffres qui s'egrenent l'un apres l'autre passent bien sur un grand
     ecran, ou l'oeil les embrasse d'un coup. Sur telephone ils se suivent dans
     le sens de la lecture et le decalage devient un defile publicitaire : ils
     partent donc presque ensemble, et plus vite. */
  /* ─────────── PLUS JAMAIS UN ZERO AU REPOS ───────────
     Les trois valeurs partaient 300, 480 et 780 ms APRES l apparition de la
     carte. Pendant ce delai la carte etait deja visible, et l on y lisait un
     « 0 » parfaitement immobile : le visiteur croyait a un chiffrage rate, pas
     a une animation qui n avait pas commence. Les trois partent maintenant en
     meme temps que la carte se revele — le zero n est plus un etat, seulement
     la premiere image d une montee. La cascade est conservee, mais a l arrivee :
     les trois durees different, les trois chiffres se posent l un apres l autre. */
  var pas=[['a',900],['b',1000],['g',1120]];
  pas.forEach(function(c){
    var e=$(c[0]+i);
    if(!e||e._cible===undefined)return;
    setTimeout(function(){compteOuPose(e,CALME?0:c[1])},CALME?0:d);
  });
}
function compteTableau(){
  for(var i=0;i<4;i++) compteBloc(i,CALME?0:i*230);
}

var seqVu=false, seqFini=false;
function poseCompte(el,duree){
  if(!el||el._cible===undefined)return;
  tween(el,el._cible,el._fmt,duree);
}
var mainPrise=false, tabArme=CALME;
function geste(){
  mainPrise=true;
  if(tabArme)return;
  tabArme=true;
  arme(document);
  /* Les cartes deja sorties par le haut de l ecran ne declencheront plus jamais
     l observateur : il n y aura pas de nouvelle entree dans le champ. Sans ce
     rattrapage elles restent a opacite zero, valeurs a zero, et le visiteur qui a
     fait defiler pendant la sequence ne voit qu un blanc a la place du comparatif. */
  [].forEach.call(document.querySelectorAll('[data-blk]'),function(el){
    if(el.getBoundingClientRect().bottom>=0)return;
    if(ioBloc)ioBloc.unobserve(el);
    el.classList.add('in');
    compteBloc(+el.dataset.blk,0);
  });
}
var toucheVue=false, yFin=null;
function laMain(){
  mainPrise=true; toucheVue=true;
  if(seqFini) geste();
}
['wheel','touchmove','touchstart'].forEach(function(ev){
  addEventListener(ev,laMain,{passive:true})});
addEventListener('scroll',function(){
  if(tabArme||!seqFini||yFin===null)return;
  var y=window.scrollY||document.documentElement.scrollTop||0;
  if(Math.abs(y-yFin)>40) geste();
},{passive:true});
addEventListener('keydown',function(ev){
  if(ev.key===' '||ev.key==='Tab'||ev.key.indexOf('Arrow')===0
     ||ev.key.indexOf('Page')===0||ev.key==='Home'||ev.key==='End') geste()});

function sequence(){
  if(seqVu)return; seqVu=true;
  mainPrise=false;
  var q=[].slice.call(document.querySelectorAll('.verd .sq'));
  if(CALME){
    q.forEach(function(el){el.classList.add('on')});
    poseCompte($('big'),0);
    [1,2,3].forEach(function(n){poseCompte($('k'+n),0)});
    seqFini=true;
    return;
  }
  var T=[0,120,1520,1740,1980,1980,1980];
  q.forEach(function(el,i){
    setTimeout(function(){el.classList.add('on')},T[i]||0);
  });
  setTimeout(function(){poseCompte($('big'),1200)},240);

  var trio=document.querySelector('.trio');
  if(trio)trio.classList.add('spot');

  /* ─────────── PLUS AUCUN RECENTRAGE PENDANT LA SEQUENCE ───────────
     Trois etats successifs, tous mauvais. La page a d'abord recentre l'ecran
     sur chacun des trois chiffres, a 1,4 s d'intervalle : elle bougeait donc
     trois fois toute seule et entrait en collision avec le pouce. Reduit
     ensuite a un seul recentrage sur le trio, elle poussait le montant de
     l'economie hors de l'ecran par le haut : au moment ou les trois chiffres
     s'affichaient, on ne voyait plus ce qu'ils detaillaient.
     La sequence ne deplace donc plus rien. rejoue() a deja amene le haut du
     resultat sous la barre d'adresse, ce qui laisse le montant visible et les
     trois chiffres juste en dessous. */
  /* ─────────── LES TROIS CHIFFRES DOIVENT SE LIRE ───────────
     Le telephone avait des delais raccourcis, herites de l idee qu un petit
     ecran doit aller plus vite. C est l inverse : on y lit a bout de bras, en
     marchant, et les trois chiffres se chassaient l un l autre avant d avoir
     ete lus. Un seul rythme desormais, celui du grand ecran, et plus lent :
     1,5 s entre deux departs, 950 ms de montee.
     Le premier depart est passe de 2,2 s a 3,2 s. Le grand nombre commence sa
     montee a 240 ms et met 1,2 s a se poser : il n avait donc que sept dixiemes
     de seconde a lui avant que les trois chiffres ne reclament l oeil. Il en a
     maintenant pres de deux, le temps d etre lu une fois et d etre cru. */
  var ECART=1500, DEPART=3200;

  [1,2,3].forEach(function(n,i){
    var t=DEPART+i*ECART;
    setTimeout(function(){
      if(trio&&trio.children[i])trio.children[i].classList.add('zoom');
      compteOuPose($('k'+n),950);
    },t);
    setTimeout(function(){
      if(trio&&trio.children[i])trio.children[i].classList.remove('zoom');
    },t+1250);
  });
  setTimeout(function(){
    if(trio)trio.classList.remove('spot');
    seqFini=true;
    /* Le visiteur a fait defiler PENDANT la sequence : son geste est deja passe,
       aucun autre n arrivera forcement. On arme donc les cartes sur place. */
    if(mainPrise) geste();
    setTimeout(function(){
      yFin=window.scrollY||document.documentElement.scrollTop||0;
    },600);
  },DEPART+2*ECART+1600);
}

var io=null, vagueT=0, vagueR=0;
if('IntersectionObserver' in window){
  io=new IntersectionObserver(function(es){
    var lot=es.filter(function(e){return e.isIntersecting})
      .sort(function(x,y){
        var a=x.target.dataset.blk, c=y.target.dataset.blk;
        return (a===undefined?-1:+a)-(c===undefined?-1:+c)});
    lot.forEach(function(e){
      var el=e.target; io.unobserve(el);
      var d;
      if(el.dataset.blk!==undefined){
        var t=Date.now();
        vagueR = (t-vagueT<350) ? vagueR+1 : 0;
        vagueT=t; d=vagueR*230;
      } else d=+(el.dataset.d||0);
      el.style.setProperty('--dl',d+'ms');
      el.style.transitionDelay=d+'ms';
      el.classList.add('in');
      if(el.dataset.blk!==undefined) compteBloc(+el.dataset.blk,d);
      if(el.dataset.tab) tabVu=true;
      if(el.dataset.seq) sequence();
    });
  },{threshold:.16,rootMargin:'0px 0px -4% 0px'});
}

var ioFin=null;
if('IntersectionObserver' in window){
  ioFin=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      var el=e.target; ioFin.unobserve(el);
      var d=+(el.dataset.d||0);
      el.style.setProperty('--dl',d+'ms');
      el.style.transitionDelay=d+'ms';
      el.classList.add('in');
      if(el.id==='ctaH'){
        setTimeout(chiffreFinal,CALME?0:700);
        /* ─────────── LA LISTE DOIT CONTENIR TOUT LE BLOC FINAL ───────────
           Quand le titre entre a l'ecran, il revele lui-meme ses voisins : la
           section est trop haute pour que chacun declenche l'observateur, dont
           la marge basse est de -42 %. Or « .act2 », le bouton de partage,
           n'avait jamais ete ajoute a cette liste : il restait donc a opacite
           zero, invisible et incliquable, alors que le bouton de rendez-vous
           juste au-dessus et la preuve juste en dessous apparaissaient. Son
           delai de 380 ms, entre les 260 de .act et les 470 de .preuve, montre
           qu'il avait bien ete prevu dans la cascade. */
        ['.act','.act2','.preuve','.legal'].forEach(function(sel){
          var q=document.querySelector(sel); if(!q||q.classList.contains('in'))return;
          var dq=+(q.dataset.d||0);
          if(ioFin) ioFin.unobserve(q);
          q.style.setProperty('--dl',dq+'ms');
          q.style.transitionDelay=dq+'ms';
          q.classList.add('in');
        });
      }
    });
  },{threshold:.01,
     rootMargin:TELEPHONE?'0px 0px -16% 0px':'0px 0px -42% 0px'});
}

var ioBloc=null;
if('IntersectionObserver' in window){
  ioBloc=new IntersectionObserver(function(es){
    var lot=es.filter(function(e){return e.isIntersecting})
      .sort(function(x,y){return +x.target.dataset.blk - +y.target.dataset.blk});
    lot.forEach(function(e){
      var el=e.target; ioBloc.unobserve(el);
      var t=Date.now();
      vagueR=(t-vagueT<350)?vagueR+1:0; vagueT=t;
      var d=vagueR*(TELEPHONE?170:230);
      el.style.setProperty('--dl',d+'ms');
      el.style.transitionDelay=d+'ms';
      el.classList.add('in');
      compteBloc(+el.dataset.blk,d);
    });
  /* Sur telephone la marge etait a -48 % : la carte ne se revelait qu'une fois
     arrivee dans la moitie haute de l'ecran, donc bien apres que le pouce l'ait
     fait defiler. L'utilisateur voyait le resultat, jamais la transition. */
  },{threshold:.01,
     rootMargin:TELEPHONE?'0px 0px -16% 0px':'0px 0px -34% 0px'});
}
function arme(root){
  (root||document).querySelectorAll('[data-a]').forEach(function(el){
    if(el._seen)return;
    if(!tabArme&&(el.dataset.tab||(el.closest&&el.closest('[data-tab]'))))return;
    el._seen=1;
    if(CALME||!io){el.classList.add('in');
      if(el.dataset.blk!==undefined) compteBloc(+el.dataset.blk,0);
      if(el.dataset.seq) sequence();
      if(el.dataset.tab) compteTableau();
      return}
    (el.dataset.blk!==undefined?ioBloc:(el.dataset.fin!==undefined?ioFin:io)).observe(el);
  });
}

function piste(){
  var pc=(S.years-1)/8*100;
  $('rg').style.setProperty('--trk',
    'linear-gradient(90deg,var(--amber) 0 '+pc+'%,rgba(255,255,255,.2) '+pc+'% 100%)');
  $('yrv').textContent=yr(S.years);
  $('rg').setAttribute('aria-valuetext',yr(S.years));
}

function peindre(){
  if(document.activeElement!==$('hd')){
    var t=S.heads>0?String(S.heads):'';
    if($('hd').value!==t)$('hd').value=t;
  }
  piste();
  majPrTete();
  journal();
  var pret=!!S.city&&S.heads>0&&S.dur&&((S.valide&&S.headsOk)||ouvert);
  lumieres();
  if(!pret){
    if(!ouvert){$('res').style.display='none';$('res').classList.remove('vu')}
    return;
  }
  calc();
  var win=M.year>=0, a=Math.abs(M.span), P=S.heads+(S.heads>1?' postes':' poste');
  $('vLab').textContent=win?'Économies sur '+yr(M.years):'Trésorerie préservée';
  var grand=win?a:M.cash, fm=unite(grand);
  var fgb=gros(fm);
  $('big')._cible=grand; $('big')._fmt=fgb;
  if(seqFini) tween($('big'),grand,fgb,700);
  else if(!seqVu){$('big').textContent=fgb(0);$('big')._cur=0}
  /* ─────────── « EQUIVALENT » N EST PAS UN MOT PASSE-PARTOUT ───────────
     La phrase disait « le cout courant est equivalent » des que le bail passait
     devant, quel que soit l ecart. A La Garenne-Colombes sur neuf ans le bail
     revient a 464 EUR contre 580 chez nous : vingt pour cent, et la premiere carte
     affiche les deux chiffres un ecran plus bas. Le visiteur lisait donc, noir sur
     blanc, le dementi de la phrase d ouverture. On ne dit « equivalent » que sous
     huit pour cent d ecart, ce qui couvre soixante-trois des soixante-neuf cas ;
     au-dela on l enonce et l on deplace l argument. Six communes perdent une jolie
     phrase, la page garde sa credibilite partout. */
  var dEc=Math.abs(M.seatA-M.seatB), proche=dEc<=M.seatB*0.08;
  $('vPh').innerHTML=win
    ? '<b>'+eur(M.seatA)+'</b> par poste et par mois en '+esc(M.lease)
      +', contre <b>'+eur(M.seatB)+'</b> chez Work &amp; Share, tout compris.'
    : proche
      ? 'À '+esc(S.city)+', le coût courant est équivalent. L’écart est ailleurs : '
        +'<b>'+eur(M.cash)+'</b> de trésorerie préservée.'
      : 'À '+esc(S.city)+', le bail revient à <b>'+eur(M.seatA)+'</b> par poste et par '
        +'mois, contre <b>'+eur(M.seatB)+'</b> chez nous. L’écart se joue ailleurs : '
        +'<b>'+eur(M.cash)+'</b> de trésorerie préservée et '
        +mois(Math.min(M.years,3)*12-3)+' d’engagement ferme en moins.';
  var t=[[win?M.seatA-M.seatB:M.wk, win?eur:kEur,
          win?'d’économie par poste et par mois':'d’aménagement que vous ne financez pas',
          win?eur(M.seatA)+' en bail, '+eur(M.seatB)+' chez Work &amp; Share':''],
         [win?M.cash:Math.abs(M.seatA-M.seatB), win?kEur:eur,
          win?'de trésorerie préservée':'d’écart par poste, en faveur du bail',
          win?kEur(M.cashA)+' à sortir, contre '+kEur(M.cashB)+' chez Work &amp; Share':''],
         [Math.min(M.years,3)*12-3, mois,
          'd’engagement ferme en moins',
          mois(Math.min(M.years,3)*12)+' fermes en bail, contre '+mois(2)]];
  t.forEach(function(x,i){
    var k=$('k'+(i+1));
    var fg=gros(x[1]);
    k._cible=x[0]; k._fmt=fg;
    if(seqFini) tween(k,x[0],fg,700);
    else if(!seqVu){k.textContent=fg(0);k._cur=0}
    $('l'+(i+1)).textContent=x[2];
  });
  dessine();
  var forme=(win?'gain':'projet')+'|'+(S.from||'');
  if($('ctaH')._forme!==forme){
    $('ctaH')._forme=forme;
    var voc=S.from?'<span class="mot voc">'+esc(S.from)+',</span> ':'';
    var deb=S.from?'parlons':'Parlons';
    $('ctaH').innerHTML=win
      ? voc+'<span class="mot">'+deb+' de vos </span><b class="tn" id="ctaFig"></b>'
        +'<span class="mot"> d’économies.</span>'
      : voc+deb+' de votre projet de bureaux.';
    $('ctaH').classList.toggle('solo', win&&!CALME&&!ctaVu);
  }
  if(win){
    var fc=gros(kCta);
    if(ctaVu) tween($('ctaFig'),a,fc,900);
    else {$('ctaFig').textContent=fc(a);$('ctaFig')._cur=a;armeCta()}

  }
  if(M.site){
    /* Meme regle que les montants : pas de virgule. « a 3 km » se retient,
       « a 3,4 km » donne une precision que deux centroides ne meritent pas. */
    var km=Math.max(1,Math.round(M.km));
    var lien=M.site[5]+(M.site[5].indexOf('?')>-1?'&':'?')
      +'utm_source=comparateur&utm_medium=verdict&utm_campaign=bail-vs-ws'
      +'&postes='+S.heads+'&duree='+S.years;
    /* Pas de distance quand l espace est dans la commune simulee : les kilometres
       separent deux centroides, pas deux villes. Comparaison sur un mot entier, sinon
       « Clichy-sous-Bois » se reconnait dans « Clichy », et moins de 5 km exiges. */
    var nv=nrm(S.city), ns=nrm(M.site[0]), na=nrm(M.site[1]);
    var colle=function(a,b){return a===b||a.indexOf(b+' ')===0};
    var meme=(colle(nv,ns)||colle(ns,nv)||na.indexOf(nv)>-1)&&M.km<5;
    /* ═══ AU DELA DE 20 KM, ON CONSTATE, ON NE PROPOSE PLUS ═══
       Le referentiel s'arrete a 25 km d'un espace : les 18 communes plus
       lointaines ont ete retirees le 21 aout 2026, Fontainebleau se voyant
       proposer Villejuif a 47,2 km. Le chiffre etait exact et la proposition
       absurde, ce qui abimait tout le reste de la page.
       Entre 20 et 25 km, le verbe « Decouvrir » disparait et la phrase enonce
       un fait. Le lien demeure, pour qui veut regarder malgre la distance. */
    var loin=M.km>LOIN;
    var phrase='<span>'+(loin
      ? '<b>Work &amp; Share '+esc(M.site[0])+'</b>, notre espace le plus proche, à '+km+' km'
      : (meme||M.km<1.2)
        ? 'Découvrir <b>Work &amp; Share '+esc(M.site[0])+'</b>'
        : 'Découvrir <b>Work &amp; Share '+esc(M.site[0])+'</b>, à '+km+' km')
      +'</span>';
    $('vEsp').innerHTML=lien
      ? '<a href="'+lien+'" target="_blank" rel="noopener">'+phrase
        +'<i aria-hidden="true">&rarr;</i><span class="sr">, voir cet espace sur '
        +'notre site, ouvre un nouvel onglet</span></a>'
      : '<a>'+phrase+'</a>';
  } else $('vEsp').textContent='';
  $('goLink').href=lienRdv();
  majAdresse();
}

function lumieres(){
  var f=document.querySelectorAll('.fld');
  if(!f.length)return;
  var faits=[S.valide&&!!S.city, S.headsOk&&S.heads>0, !!S.durTouche];
  var d=$('decl');
  if(d){
    var pret=faits[0]&&faits[1];
    d.disabled=!pret;
    d.classList.toggle('pret',pret);
    d.classList.toggle('parti',ouvert);
  }
  var actif=faits[0]?(faits[1]?2:1):0;
  if(TACTILE&&!ouvert&&actif!==lumieres._vu&&f[actif]){
    lumieres._vu=actif;
    if(actif>0){
      var cible=f[actif];
      setTimeout(function(){
        if(!cible.scrollIntoView)return;
        try{ cible.scrollIntoView({block:'center',behavior:'smooth'}); }
        catch(e){ cible.scrollIntoView(); }
      },260);
    }
  }
  for(var i=0;i<f.length;i++){
    var dort=i>actif, vif=(i===actif&&!faits[i]), fait=faits[i];
    f[i].classList.toggle('dort',dort);
    f[i].classList.toggle('vif',vif);
    f[i].classList.toggle('fait',fait);
    /* ─────────── NE JAMAIS REECRIRE UN ATTRIBUT INCHANGE ───────────
       Cette boucle tourne a CHAQUE frappe. Elle reecrivait disabled et tabIndex
       sur les trois champs, donc aussi sur celui que le doigt est en train de
       remplir. Sur iOS, poser un de ces deux attributs sur un champ ayant le
       focus remet le curseur en position zero : on tapait « L » et le curseur
       repassait devant la lettre, la deuxieme frappe donnait « eL ». Chrome et
       Firefox ne le reproduisent pas, ce qui a longtemps fait passer le defaut
       pour une lubie du telephone. On n ecrit donc que ce qui change. */
    f[i].querySelectorAll('input,button').forEach(function(c){
      if(c.disabled!==dort)c.disabled=dort;
      var ti=dort?-1:0;
      if(c.tabIndex!==ti)c.tabIndex=ti;
    });
  }
}

var ctaVu=false, tRejOrig=null;
function chiffreFinal(){
  ctaVu=true;
  if(M.year<0||!$('ctaFig'))return;
  var c=Math.abs(M.span);
  tween($('ctaFig'),c,gros(kCta),0);
  var h=$('ctaH');
  if(!h||CALME)return;
  setTimeout(function(){h.classList.remove('solo')},760);
}
function armeCta(){
  if(CALME){ ctaVu=true; return }
  var h=$('ctaH');
  if(h&&h.classList.contains('in')){ ctaVu=true; setTimeout(chiffreFinal,60); }
}

var COURBE=[.45,.05,.55,.95];
function bezier(P){
  var x1=P[0],y1=P[1],x2=P[2],y2=P[3];
  var cx=3*x1, bx=3*(x2-x1)-cx, ax=1-cx-bx;
  var cy=3*y1, by=3*(y2-y1)-cy, ay=1-cy-by;
  return function(x){
    var lo=0,hi=1,t=x,i,u;
    for(i=0;i<20;i++){u=((ax*t+bx)*t+cx)*t; if(u<x)lo=t;else hi=t; t=(lo+hi)/2}
    return ((ay*t+by)*t+cy)*t;
  };
}
var glissement=null;
function glisse(cible,duree,fini){
  if(glissement){cancelAnimationFrame(glissement.id);glissement=null}
  var d0=scrollY, dd=cible-d0, t0=0, bez=bezier(COURBE);
  if(Math.abs(dd)<3){if(fini)fini();return}
  var g={id:0};
  glissement=g;
  function pas(ts){
    if(glissement!==g)return;
    if(!t0)t0=ts;
    var k=Math.min(1,(ts-t0)/duree);
    scrollTo({top:Math.round(d0+dd*bez(k)),behavior:'instant'});
    if(k<1) g.id=requestAnimationFrame(pas);
    else {glissement=null; if(fini)fini()}
  }
  g.id=requestAnimationFrame(pas);
}
function coupeGlisse(){ if(glissement){cancelAnimationFrame(glissement.id);glissement=null} }
['wheel','touchstart','keydown'].forEach(function(ev){
  addEventListener(ev,coupeGlisse,{passive:true})});

function replie(enc,duree){
  var t0=enc.style.transition;
  enc.style.transition='none';
  enc.classList.add('plie');
  var h1=enc.getBoundingClientRect().height;
  enc.classList.remove('plie');
  enc.offsetHeight;
  if(CALME){enc.style.transition=t0;enc.classList.add('plie');return h1}
  enc.style.transition='min-height '+(duree/1000)+'s cubic-bezier('+COURBE.join(',')
    +'),padding-bottom '+(duree/1000)+'s cubic-bezier('+COURBE.join(',')+')';
  enc.offsetHeight;
  enc.classList.add('plie');
  setTimeout(function(){enc.style.transition=t0},duree+40);
  return h1;
}

function reveler(){
  if(ouvert)return;
  if(!(S.city&&S.heads>0&&S.dur&&S.valide&&S.headsOk))return;
  ouvert=true;
  var r=$('res');
  r.style.display='';
  peindre();
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    r.classList.add('vu'); arme(r);
    var enc=document.querySelector('.enc');
    if(enc){
      var haut=Math.round(scrollY+enc.getBoundingClientRect().top);
      var DUR=1100, ATT=240;
      if(CALME){
        replie(enc,0); dock();
        scrollTo(0,Math.max(0,Math.round(haut+enc.getBoundingClientRect().height)));
      } else setTimeout(function(){
        var h1=replie(enc,DUR);
        glisse(Math.max(0,Math.round(haut+h1)),DUR,dock);
      },ATT);
    }
    setTimeout(function(){peindre();planifieV()},CALME?0:520);
    setTimeout(sequence,CALME?0:1100);
  })});
}

var tRej=null;
function rejoue(origine){
  if(!ouvert){peindre();reveler();return}
  peindre();
  tRejOrig=origine||null;
  clearTimeout(tRej);
  tRej=setTimeout(function(){
    ctaVu=false;
    var a=document.activeElement, f=(a&&a.closest)?a.closest('.fld'):null;
    if(f&&f.dataset.champ!==tRejOrig) return;
    var v=document.querySelector('.verd'); if(!v)return;
    var t=v.getBoundingClientRect().top;
    if(t<-10||t>innerHeight*.5)
      v.scrollIntoView({behavior:CALME?'auto':'smooth',block:'start'});
  },origine==='effectif'?900:260);
}

var box=$('drop'), res=[], act=-1;
function ferme(){box.classList.remove('open');act=-1;
  $('q').setAttribute('aria-expanded','false');$('q').removeAttribute('aria-activedescendant')}
/* « st ouen », « st-cloud », « st denis » ne trouvaient rien, alors que dix-neuf
   communes du referentiel commencent par Saint- ou Sainte- et que trois de nos
   espaces sont dans l une d elles. Les limites de mot protegent « Stains » et
   « Strasbourg », qui ne contiennent pas le mot « st ». */
function trouve(q){
  var n=nrm(q).replace(/\bst\b/g,'saint').replace(/\bste\b/g,'sainte'),
      dg=(q.match(/\d{2,5}/)||[])[0];
  if(!n)return [];
  var t1=[],t2=[],t3=[];
  C.forEach(function(r){
    var full=nrm(r[0]), ws=mots(r[0]);
    if(full.indexOf(n)===0){t1.push(r);return}
    for(var i=1;i<ws.length;i++)if(ws[i].indexOf(n)===0){t2.push(r);return}
    if(dg&&r[1].indexOf(dg)===0)t3.push(r);
  });
  var by=function(a,b){return a[0].localeCompare(b[0],'fr')};
  t1.sort(by);t2.sort(by);t3.sort(by);
  return t1.concat(t2,t3).slice(0,6);
}
function marque(){
  var L=box.querySelectorAll('.opt');
  for(var i=0;i<L.length;i++){
    L[i].classList.toggle('sel',i===act);
    L[i].setAttribute('aria-selected',i===act?'true':'false');
  }
  if(act>=0){
    $('q').setAttribute('aria-activedescendant','o'+act);
    if(L[act]) L[act].scrollIntoView({block:'nearest'});
  }
}
/* ─────────── LA LISTE DOIT TENIR AU-DESSUS DU CLAVIER ───────────
   Le clavier d'un telephone ne reduit pas la fenetre : il recouvre le bas de la
   page. Une liste haute de 282 px ouverte sous le champ passait donc en grande
   partie dessous, et l'on ne voyait que la premiere commune.
   visualViewport donne la zone reellement visible ; on y ajuste la hauteur de la
   liste a chaque ouverture, et a chaque apparition ou disparition du clavier. */
function ajusteDrop(){
  if(!TELEPHONE||!box)return;
  var vv=window.visualViewport;
  if(!vv){box.style.maxHeight='';return}
  var r=$('q').getBoundingClientRect();
  var dispo=vv.offsetTop+vv.height-r.bottom-22;
  box.style.maxHeight=Math.max(132,Math.min(282,dispo))+'px';
}
if(window.visualViewport){
  visualViewport.addEventListener('resize',ajusteDrop);
  visualViewport.addEventListener('scroll',ajusteDrop);
}

function liste(){
  if(!res.length){ferme();return}
  ajusteDrop();
  box.innerHTML=res.map(function(r,i){
    return '<div class="opt'+(i===act?' sel':'')+'" role="option" id="o'+i+'" data-i="'+i+'"'
      +' aria-selected="'+(i===act?'true':'false')+'" style="--i:'+i+'">'
      +'<span class="a">'+esc(r[0])+'</span><span class="b">'+r[1]+'</span></div>'}).join('');
  box.classList.add('open');
  $('q').setAttribute('aria-expanded','true');
  if(act>=0)$('q').setAttribute('aria-activedescendant','o'+act);
  box.querySelectorAll('.opt').forEach(function(el){
    el.addEventListener('mousedown',function(ev){ev.preventDefault();
      choisir(+el.getAttribute('data-i'))})});
}
function choisir(i){var r=res[i];if(!r)return;
  setCity(r[0]);S.valide=true;$('q').value=r[0];ferme();
  msg('');rejoue('ville');
  if(!S.headsOk&&document.activeElement!==$('hd')) $('pl').focus({preventScroll:true});
}
function msg(m){var e=$('msg'); e.textContent=m||''}

(function(){
  var e=document.querySelector('.et'); if(!e)return;
  var d='M12 2l2.95 6.16 6.79.82-4.95 4.7 1.24 6.72L12 17.2l-6.03 3.2 1.24-6.72'
       +'L2.26 8.98l6.79-.82z';
  var h=''; for(var i=0;i<5;i++) h+='<svg viewBox="0 0 24 24"><path d="'+d+'"/></svg>';
  e.innerHTML=h;
})();
/* ─────────── LE CURSEUR NE REVIENT PAS EN TETE ───────────
   Sur iOS, on tapait « L » et le curseur repassait devant la lettre : la frappe
   suivante donnait « eL ». Le correctif precedent supprimait les ecritures
   inutiles de disabled et tabIndex sur le champ ayant le focus ; il fallait les
   faire, elles n etaient pas la cause. Le vrai coupable est ailleurs dans la
   chaine appelee a chaque frappe — reconstruction de la liste, bascule des
   classes, ecriture dans le champ voisin — et Safari peut deplacer la selection
   APRES le rendu, donc apres tout ce que ce code controle.
   On cesse de chercher lequel : on releve la position avant, on la repose si
   elle a bouge. Trois fois, parce que Safari s y prend a trois moments — tout de
   suite, a l image suivante, et une fois la pile videe. Rien n est repose si le
   doigt a change de champ ou si le texte a change entre-temps : le visiteur qui
   deplace lui-meme son curseur reste maitre de son champ. */
function gardeCurseur(el,p,q,v){
  var remets=function(){
    if(document.activeElement!==el||el.value!==v)return;
    if(el.selectionStart===p&&el.selectionEnd===q)return;
    try{el.setSelectionRange(p,q)}catch(e){}
  };
  remets();
  if(window.requestAnimationFrame)requestAnimationFrame(remets);
  setTimeout(remets,0);
}

$('q').addEventListener('input',function(){
  var el=this, focus=(document.activeElement===el),
      p=el.selectionStart, q=el.selectionEnd, brut=el.value;
  var v=el.value.trim(); res=trouve(v); act=-1; liste(); S.valide=false;
  if(res[0]){setCity(res[0][0]);msg('');peindre()}
  else{
    S.city='';S.val=0;
  msg(v.length>1?'Aucune commune ne commence par « '+v+' »':'');
    peindre();
  }
  if(focus)gardeCurseur(el,p,q,brut);
});
/* Au clic dans le champ, on remonte la carte en haut de l'ecran : c'est la seule
   facon de degager assez de place pour la liste avant que le clavier ne monte. */
$('q').addEventListener('focus',function(){
  if(!TELEPHONE)return;
  var f=this.closest&&this.closest('.fld');
  setTimeout(function(){
    if(f&&f.scrollIntoView){
      try{ f.scrollIntoView({block:'start',behavior:'smooth'}); }
      catch(e){ f.scrollIntoView(); }
    }
    setTimeout(ajusteDrop,340);
  },70);
});
$('q').addEventListener('keydown',function(ev){
  if(ev.key==='Escape'){ferme();this.blur();return}
  if(!box.classList.contains('open'))return;
  if(ev.key==='ArrowDown'){ev.preventDefault();act=Math.min(res.length-1,act+1);marque()}
  else if(ev.key==='ArrowUp'){ev.preventDefault();act=Math.max(0,act-1);marque()}
  else if(ev.key==='Enter'){ev.preventDefault();choisir(act<0?0:act);this.blur()}
});
$('q').addEventListener('blur',function(){var f=this;
  setTimeout(function(){ferme();f.value=S.city;
    if(S.city){S.valide=true;rejoue('ville')}},130)});
document.addEventListener('click',function(ev){
  if(!box.contains(ev.target)&&ev.target!==$('q'))ferme()});

var tH=null;
function poseHeads(){clearTimeout(tH);
  if(!(S.heads>0)||S.headsOk)return;S.headsOk=true;rejoue('effectif')}
function setHeads(n){n=Math.round(n);if(!(n>0))n=1;if(n>900)n=900;
  clearTimeout(tH);S.heads=n;$('hd').value=n;S.headsOk=true;rejoue('effectif')}
var tRep=null;
function bouge(sens){
  var t0=performance.now();
  setHeads((S.heads||0)+sens);
  function tic(){
    var dt=performance.now()-t0;
    var pas=dt<1600?1:(dt<3200?5:10);
    var attente=dt<900?230:(dt<1600?110:60);
    setHeads((S.heads||0)+sens*pas);
    tRep=setTimeout(tic,attente);
  }
  tRep=setTimeout(tic,430);
}
function stop(){clearTimeout(tRep);tRep=null}
[['mn',-1],['pl',1]].forEach(function(x){
  var el=$(x[0]);
  el.addEventListener('pointerdown',function(ev){
    if(ev.button)return;
    ev.preventDefault();
    bouge(x[1]);
  });
  ['pointerup','pointerleave','pointercancel'].forEach(function(e){
    el.addEventListener(e,stop)});
  el.addEventListener('contextmenu',function(ev){ev.preventDefault()});
});
addEventListener('pointerup',stop);
addEventListener('blur',stop);

$('hd').addEventListener('input',function(){
  var v=this.value.replace(/[^\d]/g,'').slice(0,4);
  var n=parseInt(v,10);
  if(n>900){n=900;v='900'}
  if(v!==this.value)this.value=v;
  if(!v||!(n>0)){S.heads=0;S.headsOk=false;clearTimeout(tH);peindre();return}
  S.heads=n; S.headsOk=false;
  clearTimeout(tH); tH=setTimeout(poseHeads,ouvert?900:1600);
  peindre();
});
$('hd').addEventListener('blur',function(){
  var n=parseInt(this.value,10);
  if(n>0)setHeads(n); else {this.value='';S.heads=0;S.headsOk=false;peindre()}
});
$('hd').addEventListener('keydown',function(ev){
  if(ev.key==='Enter'){ev.preventDefault();this.blur();return}
  if(ev.key==='ArrowUp'){ev.preventDefault();setHeads((S.heads||0)+(ev.shiftKey?10:1))}
  if(ev.key==='ArrowDown'){ev.preventDefault();setHeads((S.heads||2)-(ev.shiftKey?10:1))}
});
$('stp').addEventListener('wheel',function(ev){
  if(document.activeElement!==$('hd'))return;
  ev.preventDefault();
  var pas=ev.shiftKey?10:1;
  setHeads((S.heads||0)+(ev.deltaY<0?pas:-pas));
},{passive:false});

$('rg').addEventListener('input',function(){
  S.years=+this.value||1; S.durTouche=true; piste();
  if(ouvert){peindre()}else{lumieres()}
});
$('rg').addEventListener('change',function(){ if(ouvert)rejoue('duree') });
$('rg').addEventListener('pointerup',function(){ if(ouvert)rejoue('duree') });

var ouvertsAvant=null;
/* L impression n a plus de bouton mais reste soignee : beforeprint est emis quoi
   qu il arrive, menu, raccourci ou apercu. Deplier les cartes est indispensable,
   sans l attribut open certains moteurs les impriment vides. */
addEventListener('beforeprint',function(){
  enImpression=true;
  ouvertsAvant=[].map.call(document.querySelectorAll('.duel'),function(d){
    var av=d.open; d.open=true; return av;});
  majPrTete();
  noter('impression');
});
addEventListener('afterprint',function(){
  if(ouvertsAvant){
    [].forEach.call(document.querySelectorAll('.duel'),function(d,i){
      d.open=ouvertsAvant[i];});
    ouvertsAvant=null;
  }
  enImpression=false;
});

$('decl').addEventListener('click',function(){
  if(this.disabled)return;
  S.dur=true;
  rejoue('duree');
});

var SID=(function(){
  var a='';
  for(var i=0;i<10;i++)a+='abcdefghijklmnopqrstuvwxyz0123456789'[
    Math.floor(Math.random()*36)];
  return a;
})();

var VISITE=(function(){
  try{
    var n=parseInt(localStorage.getItem('ws_cmp_v')||'0',10)+1;
    localStorage.setItem('ws_cmp_v',String(n));
    return n;
  }catch(e){return 1}
})();

var T0=Date.now(), PROF=0, DETAILS={}, jrnFait='', jrnT=null, jrnNe=false;
var enImpression=false;

addEventListener('scroll',function(){
  var h=document.documentElement.scrollHeight-window.innerHeight;
  if(h<=0)return;
  var p=Math.round(((window.scrollY||document.documentElement.scrollTop)/h)*100);
  if(p>PROF)PROF=Math.min(100,p);
},{passive:true});

function envoyer(d){
  var surAppsScript=!!(window.google&&google.script&&google.script.run);
  if(!CFG.journal&&!surAppsScript)return;
  d.vid=SID; d.log=1;
  if(surAppsScript){
    try{google.script.run.enregistrer(d);return}catch(e){}
  }
  try{
    var q=Object.keys(d).map(function(x){
      return x+'='+encodeURIComponent(d[x])}).join('&');
    new Image().src=CFG.journal+(CFG.journal.indexOf('?')>-1?'&':'?')+q;
  }catch(e){}
}

function noter(ev,extra){
  if(!jrnNe)return;
  var d={ev:ev};
  if(extra)for(var k in extra)d[k]=extra[k];
  envoyer(d);
}

/* Une ligne par visite, ecrite seulement si la commune, l effectif et la duree sont
   renseignes et stables depuis quatre secondes. Les antivirus d entreprise
   pre-cliquent les liens des courriels : sans ce garde-fou le journal se remplirait
   de visites fantomes. */
function journal(){
  var surAppsScript=!!(window.google&&google.script&&google.script.run);
  if((!CFG.journal&&!surAppsScript)||!ouvert)return;
  if(!S.city||!(S.heads>0)||!S.dur)return;
  clearTimeout(jrnT);
  jrnT=setTimeout(function(){
    var k=[S.city,S.heads,S.years,S.ratio,S.valFix,S.from].join('|');
    if(k===jrnFait)return; jrnFait=k; jrnNe=true;
    envoyer({ev:'calcul',
      ville:S.city, postes:S.heads, duree:S.years, ratio:S.ratio,
      loyer:S.valFix||'', prenom:S.from||'', visite:VISITE,
      societe:S.co||'', profil:S.li||'',
      eco:Math.round(M.span||0), treso:Math.round(M.cash||0),
      cout:Math.round(M.seatA||0), espace:M.site?M.site[0]:'',
      km:M.km?Math.round(M.km*10)/10:'',
      ref:(document.referrer||'').slice(0,120)});
  },4000);
}

addEventListener('load',function(){
  var g=$('goLink'); if(g)g.addEventListener('click',function(){noter('rdv')});
  /* Partage : ni mailto, qui ouvre l application Mail du systeme, ni navigator.share,
     qui sur macOS propose AirDrop, Notes et Rappels avant WhatsApp. Trois
     destinations utiles et le lien a copier, dans un menu que nous maitrisons. */
  var en=$('envBtn'), menu=$('pMenu');
  function texteP(){
    if(!M.site)return '';
    var win=M.year>=0;
    return 'Le chiffrage pour '+S.heads+(S.heads>1?' postes':' poste')+' \u00e0 '+S.city
      +' sur '+yr(S.years)+' : '+eur(M.seatA)+' par poste et par mois en bail, contre '
      +eur(M.seatB)+' chez Work & Share, tout compris. '
      +(win?'Soit '+kEur(M.span)+' d\u2019\u00e9cart.':kEur(M.cash)+' de tr\u00e9sorerie pr\u00e9serv\u00e9e.');
  }
  function fermeP(){menu.hidden=true;en.setAttribute('aria-expanded','false')}
  function bloc(cls,svg,libelle,href){
    return '<a class="pS" '+(href?'href="'+href+'" target="_blank" rel="noopener"':'')
      +'><i class="'+cls+'" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" '
      +'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
      +'stroke-linejoin="round">'+svg+'</svg></i>'+libelle+'</a>';
  }
  function ouvreP(){
    var t=texteP(), l=lienSimulation(), plein=t+'\n'+l;
    menu.innerHTML=
      bloc('wa','<path d="M20.2 11.6a8.2 8.2 0 0 1-12.1 7.2L3.8 20.2l1.4-4.3A8.2 8.2 0 1 1 20.2 11.6z"/><path d="M9.2 9.1c.6 1.9 2 3.3 3.9 3.9l1-1.1 1.7 1.1c-.5 1.2-2 1.5-3.5.8a7.4 7.4 0 0 1-3.9-3.9c-.7-1.5-.4-3 .8-3.5l1.1 1.7z"/>',
        'WhatsApp','https://wa.me/?text='+encodeURIComponent(plein))
     +bloc('gm','<path d="M3.6 6.4h16.8v11.2H3.6z"/><path d="m3.6 6.8 8.4 5.8 8.4-5.8"/>',
        'Gmail','https://mail.google.com/mail/?view=cm&fs=1&su='
        +encodeURIComponent('Bail commercial ou bureau flexible : le chiffrage pour '+S.city)
        +'&body='+encodeURIComponent(plein))
     +bloc('li','<path d="M6.4 9.8v8M6.4 6.2v.1M11 17.8v-8M11 13.4c0-2 1.2-3.6 3.2-3.6s3.2 1.4 3.2 3.6v4.4"/>',
        'LinkedIn','https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(l))
     +'<hr>'
     +'<button type="button" id="cpBtn"><i class="cp" aria-hidden="true">'
     +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
     +'stroke-linecap="round" stroke-linejoin="round"><path d="M9.4 9.4h9.2v9.2H9.4z"/>'
     +'<path d="M14.6 9.4V5.4H5.4v9.2h4"/></svg></i><span id="cpTxt">Copier le lien</span></button>'
     /* Masque par defaut : il ne sert que si le presse papier est refuse. Le
        garder visible allongeait le menu de quarante pixels pour rien, et c'est
        justement cette hauteur qui le faisait deborder vers le bas. */
     +'<input class="pLien" id="pIn" readonly hidden value="'+esc(l)+'">';
    menu.hidden=false; en.setAttribute('aria-expanded','true');
    noter('partage');
    menu.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click',function(){setTimeout(fermeP,120)})});
    $('cpBtn').addEventListener('click',function(){
      var ch=$('pIn'), t=$('cpTxt');
      var fait=false;
      try{ if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(ch.value); fait=true; } }catch(e){}
      if(!fait){ ch.hidden=false; ch.focus(); ch.select();
        try{ fait=document.execCommand('copy') }catch(e){} }
      if(!fait){ ch.hidden=false; ch.focus(); ch.select() }
      t.textContent=fait?'Lien copi\u00e9':'Faites Cmd+C';
      t.parentNode.classList.add('ok');
      setTimeout(function(){t.textContent='Copier le lien';
        t.parentNode.classList.remove('ok')},2600);
    });
  }
  if(en)en.addEventListener('click',function(){
    if(!M.site)return;
    if(!menu.hidden){fermeP();return}
    ouvreP();
  });
  document.addEventListener('click',function(ev){
    if(menu&&!menu.hidden&&!menu.contains(ev.target)&&ev.target!==en
       &&!en.contains(ev.target)) fermeP();
  });
  document.addEventListener('keydown',function(ev){
    if(ev.key==='Escape'&&menu&&!menu.hidden)fermeP();
  });
  /* Delegation sur le conteneur, jamais sur le lien. Ce lien est reconstruit par
     peindre() a chaque repeint, donc un ecouteur pose dessus serait detruit au
     premier changement de commune ou d'effectif. Et au chargement il n'existe
     meme pas : le conteneur est vide tant qu'aucun chiffrage n'a eu lieu.
     Deuxieme moitie du meme bug que les cartes, meme cause, meme correction. */
  var ve=$('vEsp');
  if(ve)ve.addEventListener('click',function(ev){
    if(ev.target.closest&&ev.target.closest('a'))
      noter('espace',{espace:M.site?M.site[0]:''});
  });
},{once:true});

var finEnvoyee=false;
function finVisite(){
  if(finEnvoyee||!jrnNe)return; finEnvoyee=true;
  noter('fin',{sec:Math.round((Date.now()-T0)/1000), prof:PROF});
}
addEventListener('visibilitychange',function(){
  if(document.visibilityState==='hidden')finVisite();
});
addEventListener('pagehide',finVisite);

var MOIS=['janvier','février','mars','avril','mai','juin','juillet','août',
  'septembre','octobre','novembre','décembre'];
function majPrTete(){
  var e=$('prCtx'); if(!e)return;
  if(!S.city||!(S.heads>0)){e.textContent='';return}
  var d=new Date();
  e.textContent=S.city+', '+S.heads+(S.heads>1?' postes':' poste')
    +', engagement de '+yr(S.years)+', '+S.ratio+' m² par poste'
    +(S.valFix?', loyer communiqué par l’entreprise':'')
    +'. Établi le '+d.getDate()+' '+MOIS[d.getMonth()]+' '+d.getFullYear()
    +' sur workandshare.com. Estimation à visée informative, ni devis ni offre.';
}

var adrAnc='';
function majAdresse(){
  if(!history.replaceState||!S.city||!(S.heads>0)||!S.dur)return;
  var q='?ville='+encodeURIComponent(S.city)+'&postes='+S.heads+'&duree='+S.years
       +(S.valFix?'&loyer='+S.valFix:'')
       +(S.from?'&prenom='+encodeURIComponent(S.from):'')
       +(S.co?'&societe='+encodeURIComponent(S.co):'')
       +(S.li?'&profil='+encodeURIComponent(S.li):'');
  if(q===adrAnc)return; adrAnc=q;
  try{history.replaceState(null,'',q)}catch(e){}
}

/* Adresse qui rejoue cette simulation, partageable telle quelle. location.href ne
   convient pas : servie par Apps Script, la page vit dans un cadre isole dont
   l adresse est googleusercontent.com. CFG.journal est l adresse publique du meme
   deploiement. Sans prenom ni societe : un lien transmis ne doit pas emporter
   l identite de l expediteur, et la visite du destinataire s inscrirait sous son nom. */
function lienSimulation(){
  var q='?ville='+encodeURIComponent(S.city)+'&postes='+S.heads+'&duree='+S.years
       +(S.valFix?'&loyer='+S.valFix:'');
  var surAppsScript=!!(window.google&&google.script&&google.script.run);
  var base=surAppsScript ? CFG.journal : (location.origin+location.pathname);
  return base+q;
}

function lienRdv(){
  if(!M.site)return CFG.booking;
  /* cal.com renvoie ces notes dans son webhook : la reference relie la reservation a
     la ligne du journal. Deux regles a ne pas defaire. Aucune ligne vide, un double
     saut de ligne interrompt le pre-remplissage de cal.com et tout ce qui suit est
     perdu. Et la reference en premier, car si cal.com tronque, c est la fin qui saute. */
  var b=['Réf. visite : '+SID,
    (S.from?'Interlocuteur : '+S.from:'Comparateur en ligne'),
    'Commune : '+S.city,
    'Effectif : '+S.heads+(S.heads>1?' collaborateurs':' collaborateur'),
    'Durée envisagée : '+yr(S.years),
    'Surface retenue : '+S.ratio+' m² par poste',
    'Espace le plus proche : '+M.site[0],
    (M.year>=0?'Économie estimée : ':'Trésorerie préservée : ')
      +kEur(Math.abs(M.year>=0?M.span:M.cash))].join('\n');
  return CFG.booking+'?notes='+encodeURIComponent(b)
    +'&utm_source=comparateur&utm_medium=calculateur';
}

var finEl=document.querySelector('.fin'), vAnc=-1, vPrevu=false;
function majV(){
  vPrevu=false;
  if(CALME||!finEl)return;
  var h=window.innerHeight||1;
  var t=finEl.getBoundingClientRect().top;
  var v=(h-t)/(h*0.72);
  v=v<0?0:(v>1?1:v);
  v=v*v*(3-2*v);
  v=Math.round(v*1000)/1000;
  if(v===vAnc)return;
  vAnc=v; finEl.style.setProperty('--v',v);
}
function planifieV(){ if(!vPrevu){vPrevu=true; requestAnimationFrame(majV)} }
addEventListener('scroll',planifieV,{passive:true});
addEventListener('resize',planifieV);

function dock(){}

(function(){
  var p=new URLSearchParams(location.search);

  var P=(typeof window!=='undefined'&&window.__P)||{};
  function lis(){
    for(var i=0;i<arguments.length;i++){
      var k=arguments[i];
      if(P[k]!==undefined&&P[k]!==null&&P[k]!=='')return String(P[k]);
      var v=p.get(k);
      if(v!==null&&v!=='')return v;
    }
    return null;
  }
  /* Ne jamais nommer un parametre « c » : Google le reserve sur script.google.com et
     refuse l adresse avant meme d atteindre ce code. Les parametres sont deposes par
     le serveur dans window.__P, car l adresse du cadre isole d Apps Script ne les
     porte pas de facon fiable. */
  var c=lis('ville'),
      n=parseFloat(lis('postes','n')),
      y=parseFloat(lis('duree','y'));
  var f=(lis('prenom','from')||'').replace(/[^\p{L}\p{M}\-' ]/gu,'').trim().slice(0,24);
  if(f) S.from=f.charAt(0).toUpperCase()+f.slice(1);

  /* Les variables de campagne voyagent jusqu au journal, elles ne sont jamais
     affichees. Aucune adresse electronique dans l URL : elle finirait dans
     l historique du navigateur et dans l en-tete de provenance. Toute valeur
     contenant une accolade est refusee : lemlist laisse parfois le gabarit tel quel
     quand la variable est vide. */
  function propre(v,v2,n){
    v=(lis(v,v2)||'').trim();
    if(!v||v.indexOf('{')>-1||v.indexOf('}')>-1)return '';
    return v.slice(0,n);
  }
  S.co=propre('societe','co',80);
  var li=propre('profil','li',160);
  S.li=/^https?:\/\/([a-z0-9-]+\.)?linkedin\.com\//i.test(li)?li:'';
  if(c&&IX[c]){setCity(c);$('q').value=S.city;S.valide=true;
    var l=parseFloat(lis('loyer','l'));
    if(l>=80&&l<=1200){S.val=Math.round(l);S.valFix=S.val;S.villeFix=S.city}}
  if(n>0&&n<10000){S.heads=Math.min(900,Math.round(n));S.headsOk=true;
    $('hd').value=S.heads}
  if(y>=1&&y<=9){S.years=Math.round(y);S.dur=true;S.durTouche=true;$('rg').value=S.years}
})();
if(CFG.journal||(window.google&&google.script&&google.script.run)){
  $('rgpd').innerHTML=' Les informations que vous saisissez sont enregistrées par '
    +'Work &amp; Share à des fins de suivi commercial. Pour y accéder ou les faire '
    +'effacer, écrivez à <a href="mailto:tristan@workandshare.com" '
    +'style="color:inherit;display:inline-block;padding:6px 2px">'
    +'tristan@workandshare.com</a>.';
}
$('res').style.display='none';
piste();
arme(document);
peindre();
if(S.city&&S.heads>0&&S.dur&&S.valide&&S.headsOk){ouvert=true;
  document.querySelector('.enc').classList.add('plie');
  $('res').style.display='';$('res').classList.add('vu');arme($('res'));peindre();}
dock(); planifieV();

})();

})();
