import ContentPage from '../ContentPage.jsx'
import photo from '../assets/img/world.webp'
import html from '../content/world.html?raw'

export default function WorldPage() {
  return <ContentPage photo={photo} photoAlt="שני כלבים נפגשים בשקט בחוץ, מתקרבים בקשת ולא ישר זה לזה" html={html} />
}
