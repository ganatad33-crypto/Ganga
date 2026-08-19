import ContentPage from '../ContentPage.jsx'
import photo from '../assets/img/signals.webp'
import html from '../content/signals.html?raw'

export default function SignalsPage() {
  return <ContentPage photo={photo} photoAlt="תקריב של כלב עם מבט קצת מהוסס, אוזניים רגועות ופה פתוח קלות" html={html} />
}
