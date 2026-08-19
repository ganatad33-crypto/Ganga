import ContentPage from '../ContentPage.jsx'
import photo from '../assets/img/barking.webp'
import html from '../content/barking.html?raw'

export default function BarkingPage() {
  return <ContentPage photo={photo} photoAlt="כלב עומד עם כפות קדמיות על אדן החלון ומביט החוצה" html={html} />
}
