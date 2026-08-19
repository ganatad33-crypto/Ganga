import ContentPage from '../ContentPage.jsx'
import photo from '../assets/img/aggression.webp'
import html from '../content/aggression.html?raw'

export default function AggressionPage() {
  return <ContentPage photo={photo} photoAlt="כלב עומד בפרופיל עם מתח עדין בגוף — משקל מוסט אחורה, אוזניים לאחור" html={html} />
}
