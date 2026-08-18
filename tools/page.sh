# תבנית עמוד. שימוש:  . tools/page.sh   ואז  head_for "כותרת" "תיאור" "file.html" "artKey"
head_for () {
cat <<HEAD
<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$1</title>
<meta name="description" content="$2">
<link rel="canonical" href="https://ganatad33-crypto.github.io/Ganga/$3">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#FBF7EF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#171410" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="article">
<meta property="og:site_name" content="כלבלב">
<meta property="og:locale" content="he_IL">
<meta property="og:title" content="$1">
<meta property="og:description" content="$2">
<meta property="og:url" content="https://ganatad33-crypto.github.io/Ganga/$3">
<meta property="og:image" content="https://ganatad33-crypto.github.io/Ganga/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="כלבלב — להבין את הכלב שלך, צעד אחר צעד">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<a class="skip" href="#main">דילוג לתוכן</a>

<header class="topbar" data-nav></header>
<div class="profilebar" data-profile-bar></div>

<main class="wrap" id="main">

<nav data-crumbs></nav>

<div class="spot" data-art="$4"></div>
HEAD
}
foot () {
cat <<'FOOT'

<p class="sitefoot">כל התוכן באתר הוא מידע כללי בגדר המלצה בלבד. הוא אינו מהווה ייעוץ וטרינרי, אבחון רפואי או תוכנית אילוף פרטנית, ואינו מחליף בדיקה של וטרינר מורשה או ליווי של מאלף מוסמך שרואה את הכלב. במצב חירום רפואי — פנו מיד לווטרינר או לחדר מיון וטרינרי.</p>

<div data-pager></div>

</main>

<script src="assets/nav.js" defer></script>
<script src="assets/art.js" defer></script>
<script src="assets/profile.js" defer></script>
</body>
</html>
FOOT
}
