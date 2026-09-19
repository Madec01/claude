# -*- coding: utf-8 -*-
"""Tutoriel Firebase pour Cent Saisons, en PDF."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, KeepTogether, ListFlowable, ListItem)

INK = colors.HexColor('#2b2a26'); GOLD = colors.HexColor('#e0a33a')
GREEN = colors.HexColor('#2f9e8f'); PAPER = colors.HexColor('#fbf7ee')
LINE = colors.HexColor('#d8d2c4'); MUTED = colors.HexColor('#6b6659')
RED = colors.HexColor('#c0674f')

ss = getSampleStyleSheet()
def S(name, **kw):
    base = kw.pop('parent', ss['Normal'])
    return ParagraphStyle(name, parent=base, **kw)

TITLE   = S('t', fontName='Helvetica-Bold', fontSize=30, leading=35, textColor=INK, alignment=TA_CENTER)
SUB     = S('s', fontName='Helvetica-Oblique', fontSize=13, leading=18, textColor=MUTED, alignment=TA_CENTER)
H1      = S('h1', fontName='Helvetica-Bold', fontSize=17, leading=21, textColor=INK, spaceBefore=16, spaceAfter=7)
H2      = S('h2', fontName='Helvetica-Bold', fontSize=12.5, leading=16, textColor=GREEN, spaceBefore=11, spaceAfter=4)
BODY    = S('b', fontSize=10.3, leading=15.2, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=6)
NOTE    = S('n', fontSize=9.6, leading=14, textColor=MUTED, alignment=TA_JUSTIFY, spaceAfter=5)
BUL     = S('bu', fontSize=10.3, leading=14.6, textColor=INK, spaceAfter=2.5)
CODE    = S('c', fontName='Courier', fontSize=8.6, leading=11.6, textColor=INK, spaceAfter=3)
STEPNO  = S('sn', fontName='Helvetica-Bold', fontSize=20, leading=22, textColor=GOLD, alignment=TA_CENTER)
CELL    = S('cl', fontSize=9.4, leading=13, textColor=INK)
CELLB   = S('clb', fontName='Helvetica-Bold', fontSize=9.4, leading=13, textColor=INK)

def bullets(items, style=BUL):
    return ListFlowable([ListItem(Paragraph(t, style), leftIndent=13, value='circle') for t in items],
                        bulletType='bullet', start='circle', leftIndent=13, bulletFontSize=5,
                        bulletOffsetY=-1.5, spaceAfter=7)

def box(flows, bg=PAPER, border=LINE, pad=9):
    t = Table([[flows]], colWidths=[165*mm])
    t.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), bg), ('BOX', (0,0), (-1,-1), 0.8, border),
                           ('LEFTPADDING',(0,0),(-1,-1),pad), ('RIGHTPADDING',(0,0),(-1,-1),pad),
                           ('TOPPADDING',(0,0),(-1,-1),pad), ('BOTTOMPADDING',(0,0),(-1,-1),pad),
                           ('VALIGN',(0,0),(-1,-1),'TOP')]))
    return t

def step(n, title, flows):
    left = Table([[Paragraph(str(n), STEPNO)]], colWidths=[13*mm], rowHeights=[13*mm])
    left.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1), colors.HexColor('#fdf6e6')),
                              ('BOX',(0,0),(-1,-1),0.8, GOLD), ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
                              ('TOPPADDING',(0,0),(-1,-1),1)]))
    right = [Paragraph(title, H1)] + flows
    t = Table([[left, right]], colWidths=[17*mm, 148*mm])
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'), ('LEFTPADDING',(0,0),(0,0),0),
                           ('TOPPADDING',(0,0),(-1,-1),0), ('BOTTOMPADDING',(0,0),(-1,-1),0),
                           ('LEFTPADDING',(1,0),(1,0),4)]))
    return t

def table(rows, widths, header=True):
    data = [[Paragraph(c, CELLB if (header and i == 0) else CELL) for c in row] for i, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    st = [('VALIGN',(0,0),(-1,-1),'TOP'), ('GRID',(0,0),(-1,-1),0.5, LINE),
          ('LEFTPADDING',(0,0),(-1,-1),6), ('RIGHTPADDING',(0,0),(-1,-1),6),
          ('TOPPADDING',(0,0),(-1,-1),5), ('BOTTOMPADDING',(0,0),(-1,-1),5)]
    if header: st.append(('BACKGROUND',(0,0),(-1,0), colors.HexColor('#f2ede2')))
    t.setStyle(TableStyle(st))
    return t

# ---------------------------------------------------------------- contenu
F = []
F += [Spacer(1, 42*mm),
      Paragraph('Firebase, de zéro', TITLE), Spacer(1, 4*mm),
      Paragraph('Mettre la sauvegarde de Cent Saisons en ligne', SUB), Spacer(1, 16*mm)]
F += [box([Paragraph("Ce document explique ce qu'est Firebase, pourquoi le jeu en a besoin, "
                     "ce que vous avez à faire vous-même (avec les clics, un par un), ce que je ferai "
                     "dans le code, et ce que cela coûte. Aucune connaissance préalable n'est supposée.", BODY)])]
F += [Spacer(1, 10*mm), Paragraph("Cent Saisons · 19 septembre 2026", NOTE)]
F += [PageBreak()]

# 1
F += [Paragraph('1. Le problème, aujourd’hui', H1),
      Paragraph("Aujourd'hui, la partie d'un joueur est enregistrée dans son navigateur, dans un espace "
                "qui s'appelle le stockage local. Concrètement, c'est un petit fichier caché rangé par le "
                "navigateur, sous la clé <font face=\"Courier\" size=\"9\">cent-saisons.save</font>.", BODY),
      Paragraph("Ça marche très bien, c'est instantané, ça fonctionne sans connexion. Mais ce stockage a "
                "trois défauts, et ce sont les trois raisons de ce document.", BODY)]
F += [bullets([
    "<b>Il est attaché à un appareil.</b> Une partie commencée sur le téléphone n'existe pas sur l'ordinateur, et inversement.",
    "<b>Il est fragile.</b> Vider le cache du navigateur, ou passer en navigation privée, efface tout.",
    "<b>Il est attaché à un navigateur.</b> Chrome et Safari sur le même téléphone ne partagent rien.",
])]
F += [Paragraph("Le jeu sait déjà télécharger un fichier de sauvegarde et le recharger, et il rappelle "
                "régulièrement de le faire. C'est une roue de secours efficace, mais qui demande au joueur "
                "d'y penser. Firebase enlève ce souci.", NOTE)]

# 2
F += [Paragraph('2. Ce qu’est Firebase, en une page', H1),
      Paragraph("Firebase est un ensemble de services hébergés par Google. Dit simplement : <b>ce sont des "
                "ordinateurs de Google que votre jeu peut utiliser</b>, sans que vous ayez à louer, installer "
                "ou entretenir quoi que ce soit.", BODY),
      Paragraph("Firebase propose une vingtaine de services. Nous n'en utiliserons que deux.", BODY)]
F += [table([
    ["Le mot", "Ce que ça veut dire", "On s’en sert ?"],
    ["<b>Projet</b>", "La boîte qui contient tout le reste. On en crée un, appelé par exemple « cent-saisons ».", "Oui"],
    ["<b>Authentication</b>", "Le service qui sait qui est le joueur. Il sait faire des comptes avec mot de passe, "
     "mais aussi, et c'est ce qui nous intéresse, des <b>comptes anonymes</b> : le joueur ne s'inscrit pas, ne donne "
     "ni nom ni adresse, et reçoit quand même un identifiant invisible qui lui appartient.", "Oui"],
    ["<b>Firestore</b>", "Une base de données. Imaginez un grand classeur en ligne : chaque joueur y a une fiche, "
     "et la fiche contient sa sauvegarde.", "Oui"],
    ["<b>Hosting</b>", "Un hébergement de site web. Nous gardons GitHub Pages, qui marche déjà.", "Non"],
    ["<b>Storage, Functions, Analytics…</b>", "Fichiers, code serveur, statistiques de fréquentation.", "Non"],
], [30*mm, 105*mm, 25*mm])]
F += [Spacer(1, 4*mm),
      Paragraph("Autrement dit, tout ce que nous ajoutons au jeu tient en une phrase : <b>le joueur reçoit un "
                "identifiant anonyme, et sa sauvegarde est rangée en ligne sous cet identifiant.</b>", BODY)]

# 3
F += [Paragraph('3. Deux façons d’entrer : anonyme, puis Google', H1),
      Paragraph("Cent Saisons est un jeu calme, qu'on ouvre et qu'on joue. Demander une adresse et un mot de "
                "passe avant la première tuile serait un mur. Nous proposerons donc les deux, dans cet ordre.", BODY)]
F += [table([
    ["", "<b>Anonyme</b> (par défaut)", "<b>Google</b> (proposé, jamais imposé)"],
    ["Quand", "Dès la première seconde, sans rien demander.", "Quand le joueur le veut, depuis les Options ou après une île."],
    ["Ce que le joueur donne", "Rien.", "Son adresse Google et son prénom."],
    ["Ce qu’il y gagne", "Sa partie est protégée du vidage du cache, sur cet appareil.", "Sa partie le suit sur tous ses appareils, pour toujours."],
    ["Le risque", "Il perd tout s’il change de téléphone.", "Aucun : c’est le cas confortable."],
], [26*mm, 62*mm, 77*mm])]
F += [Spacer(1, 4*mm),
      Paragraph("Le passage de l'un à l'autre est la partie élégante : Firebase sait <b>rattacher</b> un compte "
                "anonyme existant à un compte Google. Le joueur a joué dix îles sans compte, il appuie sur "
                "« Continuer avec Google », et <b>ses dix îles restent</b> — c'est le même joueur, qui a "
                "simplement donné son nom.", BODY)]
F += [box([Paragraph("<b>Le cas délicat, et il arrivera.</b> Un joueur a une partie anonyme sur son téléphone, "
                     "et son compte Google porte déjà une partie faite sur l'ordinateur. Le rattachement est alors "
                     "impossible : il y a deux parties pour un seul joueur. Le jeu affichera les deux, avec leur "
                     "date, leurs étoiles et leur nombre d'îles, et demandera laquelle garder. C'est la question "
                     "n° 1 de la page « Décisions ».", BODY)], bg=colors.HexColor('#fdf6e6'), border=GOLD)]
F += [Paragraph("Une précision technique qui a des conséquences visibles : sur téléphone, la fenêtre surgissante "
                "de Google est souvent bloquée par le navigateur. J'utiliserai donc la méthode par redirection, "
                "qui quitte brièvement le jeu et y revient. C'est normal et sans danger, mais il faut que le jeu "
                "sache reprendre sa partie au retour : je m'en occupe.", NOTE)]

# 4 coûts
F += [Paragraph('4. Ce que cela coûte', H1),
      Paragraph("Firebase a un palier gratuit, appelé <b>Spark</b>, sans carte bancaire. Voici ses limites "
                "pour les deux services qui nous concernent, et ce que notre jeu consomme réellement.", BODY)]
F += [table([
    ["Ce qui est compté", "Offert par jour", "Ce que consomme une partie", "Marge"],
    ["Écritures dans la base", "20 000", "1 écriture par île terminée, soit 5 à 15 par session", "très large"],
    ["Lectures dans la base", "50 000", "1 lecture au lancement du jeu", "très large"],
    ["Espace de stockage", "1 Go", "environ 4 Ko par joueur", "250 000 joueurs"],
    ["Connexions (anonymes et Google)", "sans limite", "1 par joueur, puis 1 au rattachement", "—"],
], [45*mm, 28*mm, 62*mm, 25*mm])]
F += [Spacer(1, 3*mm),
      Paragraph("En clair : avec quelques centaines de joueurs, vous resterez très loin des limites, et "
                "<b>vous ne paierez rien</b>. Le palier gratuit ne bascule pas en payant tout seul : si une "
                "limite est atteinte, le service s'arrête jusqu'au lendemain plutôt que de vous facturer. "
                "Je prévoirai le cas dans le code : si l'enregistrement en ligne échoue, le jeu continue et "
                "garde la sauvegarde locale.", NOTE)]

F += [PageBreak()]

# 5 étapes
F += [Paragraph('5. Ce que vous avez à faire, pas à pas', H1),
      Paragraph("Comptez vingt minutes. Tout se fait dans un navigateur, sur "
                "<font face=\"Courier\" size=\"9\">console.firebase.google.com</font>, avec un compte Google "
                "ordinaire. Rien à installer.", BODY), Spacer(1, 3*mm)]

F += [step(1, "Créer le projet", [
    Paragraph("Ouvrez <font face=\"Courier\" size=\"9\">console.firebase.google.com</font> et connectez-vous "
              "avec votre compte Google.", BODY),
    bullets([
        "Cliquez sur <b>Créer un projet</b>.",
        "Nom du projet : <b>cent-saisons</b>. Firebase y ajoutera des chiffres pour le rendre unique, c'est normal.",
        "Google Analytics : <b>désactivez-le</b>. Nous n'en avons pas besoin, et cela évite une question de consentement aux cookies.",
        "Cliquez sur <b>Créer le projet</b>, patientez une minute.",
    ]),
]), Spacer(1, 5*mm)]

F += [step(2, "Déclarer le jeu comme application web", [
    Paragraph("Firebase a besoin de savoir que le jeu est un site web, pour lui donner ses clés.", BODY),
    bullets([
        "Sur la page d'accueil du projet, cliquez sur l'icône <b>&lt;/&gt;</b> (« Web »).",
        "Surnom de l'application : <b>Cent Saisons</b>.",
        "Ne cochez pas « Firebase Hosting » : nous gardons GitHub Pages.",
        "Cliquez sur <b>Enregistrer l'application</b>.",
    ]),
    Paragraph("Firebase affiche alors un bloc de code contenant une <b>configuration</b>. C'est ce bloc qu'il "
              "me faut. Il ressemble à ceci :", BODY),
    box([Paragraph('const firebaseConfig = {<br/>'
                   '&nbsp;&nbsp;apiKey: "AIzaSy...",<br/>'
                   '&nbsp;&nbsp;authDomain: "cent-saisons-1234.firebaseapp.com",<br/>'
                   '&nbsp;&nbsp;projectId: "cent-saisons-1234",<br/>'
                   '&nbsp;&nbsp;storageBucket: "cent-saisons-1234.appspot.com",<br/>'
                   '&nbsp;&nbsp;messagingSenderId: "123456789012",<br/>'
                   '&nbsp;&nbsp;appId: "1:123456789012:web:abc123def456"<br/>'
                   '};', CODE)], bg=colors.HexColor('#f7f4ec')),
    Paragraph("Copiez ce bloc et gardez-le : vous me le donnerez à l'étape 7.", BODY),
]), Spacer(1, 5*mm)]

F += [step(3, "Activer les deux méthodes de connexion", [
    bullets([
        "Dans le menu de gauche : <b>Créer</b>, puis <b>Authentication</b>, puis <b>Commencer</b>.",
        "Onglet <b>Sign-in method</b> (méthodes de connexion).",
    ]),
    Paragraph("<b>a. Anonyme.</b> Dans la liste, choisissez <b>Anonyme</b>, basculez sur <b>Activer</b>, "
              "puis <b>Enregistrer</b>.", BODY),
    Paragraph("<b>b. Google.</b> Dans la même liste, choisissez <b>Google</b>, basculez sur <b>Activer</b>. "
              "Firebase demande alors deux choses :", BODY),
    bullets([
        "<b>Nom public du projet</b> : écrivez <b>Cent Saisons</b>. C'est le nom que verra le joueur dans la "
        "fenêtre de Google : « Cent Saisons souhaite accéder à votre compte ». Ne laissez pas le nom technique.",
        "<b>Adresse e-mail d'assistance</b> : choisissez la vôtre dans la liste. Elle sera visible par les joueurs "
        "sur cet écran de Google, c'est une obligation de sa part.",
    ]),
    Paragraph("Puis <b>Enregistrer</b>. Laissez toutes les autres méthodes désactivées.", BODY),
    box([Paragraph("Firebase configure tout seul, en arrière-plan, ce qu'on appelle l'écran de consentement "
                   "OAuth. Vous n'avez rien à faire dans la console Google Cloud tant que le jeu reste en "
                   "<b>mode test</b>, ce qui suffit largement pour des centaines de joueurs. Si un jour le jeu "
                   "grandit beaucoup, il faudra passer cet écran en « production », une formalité de quelques "
                   "minutes que je vous signalerai.", NOTE)], bg=colors.HexColor('#f7f4ec')),
]), Spacer(1, 5*mm)]

F += [step(4, "Créer la base de données", [
    bullets([
        "Menu de gauche : <b>Créer</b>, puis <b>Firestore Database</b>.",
        "Cliquez sur <b>Créer une base de données</b>.",
        "Emplacement : choisissez <b>eur3 (europe-west)</b> ou <b>europe-west1</b>. C'est définitif, et l'Europe est le bon choix pour des joueurs français.",
        "Mode : choisissez <b>Démarrer en mode production</b>. Nous écrirons les bonnes règles à l'étape suivante.",
    ]),
]), Spacer(1, 5*mm)]

F += [step(5, "Écrire les règles de sécurité", [
    Paragraph("C'est l'étape la plus importante du document. Les règles décident qui a le droit de lire et "
              "d'écrire quoi. Sans elles, n'importe qui pourrait lire ou effacer les sauvegardes de tout le monde.", BODY),
    bullets([
        "Dans <b>Firestore Database</b>, ouvrez l'onglet <b>Règles</b>.",
        "Effacez tout le contenu et collez le texte ci-dessous.",
        "Cliquez sur <b>Publier</b>.",
    ]),
    box([Paragraph(
        'rules_version = "2";<br/>'
        'service cloud.firestore {<br/>'
        '&nbsp;&nbsp;match /databases/{database}/documents {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;// chaque joueur ne touche que sa propre fiche, et seulement connecte<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;match /parties/{joueur} {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read, write: if request.auth != null<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&amp;&amp; request.auth.uid == joueur<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&amp;&amp; request.resource.size() &lt; 200000;<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;}<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;// tout le reste est interdit<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;match /{document=**} { allow read, write: if false; }<br/>'
        '&nbsp;&nbsp;}<br/>'
        '}', CODE)], bg=colors.HexColor('#f7f4ec')),
    Paragraph("Ces quatre lignes disent : <b>un joueur connecté peut lire et écrire sa fiche, la sienne "
              "seulement, et elle ne peut pas dépasser 200 Ko.</b> Tout le reste est refusé.", BODY),
]), Spacer(1, 5*mm)]

F += [step(6, "Autoriser le domaine du jeu", [
    Paragraph("Firebase n'accepte les connexions que depuis des adresses que vous avez déclarées.", BODY),
    bullets([
        "<b>Authentication</b>, onglet <b>Settings</b> (paramètres), section <b>Domaines autorisés</b>.",
        "<font face=\"Courier\" size=\"9\">localhost</font> y est déjà : gardez-le, il sert à mes essais.",
        "Ajoutez l'adresse publique du jeu, celle de GitHub Pages, de la forme "
        "<font face=\"Courier\" size=\"9\">votre-nom.github.io</font>.",
    ]),
]), Spacer(1, 5*mm)]

F += [step(7, "Me transmettre la configuration", [
    Paragraph("Envoyez-moi le bloc copié à l'étape 2. Vous pouvez le coller directement dans notre "
              "conversation.", BODY),
    box([Paragraph("<b>Ces clés ne sont pas des mots de passe.</b> Elles sont visibles par tout le monde dans "
                   "n'importe quelle application web utilisant Firebase, y compris les plus grosses : c'est prévu "
                   "ainsi. Ce qui protège vos données, ce sont les <b>règles de l'étape 5</b>, pas le secret des clés. "
                   "Il n'y a donc aucun risque à me les donner, ni à les mettre dans le dépôt du jeu.", BODY)],
        bg=colors.HexColor('#eefaf6'), border=GREEN),
])]

F += [PageBreak()]

# 6 ce que je fais
F += [Paragraph('6. Ce que je ferai, moi, dans le code', H1),
      Paragraph("Dès que j'aurai la configuration, voici le travail, dans l'ordre. Rien de tout cela ne vous "
                "demande d'intervenir.", BODY)]
F += [table([
    ["Étape", "Ce que ça change pour le joueur"],
    ["<b>Brancher Firebase</b> — un fichier <font face=\"Courier\" size=\"9\">src/core/cloud.js</font>, chargé "
     "seulement quand il y a du réseau.", "Rien de visible."],
    ["<b>Connexion anonyme au lancement</b>, en silence.", "Rien de visible."],
    ["<b>Envoyer la sauvegarde</b> à la fin de chaque île, et au retour au menu.", "Une petite icône de nuage "
     "confirme que la partie est en lieu sûr."],
    ["<b>Relire la sauvegarde</b> au lancement, et garder la plus récente entre celle de l'appareil et celle "
     "en ligne.", "Le joueur retrouve sa partie."],
    ["<b>Gérer le conflit</b> : si les deux sauvegardes diffèrent nettement, le jeu demande laquelle garder, "
     "avec la date et le nombre d'étoiles de chacune.", "Un écran, rarement."],
    ["<b>Le bouton « Continuer avec Google »</b> dans les Options, et une proposition discrète après quelques "
     "îles. Rattachement du compte anonyme, par redirection sur téléphone.", "Un bouton, et sa partie le suit partout."],
    ["<b>L’écran des deux parties</b> : quand le compte Google porte déjà une sauvegarde, les deux sont "
     "affichées avec leur date, leurs étoiles et leurs îles, et le joueur choisit.", "Un écran, rarement."],
    ["<b>Se déconnecter</b>, et <b>effacer mes données en ligne</b> : deux boutons dans les Options, pour que "
     "le joueur garde la main.", "Deux boutons dans les Options."],
    ["<b>Tout rendre facultatif</b> : sans réseau, ou si Firebase répond mal, le jeu fonctionne exactement "
     "comme aujourd'hui.", "Aucune panne visible."],
    ["<b>Tests</b> : un simulateur Firebase local dans la suite de tests, pour vérifier sans toucher à la vraie base.",
     "Rien de visible."],
], [88*mm, 77*mm])]
F += [Spacer(1, 3*mm),
      Paragraph("Le fichier de sauvegarde à télécharger reste en place. Il ne coûte rien à garder, et il "
                "restera la meilleure roue de secours.", NOTE)]

# 7 décisions
F += [Paragraph('7. Trois décisions à prendre', H1),
      Paragraph("Vous avez déjà tranché la première question du document précédent : ce sera <b>anonyme par "
                "défaut, Google en option</b>. Restent ces trois points, que je ne peux pas décider à votre place.", BODY)]
F += [box([
    Paragraph("<b>Question 1 — Que fait-on quand il y a deux parties pour un joueur ?</b>", H2),
    Paragraph("Le cas : partie anonyme sur le téléphone, et partie déjà en ligne sur le compte Google.", NOTE),
    bullets([
        "<b>Demander au joueur</b> (ma recommandation) : un écran montre les deux, avec la date, les étoiles et le nombre d'îles.",
        "<b>Garder la plus avancée</b> automatiquement, sans rien demander. Plus simple, mais un joueur peut perdre une partie qu'il voulait.",
    ]),
    Paragraph("<b>Question 2 — Quand propose-t-on la connexion Google ?</b>", H2),
    bullets([
        "<b>Discrètement, après la troisième île</b> (ma recommandation) : un bandeau qui se referme, plus le bouton toujours présent dans les Options.",
        "<b>Seulement dans les Options</b> : le joueur doit y penser. Plus sobre, beaucoup moins utilisé.",
        "<b>Dès le menu d’accueil</b> : efficace, mais c’est le mur qu’on voulait éviter.",
    ]),
    Paragraph("<b>Question 3 — Voulez-vous un classement en ligne ?</b>", H2),
    bullets([
        "<b>Non pour l'instant</b> (ma recommandation) : l'Île du jour a déjà son meilleur score local, et un classement change le ton du jeu.",
        "<b>Oui</b> : c'est faisable — avec Google, on a même déjà un prénom — mais il faudra une modération et une protection contre la triche. Comptez un lot entier.",
    ]),
])]

# 8 pièges
F += [Paragraph('8. Ce à quoi il faut faire attention', H1)]
F += [bullets([
    "<b>L'emplacement de la base est définitif.</b> Choisissez l'Europe à l'étape 4 : on ne peut pas le changer ensuite sans tout recréer.",
    "<b>Ne laissez jamais les règles en mode test.</b> Firebase propose un mode où tout est ouvert pendant trente jours. Les règles de l'étape 5 évitent ce piège.",
    "<b>Ne collez pas votre configuration dans un ticket public</b> par habitude : ce n'est pas dangereux, mais autant rester discret.",
    "<b>Le jeu doit continuer de marcher hors ligne.</b> C'est une règle que je m'impose : Firebase est un confort, jamais une dépendance.",
    "<b>Vie privée : la connexion Google change la donne.</b> Une adresse e-mail est une donnée personnelle. Il faudra donc une courte page « Vie privée » dans le jeu, disant quoi est collecté (adresse, prénom, sauvegarde), pourquoi (retrouver sa partie), où (Google, en Europe), et comment tout effacer. Je l'écrirai et j'ajouterai le bouton « Effacer mes données en ligne ». Rien de lourd : quinze lignes et un bouton.",
    "<b>Le nom public du projet est visible par les joueurs</b> dans la fenêtre de Google. Vérifiez qu'il dit bien « Cent Saisons » et non « cent-saisons-1234 ».",
])]

# 9 résumé
F += [Spacer(1, 2*mm), KeepTogether([Paragraph('9. En résumé', H1), box([
    Paragraph("<b>Vous :</b> vingt minutes dans la console Firebase, sept étapes, puis vous m'envoyez le bloc "
              "de configuration et vos réponses aux trois questions.", BODY),
    Paragraph("<b>Moi :</b> je branche le tout, je teste, et j'écris la page « Vie privée ». Le joueur commence "
              "sans rien donner, et le jour où il appuie sur « Continuer avec Google », sa partie le suit partout, "
              "sans perdre une seule île.", BODY),
    Paragraph("<b>Le coût :</b> zéro, très largement, et sans carte bancaire.", BODY),
], bg=colors.HexColor('#eefaf6'), border=GREEN)])]

# ---------------------------------------------------------------- doc
def deco(canv, doc):
    canv.saveState()
    if doc.page == 1:
        canv.setFillColor(PAPER); canv.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
        canv.setStrokeColor(GOLD); canv.setLineWidth(1.2)
        canv.line(80*mm, A4[1]-92*mm, 130*mm, A4[1]-92*mm)
    else:
        canv.setFillColor(MUTED); canv.setFont('Helvetica', 8)
        canv.drawString(22*mm, 12*mm, 'Cent Saisons · Firebase, de zéro')
        canv.drawRightString(A4[0]-22*mm, 12*mm, str(doc.page))
        canv.setStrokeColor(LINE); canv.setLineWidth(0.5)
        canv.line(22*mm, 16*mm, A4[0]-22*mm, 16*mm)
    canv.restoreState()

doc = BaseDocTemplate('/home/user/claude/docs/FIREBASE_TUTO.pdf', pagesize=A4,
                      leftMargin=22*mm, rightMargin=22*mm, topMargin=20*mm, bottomMargin=20*mm,
                      title='Firebase, de zéro — Cent Saisons', author='Cent Saisons')
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='n')
doc.addPageTemplates([PageTemplate(id='all', frames=[frame], onPage=deco)])
doc.build(F)
print('PDF écrit')
