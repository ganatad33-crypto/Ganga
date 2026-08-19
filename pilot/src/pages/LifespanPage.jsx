import ContentPage from '../ContentPage.jsx'
import photo from '../assets/img/lifespan.webp'
import html from '../content/lifespan.html?raw'

export default function LifespanPage() {
  return <ContentPage photo={photo} photoAlt="כלב מבוגר עם זקן אפור נח על מיטה רכה, יד אדם על כתפו" html={html} />
}
